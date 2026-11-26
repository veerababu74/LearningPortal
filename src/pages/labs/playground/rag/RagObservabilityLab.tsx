import { useMemo, useState } from 'react'
import { Check, PgHeader, Range, Stat } from '../common'

type Incident = 'vectorSlow' | 'rateLimit' | 'cacheOff' | 'embedDrift' | 'promptRegression'
const INCIDENTS: { id: Incident; label: string; hint: string }[] = [
  { id: 'vectorSlow', label: 'Vector DB slow', hint: 'new collection without its payload index' },
  { id: 'rateLimit', label: 'LLM rate limits (429)', hint: 'provider quota hit, retries pile up' },
  { id: 'cacheOff', label: 'Semantic cache disabled', hint: 'config flag flipped in a deploy' },
  { id: 'embedDrift', label: 'Embedding model mismatch', hint: 'index re-built with a different model' },
  { id: 'promptRegression', label: 'Prompt regression', hint: 'new prompt drops the “cite sources” rule' },
]

type Monitor = 'latency' | 'errors' | 'cost' | 'empty' | 'quality'
const MONITORS: { id: Monitor; label: string; rule: string; kind: 'ops' | 'quality' }[] = [
  { id: 'latency', label: 'p95 latency', rule: 'p95 > 3 s for 5 min', kind: 'ops' },
  { id: 'errors', label: 'Error rate', rule: 'errors > 2% for 5 min', kind: 'ops' },
  { id: 'cost', label: 'Cost', rule: 'cost > $0.40 / min for 10 min', kind: 'ops' },
  { id: 'empty', label: 'Empty retrievals', rule: 'empty-retrieval rate > 10% for 10 min', kind: 'quality' },
  { id: 'quality', label: 'Faithfulness (sampled)', rule: 'sampled faithfulness < 0.85 for 15 min', kind: 'quality' },
]

const MIN = 60

/** Deterministic noise so charts are stable between renders. */
function noise(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x) - 0.5
}

function simulate(active: Set<Incident>, start: number) {
  const rows = []
  for (let t = 0; t < MIN; t++) {
    const on = (id: Incident) => active.has(id) && t >= start
    const rpm = 120 + noise(t, 1) * 20
    let retrieve = 0.15 + noise(t, 2) * 0.03
    let llm = 1.6 + noise(t, 3) * 0.2
    let errors = 0.005 + Math.abs(noise(t, 4)) * 0.004
    let cache = 0.35 + noise(t, 5) * 0.04
    let empty = 0.04 + noise(t, 6) * 0.01
    let faith = 0.92 + noise(t, 7) * 0.02
    if (on('vectorSlow')) retrieve += 4 + noise(t, 8) * 0.6
    if (on('rateLimit')) {
      errors += 0.07
      llm += 1.5
    }
    if (on('cacheOff')) cache = 0
    if (on('embedDrift')) {
      empty = 0.24 + noise(t, 9) * 0.03
      faith = 0.71 + noise(t, 10) * 0.03
    }
    if (on('promptRegression')) faith = Math.min(faith, 0.78 + noise(t, 11) * 0.02)
    const p50 = (retrieve + llm + 0.45) * (1 - cache * 0.7)
    const p95 = p50 * 1.4 + 0.2
    const cost = rpm * (1 - cache) * 0.004
    rows.push({ t, rpm, retrieve, llm, p50, p95, errors, cache, empty, faith, cost })
  }
  return rows
}

type Row = ReturnType<typeof simulate>[number]

function firstFire(rows: Row[], m: Monitor) {
  const breach: Record<Monitor, (r: Row) => boolean> = {
    latency: (r) => r.p95 > 3,
    errors: (r) => r.errors > 0.02,
    cost: (r) => r.cost > 0.4,
    empty: (r) => r.empty > 0.1,
    quality: (r) => r.faith < 0.85,
  }
  const need: Record<Monitor, number> = { latency: 5, errors: 5, cost: 10, empty: 10, quality: 15 }
  let run = 0
  for (const r of rows) {
    run = breach[m](r) ? run + 1 : 0
    if (run >= need[m]) return r.t
  }
  return null
}

