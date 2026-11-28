import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { rng } from '../ml/mlMath'

type Algo = 'fixed' | 'sliding' | 'token' | 'leaky'
const ALGOS: { id: Algo; name: string; note: string }[] = [
  { id: 'fixed', name: 'Fixed window', note: 'Count per calendar window. Cheap, but a burst at the end of one window plus the start of the next lets through up to 2× the limit.' },
  { id: 'sliding', name: 'Sliding window log', note: 'Counts requests in the last N seconds exactly. Accurate, but stores a timestamp per request.' },
  { id: 'token', name: 'Token bucket', note: 'Tokens refill at a steady rate up to a capacity. Allows short bursts, caps the average. The common default for APIs.' },
  { id: 'leaky', name: 'Leaky bucket (queue)', note: 'Requests queue and leave at a constant rate. Smooths output perfectly; excess beyond the queue size is dropped.' },
]
type Pattern = 'steady' | 'burst' | 'boundary' | 'random'

const SECONDS = 20
const TICK = 0.1

/** Arrival times (seconds) for a traffic pattern. */
function arrivals(pattern: Pattern, rate: number, seed: number): number[] {
  const r = rng(seed)
  const out: number[] = []
  if (pattern === 'steady') for (let t = 0; t < SECONDS; t += 1 / rate) out.push(t)
  if (pattern === 'random') {
    let t = 0
    while (t < SECONDS) {
      t += -Math.log(1 - r()) / rate
      out.push(t)
    }
  }
  if (pattern === 'burst') {
    for (let t = 0; t < SECONDS; t += 1 / (rate * 0.3)) out.push(t)
    for (const b of [4, 12]) for (let i = 0; i < rate * 3; i++) out.push(b + i * 0.01)
  }
  if (pattern === 'boundary') {
    // bursts straddling each 10-second window edge
    for (let t = 0; t < SECONDS; t += 2) out.push(t)
    for (const edge of [10]) for (let i = 0; i < rate * 10; i++) out.push(edge - 0.9 + (i / (rate * 10)) * 1.8)
  }
  return out.filter((t) => t < SECONDS).sort((a, b) => a - b)
}

/** Simulate one algorithm. limit = requests per `win` seconds. */
function simulate(algo: Algo, times: number[], limit: number, win: number, burst: number) {
  const ok: boolean[] = []
  const rate = limit / win
  if (algo === 'fixed') {
    const counts = new Map<number, number>()
    for (const t of times) {
      const w = Math.floor(t / win)
      const c = counts.get(w) || 0
      ok.push(c < limit)
      if (c < limit) counts.set(w, c + 1)
    }
  } else if (algo === 'sliding') {
    const log: number[] = []
    for (const t of times) {
      while (log.length && log[0] <= t - win) log.shift()
      const allow = log.length < limit
      if (allow) log.push(t)
      ok.push(allow)
    }
  } else if (algo === 'token') {
    let tokens = burst
    let last = 0
    for (const t of times) {
      tokens = Math.min(burst, tokens + (t - last) * rate)
      last = t
      const allow = tokens >= 1
      if (allow) tokens -= 1
      ok.push(allow)
    }
  } else {
    // leaky bucket as a queue of size `burst`, drained at `rate`
    let queue = 0
    let last = 0
    for (const t of times) {
      queue = Math.max(0, queue - (t - last) * rate)
      last = t
      const allow = queue + 1 <= burst
      if (allow) queue += 1
      ok.push(allow)
    }
  }
  return ok
}

const W = 520
const H = 210

