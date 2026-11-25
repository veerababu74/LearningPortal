import { useMemo, useState } from 'react'
import { Check, PgHeader, Range, Stat } from './common'

type Topo = 'single' | 'sequential' | 'parallel' | 'supervisor'
type Seg = { start: number; end: number; kind: 'llm' | 'router' | 'wait'; label: string }
type Row = { name: string; segs: Seg[] }

const TOPOS: { id: Topo; label: string; blurb: string }[] = [
  { id: 'single', label: 'Single agent', blurb: 'One agent with all tools does every subtask in its own loop. Simple, but its context keeps growing.' },
  { id: 'sequential', label: 'Sequential pipeline', blurb: 'Specialists run one after another, each passing its output to the next. Predictable, but latencies add up.' },
  { id: 'parallel', label: 'Parallel + synthesizer', blurb: 'Independent specialists run at the same time; a synthesizer merges results. Latency is the slowest branch.' },
  { id: 'supervisor', label: 'Supervisor', blurb: 'A router LLM picks each next specialist and decides when to finish. Flexible, but adds a router call per hop.' },
]

const NAMES = ['Research', 'SQL analyst', 'Coder', 'Reviewer', 'Writer', 'Designer']
const PRICE_PER_M = 3

export function plan(topo: Topo, n: number, lat: number, tok: number, router: number, straggler: boolean) {
  const L = NAMES.slice(0, n).map((_, i) => (straggler && i === n - 1 ? lat * 3 : lat))
  const rows: Row[] = []
  let calls = 0
  let tokens = 0
  let total = 0

  if (topo === 'single') {
    let t = 0
    const segs: Seg[] = []
    L.forEach((l, i) => {
      const d = l * 0.9 + i * 0.25 // growing context is slower to process
      segs.push({ start: t, end: t + d, kind: 'llm', label: NAMES[i] })
      t += d
      calls++
      tokens += 800 + i * tok * 0.7 + tok * 0.5
    })
    rows.push({ name: 'One agent', segs })
    total = t
  } else if (topo === 'sequential') {
    let t = 0
    L.forEach((l, i) => {
      rows.push({ name: NAMES[i], segs: [...(t > 0 ? [{ start: 0, end: t, kind: 'wait' as const, label: 'waiting' }] : []), { start: t, end: t + l, kind: 'llm', label: 'work' }] })
      t += l
      calls++
      tokens += tok + i * 300
    })
    total = t
  } else if (topo === 'parallel') {
    const maxL = Math.max(...L)
    L.forEach((l, i) => {
      rows.push({ name: NAMES[i], segs: [{ start: 0, end: l, kind: 'llm', label: 'work' }] })
      calls++
      tokens += tok
    })
    const synth = lat * 0.7
    rows.push({ name: 'Synthesizer', segs: [{ start: 0, end: maxL, kind: 'wait', label: 'waiting for all' }, { start: maxL, end: maxL + synth, kind: 'router', label: 'merge' }] })
    calls++
    tokens += 600 + n * 400
    total = maxL + synth
  } else {
    let t = 0
    const sup: Seg[] = []
    const specRows: Row[] = NAMES.slice(0, n).map((name) => ({ name, segs: [] }))
    L.forEach((l, i) => {
      sup.push({ start: t, end: t + router, kind: 'router', label: 'route' })
      t += router
      calls++
      tokens += 700 + i * 350
      specRows[i].segs.push({ start: t, end: t + l, kind: 'llm', label: 'work' })
      t += l
      calls++
      tokens += tok
    })
    sup.push({ start: t, end: t + router, kind: 'router', label: 'FINISH' })
    t += router
    calls++
    tokens += 700 + n * 350
    rows.push({ name: 'Supervisor', segs: sup }, ...specRows)
    total = t
  }
  return { rows, calls, tokens: Math.round(tokens), total, cost: (tokens / 1_000_000) * PRICE_PER_M }
}

