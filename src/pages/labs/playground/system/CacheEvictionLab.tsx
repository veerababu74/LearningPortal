import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { rng } from '../ml/mlMath'

type Policy = 'LRU' | 'LFU' | 'FIFO' | 'Random'
const POLICIES: Policy[] = ['LRU', 'LFU', 'FIFO', 'Random']
type Workload = 'zipf' | 'scan' | 'shift' | 'loop'
const WORKLOADS: { id: Workload; name: string; note: string }[] = [
  { id: 'zipf', name: 'Popular items (Zipf)', note: 'A few keys get most requests — like product pages or profiles. Every sensible policy does well; LFU slightly better.' },
  { id: 'scan', name: 'Hot set + full scans', note: 'Normal popular traffic interrupted by a batch job reading every key once. The scan flushes an LRU cache; LFU keeps the hot keys.' },
  { id: 'shift', name: 'Popularity shifts', note: 'Yesterday’s hot keys go cold and new ones get hot. LFU clings to old favourites; LRU adapts quickly.' },
  { id: 'loop', name: 'Loop larger than cache', note: 'Cycling through more keys than fit. LRU always evicts the key needed next — 0% hits. Random does better.' },
]

const N_KEYS = 200
const N_REQ = 3000

function zipfSampler(r: () => number, n: number, s = 1.05) {
  const w = Array.from({ length: n }, (_, i) => 1 / (i + 1) ** s)
  const total = w.reduce((a, b) => a + b, 0)
  const cdf: number[] = []
  let acc = 0
  for (const x of w) cdf.push((acc += x / total))
  return () => {
    const u = r()
    let lo = 0
    let hi = n - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cdf[mid] < u) lo = mid + 1
      else hi = mid
    }
    return lo
  }
}

function trace(w: Workload, seed: number): number[] {
  const r = rng(seed)
  const z = zipfSampler(r, N_KEYS)
  const out: number[] = []
  for (let i = 0; i < N_REQ; i++) {
    if (w === 'zipf') out.push(z())
    else if (w === 'scan') out.push(i % 1000 >= 800 ? (i % 1000) - 800 : z())
    else if (w === 'shift') out.push(i < N_REQ / 2 ? z() : (z() + 100) % N_KEYS)
    else out.push(i % 60)
  }
  return out
}

function run(policy: Policy, keys: number[], cap: number, seed: number) {
  const r = rng(seed + 99)
  const order: number[] = [] // FIFO / LRU order: front = oldest / least recent
  const freq = new Map<number, number>()
  const inCache = new Set<number>()
  let hits = 0
  const snapshots: { key: number; hit: boolean; evicted: number | null; cache: number[] }[] = []
  keys.forEach((k, i) => {
    let hit = false
    let evicted: number | null = null
    freq.set(k, (freq.get(k) || 0) + 1)
    if (inCache.has(k)) {
      hit = true
      hits++
      if (policy === 'LRU') {
        order.splice(order.indexOf(k), 1)
        order.push(k)
      }
    } else {
      if (inCache.size >= cap) {
        let victim: number
        if (policy === 'LFU') victim = order.reduce((a, b) => ((freq.get(b) || 0) < (freq.get(a) || 0) ? b : a))
        else if (policy === 'Random') victim = order[Math.floor(r() * order.length)]
        else victim = order[0]
        order.splice(order.indexOf(victim), 1)
        inCache.delete(victim)
        evicted = victim
      }
      inCache.add(k)
      order.push(k)
    }
    if (i < 24) snapshots.push({ key: k, hit, evicted, cache: [...order] })
  })
  return { hitRate: hits / keys.length, snapshots }
}