export function RateLimiterLab() {
  const [algo, setAlgo] = useState<Algo>('token')
  const [pattern, setPattern] = useState<Pattern>('burst')
  const [limit, setLimit] = useState(50)
  const [win, setWin] = useState(10)
  const [burst, setBurst] = useState(15)
  const [load, setLoad] = useState(8)
  const [seed, setSeed] = useState(3)

  const times = useMemo(() => arrivals(pattern, load, seed), [pattern, load, seed])
  const ok = useMemo(() => simulate(algo, times, limit, win, burst), [algo, times, limit, win, burst])
  const allowed = ok.filter(Boolean).length
  const all = ALGOS.map((a) => ({ ...a, allowed: simulate(a.id, times, limit, win, burst).filter(Boolean).length }))

  // worst number allowed in ANY window of length `win` — exposes the fixed-window edge burst
  const allowedTimes = times.filter((_, i) => ok[i])
  let worstWindow = 0
  for (let i = 0, j = 0; i < allowedTimes.length; i++) {
    while (allowedTimes[i] - allowedTimes[j] >= win) j++
    worstWindow = Math.max(worstWindow, i - j + 1)
  }

  // per-tick histogram
  const bins = Math.round(SECONDS / TICK)
  const okBins = new Array(bins).fill(0)
  const noBins = new Array(bins).fill(0)
  times.forEach((t, i) => {
    const b = Math.min(bins - 1, Math.floor(t / TICK))
    if (ok[i]) okBins[b]++
    else noBins[b]++
  })
  const maxBin = Math.max(1, ...okBins.map((v, i) => v + noBins[i]))
  const bw = W / bins

  return (
    <div className="pg">
      <PgHeader kicker="System design playground" title="Rate Limiter Algorithms Lab">
        Fire the same traffic at four rate-limiting algorithms. See which requests pass (green) or get 429 (red), and why
        fixed windows let double the limit through at a window edge.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Policy and traffic</h2>
          <div className="pg-row" style={{ flexWrap: 'wrap' }}>
            {ALGOS.map((a) => (
              <button key={a.id} type="button" className={algo === a.id ? 'pg-btn' : 'pg-chip'} onClick={() => setAlgo(a.id)}>
                {a.name}
              </button>
            ))}
          </div>
          <Range label="Limit (requests per window)" value={limit} min={5} max={200} step={5} onChange={setLimit} />
          <Range label="Window (seconds)" value={win} min={1} max={20} onChange={setWin} />
          <Range label="Bucket capacity / queue size" value={burst} min={1} max={100} onChange={setBurst} />
          <div className="pg-row" style={{ flexWrap: 'wrap' }}>
            {(['steady', 'random', 'burst', 'boundary'] as Pattern[]).map((p) => (
              <button key={p} type="button" className={pattern === p ? 'pg-btn' : 'pg-chip'} onClick={() => setPattern(p)}>
                {p === 'boundary' ? 'burst at window edge' : p}
              </button>
            ))}
            <button type="button" className="pg-chip" onClick={() => setSeed(seed + 1)}>
              new random traffic
            </button>
          </div>
          <Range label="Offered load (requests per second)" value={load} min={1} max={30} onChange={setLoad} />
          <p className="pg-note">{ALGOS.find((a) => a.id === algo)!.note}</p>
        </div>

        <div className="pg-card">
          <h2>{ALGOS.find((a) => a.id === algo)!.name}: 20 seconds of traffic</h2>
          <div className="pg-stats">
            <Stat label="requests" value={times.length} />
            <Stat label="allowed" value={allowed} tone="ok" />
            <Stat label="rejected (429)" value={times.length - allowed} tone={times.length - allowed ? 'bad' : undefined} />
            <Stat label={`most allowed in any ${win}s`} value={`${worstWindow} / ${limit}`} tone={worstWindow > limit ? 'bad' : 'ok'} />
          </div>
          <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto', marginTop: '0.6rem' }} role="img" aria-label="Allowed and rejected requests over time">
            {Array.from({ length: Math.floor(SECONDS / win) + 1 }, (_, i) => (
              <line key={i} x1={(i * win * W) / SECONDS} x2={(i * win * W) / SECONDS} y1={0} y2={H} stroke="#cbd5e1" strokeDasharray="4 4" />
            ))}
            {okBins.map((v, i) => {
              const hOk = (v / maxBin) * (H - 10)
              const hNo = (noBins[i] / maxBin) * (H - 10)
              return (
                <g key={i}>
                  <rect x={i * bw} y={H - hOk} width={Math.max(1, bw - 0.5)} height={hOk} fill="#16a34a" />
                  <rect x={i * bw} y={H - hOk - hNo} width={Math.max(1, bw - 0.5)} height={hNo} fill="#dc2626" opacity={0.8} />
                </g>
              )
            })}
            {Array.from({ length: SECONDS / 5 + 1 }, (_, i) => (
              <text key={i} x={Math.min(W - 10, (i * 5 * W) / SECONDS)} y={H + 16} fontSize={11} fill="#64748b" textAnchor="middle">
                {i * 5}s
              </text>
            ))}
          </svg>
          <p className="pg-legend">
            <span style={{ color: '#16a34a' }}>■</span> allowed &nbsp; <span style={{ color: '#dc2626' }}>■</span> rejected &nbsp; dashed lines = window edges
          </p>

          <h3>Same traffic, every algorithm</h3>
          <div className="pg-bars">
            {all.map((a) => (
              <div key={a.id} className="pg-bar">
                <span className="pg-label">
                  {a.name}: <b>{a.allowed} allowed</b>
                </span>
                <div className="pg-bar-track">
                  <div style={{ width: `${(a.allowed / Math.max(1, times.length)) * 100}%`, height: '100%', background: a.id === algo ? '#0f766e' : '#94a3b8', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="pg-note">
            Try <b>burst at window edge</b> with a fixed window: up to twice the limit passes within one window-length because the counter resets at
            the edge. The sliding window never exceeds the limit. In production the counters live in Redis so every API server enforces the same limit.
          </p>
        </div>
      </div>
    </div>
  )
}
