import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from './common'

type Kind = 'io' | 'cpu'
type Task = { name: string; kind: Kind; dur: number }
type SegKind = 'cpu' | 'io' | 'wait' | 'block' | 'spawn'
type Seg = { start: number; end: number; kind: SegKind }
type Mode = 'sequential' | 'threads' | 'asyncio' | 'asyncio_blocking' | 'processes'

const MODES: { id: Mode; label: string; code: string }[] = [
  { id: 'sequential', label: 'Sequential', code: 'for t in tasks:\n    run(t)' },
  { id: 'threads', label: 'Threads', code: 'with ThreadPoolExecutor() as ex:\n    list(ex.map(run, tasks))' },
  { id: 'asyncio', label: 'asyncio', code: 'await asyncio.gather(*(run(t) for t in tasks))\n# I/O uses: await asyncio.sleep / aiohttp' },
  { id: 'asyncio_blocking', label: 'asyncio + blocking bug', code: 'await asyncio.gather(*(run(t) for t in tasks))\n# ⚠ I/O uses: time.sleep / requests.get' },
  { id: 'processes', label: 'Processes', code: 'with ProcessPoolExecutor(max_workers=cores) as ex:\n    list(ex.map(run, tasks))' },
]

const DEFAULT: Task[] = [
  { name: 'download A', kind: 'io', dur: 2 },
  { name: 'resize image', kind: 'cpu', dur: 1 },
  { name: 'download B', kind: 'io', dur: 1.5 },
  { name: 'hash file', kind: 'cpu', dur: 1 },
]

const DT = 0.05
const toTicks = (s: number) => Math.max(1, Math.round(s / DT))

function compress(states: (SegKind | null)[]): Seg[] {
  const out: Seg[] = []
  states.forEach((s, i) => {
    if (!s) return
    const last = out[out.length - 1]
    if (last && last.kind === s && Math.abs(last.end - i * DT) < 1e-9) last.end = (i + 1) * DT
    else out.push({ start: i * DT, end: (i + 1) * DT, kind: s })
  })
  return out
}

export function schedule(tasks: Task[], mode: Mode, cores: number): Seg[][] {
  const n = tasks.length
  if (mode === 'sequential') {
    let t = 0
    return tasks.map((task) => {
      const segs: Seg[] = []
      if (t > 0) segs.push({ start: 0, end: t, kind: 'wait' })
      segs.push({ start: t, end: t + task.dur, kind: task.kind })
      t += task.dur
      return segs
    })
  }
  if (mode === 'threads') {
    const rem = tasks.map((t) => toTicks(t.dur))
    const states: (SegKind | null)[][] = tasks.map(() => [])
    let current = -1
    let slice = 0
    for (let tick = 0; tick < 4000 && rem.some((r) => r > 0); tick++) {
      const ready = tasks.map((t, i) => (t.kind === 'cpu' && rem[i] > 0 ? i : -1)).filter((i) => i >= 0)
      if (ready.length && (current < 0 || rem[current] <= 0 || slice <= 0)) {
        current = ready.find((i) => i > current) ?? ready[0]
        slice = 2 // 0.1 s switch interval (scaled for visibility)
      }
      for (let i = 0; i < n; i++) {
        if (rem[i] <= 0) {
          states[i].push(null)
          continue
        }
        if (tasks[i].kind === 'io') {
          states[i].push('io') // blocking I/O releases the GIL
          rem[i]--
        } else if (i === current) {
          states[i].push('cpu')
          rem[i]--
        } else states[i].push('wait') // waiting for the GIL
      }
      slice--
    }
    return states.map(compress)
  }
  if (mode === 'asyncio' || mode === 'asyncio_blocking') {
    let t = 0
    const blocks: [number, number][] = []
    const segs: Seg[][] = tasks.map(() => [])
    const pending: { i: number; start: number; deadline: number }[] = []
    tasks.forEach((task, i) => {
      if (t > 0) segs[i].push({ start: 0, end: t, kind: 'wait' })
      const blocking = task.kind === 'cpu' || mode === 'asyncio_blocking'
      if (blocking) {
        segs[i].push({ start: t, end: t + task.dur, kind: task.kind === 'cpu' ? 'cpu' : 'block' })
        blocks.push([t, t + task.dur])
        t += task.dur
      } else pending.push({ i, start: t, deadline: t + task.dur })
    })
    for (const p of pending) {
      let end = p.deadline
      for (const [a, b] of blocks) if (end > a && end < b) end = b
      segs[p.i].push({ start: p.start, end: p.deadline, kind: 'io' })
      if (end > p.deadline) segs[p.i].push({ start: p.deadline, end, kind: 'wait' })
    }
    return segs
  }
  // processes
  const free = Array.from({ length: cores }, () => 0)
  const used = Array.from({ length: cores }, () => false)
  return tasks.map((task) => {
    let c = 0
    for (let k = 1; k < cores; k++) if (free[k] < free[c]) c = k
    const segs: Seg[] = []
    let t = free[c]
    if (t > 0) segs.push({ start: 0, end: t, kind: 'wait' })
    if (!used[c]) {
      segs.push({ start: t, end: t + 0.3, kind: 'spawn' })
      t += 0.3
      used[c] = true
    }
    segs.push({ start: t, end: t + task.dur, kind: task.kind })
    free[c] = t + task.dur
    return segs
  })
}