export function CacheEvictionLab() {
  const [workload, setWorkload] = useState<Workload>('scan')
  const [cap, setCap] = useState(40)
  const [policy, setPolicy] = useState<Policy>('LRU')
  const [seed, setSeed] = useState(7)
  const keys = useMemo(() => trace(workload, seed), [workload, seed])
  const results = useMemo(() => POLICIES.map((p) => ({ p, ...run(p, keys, cap, seed) })), [keys, cap, seed])
  const mine = results.find((x) => x.p === policy)!
  const best = results.reduce((a, b) => (b.hitRate > a.hitRate ? b : a))

  return (
    <div className="pg">
      <PgHeader kicker="System design playground" title="Cache Eviction Lab">
        A cache can hold only so many keys. When it is full, the eviction policy decides who leaves. Replay 3,000 real-looking
        requests through LRU, LFU, FIFO and Random and compare hit rates — then step through the first requests.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Workload</h2>
          <div className="pg-row" style={{ flexWrap: 'wrap' }}>
            {WORKLOADS.map((w) => (
              <button key={w.id} type="button" className={workload === w.id ? 'pg-btn' : 'pg-chip'} onClick={() => setWorkload(w.id)}>
                {w.name}
              </button>
            ))}
          </div>
          <p className="pg-note">{WORKLOADS.find((w) => w.id === workload)!.note}</p>
          <Range label="Cache capacity (keys)" value={cap} min={5} max={150} step={5} onChange={setCap} fmt={(v) => `${v} of ${N_KEYS}`} />
          <button type="button" className="pg-chip" onClick={() => setSeed(seed + 1)}>
            New random trace
          </button>

          <h3 style={{ marginTop: '1rem' }}>Hit rate by policy</h3>
          <div className="pg-bars">
            {results.map((x) => (
              <div key={x.p} className="pg-bar">
                <span className="pg-label">
                  {x.p}: <b>{(x.hitRate * 100).toFixed(1)}%</b> {x.p === best.p ? '★' : ''}
                </span>
                <div className="pg-bar-track">
                  <div style={{ width: `${x.hitRate * 100}%`, height: '100%', background: x.p === policy ? '#0f766e' : '#94a3b8', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="pg-note">
            Every miss is a trip to the database. Going from 80% to 95% hits cuts database load by 4×. Redis uses an approximated LRU or LFU
            (<code>maxmemory-policy allkeys-lru</code> / <code>allkeys-lfu</code>).
          </p>
        </div>

        <div className="pg-card">
          <h2>Step by step</h2>
          <div className="pg-row" style={{ flexWrap: 'wrap' }}>
            {POLICIES.map((p) => (
              <button key={p} type="button" className={policy === p ? 'pg-btn' : 'pg-chip'} onClick={() => setPolicy(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="pg-stats" style={{ marginTop: '0.6rem' }}>
            <Stat label="policy" value={policy} />
            <Stat label="hit rate" value={`${(mine.hitRate * 100).toFixed(1)}%`} tone={mine.p === best.p ? 'ok' : undefined} />
            <Stat label="DB reads per 1,000 requests" value={Math.round((1 - mine.hitRate) * 1000)} />
          </div>
          <div className="pg-table-wrap" style={{ marginTop: '0.6rem' }}>
            <table className="pg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>key</th>
                  <th>result</th>
                  <th>evicted</th>
                  <th>cache (oldest / least recent → newest), first 5 slots shown</th>
                </tr>
              </thead>
              <tbody>
                {mine.snapshots.slice(0, 16).map((s, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="pg-mono">k{s.key}</td>
                    <td style={{ color: s.hit ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{s.hit ? 'hit' : 'miss'}</td>
                    <td className="pg-mono">{s.evicted === null ? '' : `k${s.evicted}`}</td>
                    <td className="pg-mono">
                      {s.cache.slice(0, 5).map((k) => `k${k}`).join(' ')}
                      {s.cache.length > 5 ? ` … (+${s.cache.length - 5})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pg-note">The cache starts empty, so the first requests are cold misses; evictions start once {cap} keys are stored.</p>
        </div>
      </div>
    </div>
  )
}