export function MultiAgentPlannerLab() {
  const [topo, setTopo] = useState<Topo>('parallel')
  const [n, setN] = useState(3)
  const [lat, setLat] = useState(2.5)
  const [tok, setTok] = useState(3000)
  const [router, setRouter] = useState(0.8)
  const [straggler, setStraggler] = useState(false)

  const all = useMemo(
    () => Object.fromEntries(TOPOS.map((t) => [t.id, plan(t.id, n, lat, tok, router, straggler)])) as Record<Topo, ReturnType<typeof plan>>,
    [n, lat, tok, router, straggler],
  )
  const cur = all[topo]
  const maxT = Math.max(...Object.values(all).map((x) => x.total))
  const fastest = TOPOS.reduce((a, b) => (all[a.id].total <= all[b.id].total ? a : b))
  const cheapest = TOPOS.reduce((a, b) => (all[a.id].cost <= all[b.id].cost ? a : b))
  const ticks = Array.from({ length: 5 }, (_, i) => ((cur.total * i) / 4).toFixed(1))

  return (
    <div className="pg">
      <PgHeader kicker="AI agent playground" title="Multi-Agent Topology Planner">
        Choose how specialists are orchestrated and see the timeline, number of LLM calls, tokens and cost. Then flip
        between topologies with the same settings to compare them.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Topology</h2>
          <div className="pg-row" style={{ marginBottom: '0.5rem' }}>
            {TOPOS.map((t) => (
              <button key={t.id} type="button" className={t.id === topo ? 'pg-chip on' : 'pg-chip'} onClick={() => setTopo(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="pg-note">{TOPOS.find((t) => t.id === topo)!.blurb}</p>
          <div style={{ marginTop: '0.8rem' }}>
            <Range label="Specialist subtasks" value={n} min={2} max={6} onChange={setN} />
            <Range label="Latency per specialist" value={lat} min={0.5} max={6} step={0.5} onChange={setLat} fmt={(v) => `${v.toFixed(1)} s`} />
            <Range label="Tokens per specialist call" value={tok} min={500} max={10000} step={500} onChange={setTok} fmt={(v) => v.toLocaleString()} />
            <Range label="Router call latency" value={router} min={0.2} max={3} step={0.1} onChange={setRouter} fmt={(v) => `${v.toFixed(1)} s`} />
            <Check label="One specialist is a straggler (3× slower)" hint="slow API, long document, retries" checked={straggler} onChange={setStraggler} />
          </div>
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>Timeline</h2>
            <div className="pg-gantt">
              {cur.rows.map((r) => (
                <div key={r.name} className="pg-gantt-row">
                  <span title={r.name}>{r.name}</span>
                  <div className="pg-gantt-lane">
                    {r.segs.map((s, i) => (
                      <div
                        key={i}
                        className={`pg-seg ${s.kind}`}
                        style={{ left: `${(s.start / cur.total) * 100}%`, width: `${((s.end - s.start) / cur.total) * 100}%` }}
                        title={`${s.label}: ${s.start.toFixed(1)}–${s.end.toFixed(1)} s`}
                      >
                        {s.end - s.start > cur.total * 0.08 ? s.label : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pg-axis">
                <span />
                <div>
                  {ticks.map((t) => (
                    <span key={t}>{t}s</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="pg-legend">
              <span>
                <i style={{ background: '#7c3aed' }} /> specialist LLM work
              </span>
              <span>
                <i style={{ background: '#db2777' }} /> router / synthesizer
              </span>
              <span>
                <i style={{ background: '#cbd5e1' }} /> idle, waiting
              </span>
            </div>
          </div>

          <div className="pg-stats">
            <Stat label="End-to-end latency" value={`${cur.total.toFixed(1)} s`} tone={topo === fastest.id ? 'ok' : undefined} />
            <Stat label="LLM calls" value={cur.calls} />
            <Stat label="Tokens" value={cur.tokens.toLocaleString()} />
            <Stat label="Cost / request" value={`$${cur.cost.toFixed(4)}`} tone={topo === cheapest.id ? 'ok' : undefined} />
          </div>

          <div className="pg-card">
            <h3>All topologies with these settings</h3>
            <div className="pg-bars">
              {TOPOS.map((t) => (
                <div key={t.id} className={t.id === topo ? 'pg-bar top' : 'pg-bar'}>
                  <span>{t.label}</span>
                  <div className="pg-bar-track">
                    <i style={{ width: `${(all[t.id].total / maxT) * 100}%` }} />
                  </div>
                  <span>{all[t.id].total.toFixed(1)}s</span>
                </div>
              ))}
            </div>
            <ul className="pg-insights" style={{ marginTop: '0.7rem' }}>
              <li>
                Fastest here: <strong>{fastest.label}</strong>; cheapest: <strong>{cheapest.label}</strong>.
              </li>
              <li>The supervisor pays {n + 1} extra router calls ({(router * (n + 1)).toFixed(1)} s) for the flexibility of choosing steps at run time.</li>
              {straggler ? <li>With a straggler, parallel latency equals the slowest branch — add per-branch timeouts and return partial results.</li> : null}
              <li>Parallel only works when subtasks are independent; if one needs another’s output, it must be sequential.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
