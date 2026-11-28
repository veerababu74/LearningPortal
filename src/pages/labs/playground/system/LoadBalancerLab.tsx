import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat, Check } from '../common'
import { rng } from '../ml/mlMath'

type Algo = 'rr' | 'random' | 'least' | 'p2c'
const ALGOS: { id: Algo; name: string; note: string }[] = [
  { id: 'rr', name: 'Round robin', note: 'Next server in turn. Ignores how busy each server is.' },
  { id: 'random', name: 'Random', note: 'Any server at random. Simple, but some servers get unlucky streaks.' },
  { id: 'least', name: 'Least connections', note: 'The server with the fewest requests in flight. Needs a global view of every server.' },
  { id: 'p2c', name: 'Power of two choices', note: 'Pick two servers at random, send to the less busy one. Almost as good as least connections, with no global view.' },
]

type Result = { p50: number; p99: number; maxQueue: number; perServer: number[]; lost: number }

/**
 * Discrete-event simulation of N single-worker servers (each handles one request at a time, FIFO queue).
 * Requests arrive as a Poisson process; service time is fast most of the time with a slow tail.
 */
function simulate(algo: Algo, servers: number, utilisation: number, slowPct: number, slowMs: number, killOne: boolean, seed: number): Result {
  const r = rng(seed)
  const fastMs = 20
  const meanService = (1 - slowPct / 100) * fastMs + (slowPct / 100) * slowMs
  const lambda = (utilisation / 100) * (servers / meanService) // requests per ms across the cluster
  const busyUntil = new Array(servers).fill(0)
  const queues: number[][] = Array.from({ length: servers }, () => []) // completion times of queued requests
  const handled = new Array(servers).fill(0)
  const latencies: number[] = []
  let t = 0
  let rrIdx = 0
  let maxQueue = 0
  let lost = 0
  const N = 6000
  const deadAfter = N / 2
  for (let i = 0; i < N; i++) {
    t += -Math.log(1 - r()) / lambda
    // drop completed requests from each queue
    for (const q of queues) while (q.length && q[0] <= t) q.shift()
    const dead = killOne && i >= deadAfter ? 0 : -1
    const alive = Array.from({ length: servers }, (_, s) => s).filter((s) => s !== dead)
    const inflight = (s: number) => queues[s].length
    let s: number
    if (algo === 'rr') {
      s = alive[rrIdx % alive.length]
      rrIdx++
    } else if (algo === 'random') s = alive[Math.floor(r() * alive.length)]
    else if (algo === 'least') s = alive.reduce((a, b) => (inflight(b) < inflight(a) ? b : a))
    else {
      const a = alive[Math.floor(r() * alive.length)]
      const b = alive[Math.floor(r() * alive.length)]
      s = inflight(b) < inflight(a) ? b : a
    }
    const service = r() < slowPct / 100 ? slowMs : fastMs
    const start = Math.max(t, busyUntil[s])
    const done = start + service
    busyUntil[s] = done
    queues[s].push(done)
    maxQueue = Math.max(maxQueue, queues[s].length)
    handled[s]++
    const lat = done - t
    if (lat > 5000) lost++ // client would have timed out
    latencies.push(lat)
  }
  latencies.sort((a, b) => a - b)
  const q = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))]
  return { p50: q(0.5), p99: q(0.99), maxQueue, perServer: handled, lost }
}