const totalOf = (segs: Seg[][]) => Math.max(0, ...segs.flat().map((s) => s.end))

export function ConcurrencyPlaygroundLab() {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT)
  const [mode, setMode] = useState<Mode>('threads')
  const [cores, setCores] = useState(4)

  const all = useMemo(
    () => Object.fromEntries(MODES.map((m) => [m.id, schedule(tasks, m.id, cores)])) as Record<Mode, Seg[][]>,
    [tasks, cores],
  )
  const segs = all[mode]
  const total = totalOf(segs)
  const seq = totalOf(all.sequential)
  const maxAll = Math.max(...MODES.map((m) => totalOf(all[m.id])))
  const ticks = Array.from({ length: 5 }, (_, i) => ((total * i) / 4).toFixed(1))
  const cpuShare = tasks.filter((t) => t.kind === 'cpu').reduce((a, t) => a + t.dur, 0) / Math.max(0.01, tasks.reduce((a, t) => a + t.dur, 0))
  const best = MODES.filter((m) => m.id !== 'asyncio_blocking').reduce((a, b) => (totalOf(all[a.id]) <= totalOf(all[b.id]) ? a : b))

  const update = (i: number, patch: Partial<Task>) => setTasks((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  return (
    <div className="pg">
      <PgHeader kicker="Python playground" title="Concurrency Playground" python>
        Build a mix of I/O-bound and CPU-bound tasks and run it five ways. The timeline shows when each task actually
        runs Python code, waits on I/O, waits for the GIL or the event loop, or blocks everything.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Tasks</h2>
          {tasks.map((t, i) => (
            <div key={i} className="pg-field" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.6rem' }}>
              <div className="pg-row">
                <input className="pg-input" style={{ flex: 1, minWidth: 0 }} type="text" value={t.name} aria-label={`Task ${i + 1} name`} onChange={(e) => update(i, { name: e.target.value })} />
                <button type="button" className={t.kind === 'io' ? 'pg-chip on' : 'pg-chip'} onClick={() => update(i, { kind: 'io' })}>
                  I/O
                </button>
                <button type="button" className={t.kind === 'cpu' ? 'pg-chip on' : 'pg-chip'} onClick={() => update(i, { kind: 'cpu' })}>
                  CPU
                </button>
                <button type="button" className="pg-chip" aria-label={`Remove ${t.name}`} onClick={() => setTasks((ts) => ts.filter((_, j) => j !== i))} disabled={tasks.length <= 1}>
                  ✕
                </button>
              </div>
              <Range label="Duration" value={t.dur} min={0.5} max={4} step={0.5} onChange={(v) => update(i, { dur: v })} fmt={(v) => `${v.toFixed(1)} s`} />
            </div>
          ))}
          <div className="pg-row">
            <button
              type="button"
              className="pg-btn soft"
              disabled={tasks.length >= 6}
              onClick={() => setTasks((ts) => [...ts, { name: `task ${ts.length + 1}`, kind: ts.length % 2 ? 'cpu' : 'io', dur: 1 }])}
            >
              + Add task
            </button>
            <button type="button" className="pg-chip" onClick={() => setTasks(DEFAULT.map((t) => ({ ...t, kind: 'io' })))}>
              All I/O
            </button>
            <button type="button" className="pg-chip" onClick={() => setTasks(DEFAULT.map((t) => ({ ...t, kind: 'cpu' })))}>
              All CPU
            </button>
            <button type="button" className="pg-chip" onClick={() => setTasks(DEFAULT)}>
              Mixed
            </button>
          </div>
          {mode === 'processes' ? <Range label="CPU cores" value={cores} min={1} max={8} onChange={setCores} /> : null}
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <div className="pg-row" style={{ marginBottom: '0.7rem' }}>
              {MODES.map((m) => (
                <button key={m.id} type="button" className={m.id === mode ? 'pg-chip on' : 'pg-chip'} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
            <pre className="pg-mono" style={{ marginBottom: '0.8rem' }}>
              {MODES.find((m) => m.id === mode)!.code}
            </pre>
            <div className="pg-gantt">
              {tasks.map((t, i) => (
                <div key={i} className="pg-gantt-row">
                  <span title={t.name}>
                    {t.kind === 'io' ? '🌐' : '⚙️'} {t.name}
                  </span>
                  <div className="pg-gantt-lane">
                    {(segs[i] || []).map((s, j) => (
                      <div
                        key={j}
                        className={`pg-seg ${s.kind}`}
                        style={{ left: `${(s.start / total) * 100}%`, width: `${((s.end - s.start) / total) * 100}%` }}
                        title={`${s.kind}: ${s.start.toFixed(2)}–${s.end.toFixed(2)} s`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="pg-axis">
                <span />
                <div>
                  {ticks.map((x, i) => (
                    <span key={i}>{x}s</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="pg-legend">
              <span><i style={{ background: '#1d4ed8' }} /> running Python (CPU)</span>
              <span><i style={{ background: '#38bdf8' }} /> waiting on I/O (no CPU)</span>
              <span><i style={{ background: '#cbd5e1' }} /> ready but waiting (GIL / loop / queue)</span>
              <span><i style={{ background: '#dc2626' }} /> blocking call freezes the loop</span>
              <span><i style={{ background: '#94a3b8' }} /> process start-up</span>
            </div>
          </div>

          <div className="pg-stats">
            <Stat label="Total time" value={`${total.toFixed(2)} s`} />
            <Stat label="Speed-up vs sequential" value={`${(seq / total).toFixed(2)}×`} tone={seq / total > 1.3 ? 'ok' : seq / total < 1.05 ? 'warn' : undefined} />
            <Stat label="CPU-bound share" value={`${Math.round(cpuShare * 100)}%`} />
            <Stat label="Best for this mix" value={best.label} tone="ok" />
          </div>

          <div className="pg-card">
            <h3>Same tasks, every model</h3>
            <div className="pg-bars">
              {MODES.map((m) => (
                <div key={m.id} className={m.id === mode ? 'pg-bar top' : 'pg-bar'}>
                  <span>{m.label}</span>
                  <div className="pg-bar-track">
                    <i style={{ width: `${(totalOf(all[m.id]) / maxAll) * 100}%` }} />
                  </div>
                  <span>{totalOf(all[m.id]).toFixed(1)}s</span>
                </div>
              ))}
            </div>
            <ul className="pg-insights" style={{ marginTop: '0.7rem' }}>
              <li>Threads overlap I/O waits, but CPU tasks take turns on the GIL (grey = waiting for it).</li>
              <li>asyncio overlaps I/O on one thread; a CPU task or a blocking call (red) stops every other task until it finishes.</li>
              <li>Processes run CPU work truly in parallel, at the cost of start-up time and data serialization.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