function Chart({ rows, pick, threshold, label, fmt, start, color = '#7c3aed', max }: { rows: Row[]; pick: (r: Row) => number; threshold: number; label: string; fmt: (v: number) => string; start: number | null; color?: string; max?: number }) {
  const vals = rows.map(pick)
  const top = max ?? Math.max(threshold * 1.4, ...vals) * 1.05
  const W = 300
  const H = 90
  const x = (i: number) => (i / (MIN - 1)) * W
  const y = (v: number) => H - (Math.min(v, top) / top) * H
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const now = vals[vals.length - 1]
  const breached = vals.some((v) => (label.includes('Faithfulness') ? v < threshold : v > threshold))
  return (
    <div className="pg-card" style={{ padding: '0.7rem 0.8rem' }}>
      <div className="pg-row" style={{ justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.88rem' }}>{label}</strong>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: breached ? 'var(--danger)' : 'var(--growth-deep)' }}>{fmt(now)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', marginTop: 4 }} role="img" aria-label={`${label} over 60 minutes`}>
        {start !== null ? <rect x={x(start)} y={0} width={W - x(start)} height={H} fill="rgba(220,38,38,0.06)" /> : null}
        <line x1={0} x2={W} y1={y(threshold)} y2={y(threshold)} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.2} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
      </svg>
      <div className="pg-row" style={{ justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
        <span>0 min</span>
        <span>threshold {fmt(threshold)}</span>
        <span>60 min</span>
      </div>
    </div>
  )
}

export function RagObservabilityLab() {
  const [active, setActive] = useState<Set<Incident>>(new Set(['embedDrift']))
  const [start, setStart] = useState(20)
  const [monitors, setMonitors] = useState<Set<Monitor>>(new Set(['latency', 'errors', 'cost']))
  const [minute, setMinute] = useState(40)

  const rows = useMemo(() => simulate(active, start), [active, start])
  const at = rows[minute]
  const fires = MONITORS.map((m) => ({ ...m, on: monitors.has(m.id), fire: firstFire(rows, m.id) }))
  const anyIncident = active.size > 0
  const detected = fires.filter((f) => f.on && f.fire !== null)
  const silent = anyIncident && !detected.length

  const toggle = <T,>(set: Set<T>, v: T, on: boolean) => {
    const n = new Set(set)
    if (on) n.add(v)
    else n.delete(v)
    return n
  }

  const spans = [
    { name: 'rewrite_query', d: 0.2 },
    { name: 'embed_query', d: 0.05 },
    { name: 'vector_search', d: at.retrieve },
    { name: 'rerank', d: 0.2 },
    { name: 'llm_generate', d: at.llm },
    { name: 'guardrails', d: 0.1 },
  ]
  const total = spans.reduce((n, s) => n + s.d, 0)
  let acc = 0

  return (
    <div className="pg">
      <PgHeader kicker="RAG playground" title="RAG Observability Lab">
        One hour of simulated production traffic. Inject incidents, choose which monitors exist, and see which alerts
        fire and when — then open a trace for any minute. Some incidents never show up in latency or error charts.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Incidents</h2>
          {INCIDENTS.map((i) => (
            <Check key={i.id} label={i.label} hint={i.hint} checked={active.has(i.id)} onChange={(v) => setActive((s) => toggle(s, i.id, v))} />
          ))}
          <Range label="Incident starts at minute" value={start} min={0} max={55} onChange={setStart} />
          <h3 style={{ marginTop: '0.6rem' }}>Monitors you have</h3>
          {MONITORS.map((m) => (
            <Check
              key={m.id}
              label={`${m.label}${m.kind === 'quality' ? ' (quality)' : ''}`}
              hint={m.rule}
              checked={monitors.has(m.id)}
              onChange={(v) => setMonitors((s) => toggle(s, m.id, v))}
            />
          ))}
        </div>

        <div className="pg-stack">
          <div className={`pg-banner ${!anyIncident ? 'ok' : silent ? 'bad' : 'warn'}`}>
            {!anyIncident
              ? 'All quiet — turn on an incident'
              : silent
                ? 'Silent failure: nothing alerted, but users are getting worse answers'
                : `Detected: first alert at minute ${Math.min(...detected.map((d) => d.fire as number))} (incident began at ${start})`}
            <p>
              {silent
                ? 'Ops metrics look healthy. Only quality monitors (empty retrievals, sampled faithfulness) catch this kind of incident.'
                : 'The “for N minutes” part of each rule trades detection speed for fewer false pages.'}
            </p>
          </div>

          <div className="pg-card">
            <h2>Alerts</h2>
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead>
                  <tr>
                    <th>Monitor</th>
                    <th>Rule</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {fires.map((f) => (
                    <tr key={f.id} className={f.on && f.fire !== null ? 'bad' : !f.on && f.fire !== null ? 'warn' : ''}>
                      <td>{f.label}</td>
                      <td>
                        <code>{f.rule}</code>
                      </td>
                      <td>
                        {!f.on
                          ? f.fire !== null
                            ? `not configured — would have fired at min ${f.fire}`
                            : 'not configured'
                          : f.fire !== null
                            ? `🔔 fired at min ${f.fire}`
                            : 'ok'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.7rem' }}>
            <Chart rows={rows} pick={(r) => r.p95} threshold={3} label="p95 latency" fmt={(v) => `${v.toFixed(1)} s`} start={anyIncident ? start : null} />
            <Chart rows={rows} pick={(r) => r.errors} threshold={0.02} label="Error rate" fmt={(v) => `${(v * 100).toFixed(1)}%`} start={anyIncident ? start : null} color="#ea580c" />
            <Chart rows={rows} pick={(r) => r.empty} threshold={0.1} label="Empty-retrieval rate" fmt={(v) => `${(v * 100).toFixed(0)}%`} start={anyIncident ? start : null} color="#0d9488" />
            <Chart rows={rows} pick={(r) => r.faith} threshold={0.85} label="Faithfulness (sampled)" fmt={(v) => v.toFixed(2)} start={anyIncident ? start : null} color="#16a34a" max={1} />
            <Chart rows={rows} pick={(r) => r.cost} threshold={0.4} label="Cost per minute" fmt={(v) => `$${v.toFixed(2)}`} start={anyIncident ? start : null} color="#db2777" />
          </div>

          <div className="pg-card">
            <h2>Trace at minute {minute}</h2>
            <Range label="Minute" value={minute} min={0} max={59} onChange={setMinute} />
            <div className="pg-stats" style={{ marginBottom: '0.7rem' }}>
              <Stat label="Total" value={`${total.toFixed(2)} s`} tone={total > 3 ? 'bad' : 'ok'} />
              <Stat label="Cache hit rate" value={`${Math.round(at.cache * 100)}%`} tone={at.cache < 0.1 ? 'warn' : undefined} />
              <Stat label="Requests / min" value={Math.round(at.rpm)} />
            </div>
            <div className="pg-gantt">
              {spans.map((s) => {
                const left = (acc / total) * 100
                acc += s.d
                const slow = s.d > 1 && s.name === 'vector_search'
                return (
                  <div key={s.name} className="pg-gantt-row">
                    <span>{s.name}</span>
                    <div className="pg-gantt-lane">
                      <div className={`pg-seg ${slow ? 'block' : s.name === 'llm_generate' ? 'llm' : 'cpu'}`} style={{ left: `${left}%`, width: `${Math.max(1.5, (s.d / total) * 100)}%` }} title={`${s.d.toFixed(2)} s`}>
                        {(s.d / total) * 100 > 12 ? `${s.d.toFixed(2)} s` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="pg-note">
              Spans run one after another, so the slowest span dominates. Attributes such as index version, hit count and
              token usage on each span are what turn “it is slow” into a root cause.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