const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`)

export function LoadBalancerLab() {
  const [servers, setServers] = useState(5)
  const [util, setUtil] = useState(75)
  const [slowPct, setSlowPct] = useState(5)
  const [slowMs, setSlowMs] = useState(1500)
  const [killOne, setKillOne] = useState(false)
  const [algo, setAlgo] = useState<Algo>('rr')
  const [seed, setSeed] = useState(11)

  const results = useMemo(
    () => ALGOS.map((a) => ({ ...a, res: simulate(a.id, servers, util, slowPct, slowMs, killOne, seed) })),
    [servers, util, slowPct, slowMs, killOne, seed],
  )
  const mine = results.find((x) => x.id === algo)!
  const worstP99 = Math.max(...results.map((x) => x.res.p99))
  const bestP99 = Math.min(...results.map((x) => x.res.p99))
  const maxHandled = Math.max(...mine.res.perServer)

  return (
    <div className="pg">
      <PgHeader kicker="System design playground" title="Load Balancer Lab">
        6,000 requests hit a cluster. Most take 20 ms; a few are slow (reports, uploads, LLM calls). Compare how each balancing
        algorithm handles the slow tail — measured as p99 latency — and what happens when a server dies mid-run.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Cluster and traffic</h2>
          <Range label="Servers" value={servers} min={2} max={12} onChange={setServers} />
          <Range label="Cluster utilisation" value={util} min={20} max={95} step={5} onChange={setUtil} fmt={(v) => `${v}%`} />
          <Range label="Slow requests" value={slowPct} min={0} max={30} onChange={setSlowPct} fmt={(v) => `${v}%`} />
          <Range label="Slow request duration" value={slowMs} min={100} max={5000} step={100} onChange={setSlowMs} fmt={ms} />
          <Check label="Kill server 1 halfway through" hint="its share must move to the others" checked={killOne} onChange={setKillOne} />
          <button type="button" className="pg-chip" onClick={() => setSeed(seed + 1)}>
            Re-run with new random traffic
          </button>

          <h3 style={{ marginTop: '1rem' }}>p99 latency by algorithm (lower is better)</h3>
          <div className="pg-bars">
            {results.map((x) => (
              <div key={x.id} className="pg-bar">
                <span className="pg-label">
                  {x.name}: <b>{ms(x.res.p99)}</b> {x.res.p99 === bestP99 ? '★' : ''}
                </span>
                <div className="pg-bar-track">
                  <div style={{ width: `${(x.res.p99 / worstP99) * 100}%`, height: '100%', background: x.id === algo ? '#0f766e' : '#94a3b8', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pg-card">
          <h2>Inspect one algorithm</h2>
          <div className="pg-row" style={{ flexWrap: 'wrap' }}>
            {ALGOS.map((a) => (
              <button key={a.id} type="button" className={algo === a.id ? 'pg-btn' : 'pg-chip'} onClick={() => setAlgo(a.id)}>
                {a.name}
              </button>
            ))}
          </div>
          <p className="pg-note">{mine.note}</p>
          <div className="pg-stats">
            <Stat label="median latency" value={ms(mine.res.p50)} />
            <Stat label="p99 latency" value={ms(mine.res.p99)} tone={mine.res.p99 === bestP99 ? 'ok' : mine.res.p99 > 3 * bestP99 ? 'bad' : 'warn'} />
            <Stat label="longest queue" value={mine.res.maxQueue} />
            <Stat label="requests over 5 s" value={mine.res.lost} tone={mine.res.lost ? 'bad' : 'ok'} />
          </div>
          <h3 style={{ marginTop: '0.8rem' }}>Requests handled per server</h3>
          <div className="pg-bars">
            {mine.res.perServer.map((n, i) => (
              <div key={i} className="pg-bar">
                <span className="pg-label">
                  Server {i + 1}: <b>{n}</b>
                  {killOne && i === 0 ? ' (died halfway)' : ''}
                </span>
                <div className="pg-bar-track">
                  <div style={{ width: `${(n / maxHandled) * 100}%`, height: '100%', background: killOne && i === 0 ? '#dc2626' : '#0f766e', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="pg-note">
            Equal request counts do not mean equal load: round robin gives every server the same number of requests, yet fast requests get stuck
            behind slow ones. Load-aware algorithms (least connections, power of two choices) route around busy servers, which matters most at high
            utilisation and with a heavy slow tail.
          </p>
        </div>
      </div>
    </div>
  )
}
