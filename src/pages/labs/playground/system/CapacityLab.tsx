import { useState } from 'react'
import { PgHeader, Range, Stat } from '../common'

const fmtNum = (n: number) => {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(a < 10 ? 1 : 0)
}
const fmtBytes = (b: number) => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0
  while (b >= 1000 && i < u.length - 1) {
    b /= 1000
    i++
  }
  return `${b.toFixed(b < 10 ? 1 : 0)} ${u[i]}`
}
/** log-scale slider helpers: slider value 0..100 ↔ 10^lo..10^hi */
const fromLog = (v: number, lo: number, hi: number) => Math.round(10 ** (lo + ((hi - lo) * v) / 100))
const toLog = (x: number, lo: number, hi: number) => ((Math.log10(x) - lo) / (hi - lo)) * 100

const PRESETS = [
  { name: 'URL shortener', dau: 10_000_000, perUser: 10, readPct: 99, size: 500, retention: 5, perServer: 5000 },
  { name: 'Twitter-like feed', dau: 200_000_000, perUser: 50, readPct: 97, size: 1000, retention: 5, perServer: 3000 },
  { name: 'Chat app', dau: 50_000_000, perUser: 40, readPct: 50, size: 300, retention: 3, perServer: 4000 },
  { name: 'Photo sharing', dau: 100_000_000, perUser: 20, readPct: 95, size: 2_000_000, retention: 10, perServer: 2000 },
]

export function CapacityLab() {
  const [dau, setDau] = useState(10_000_000)
  const [perUser, setPerUser] = useState(10)
  const [readPct, setReadPct] = useState(99)
  const [size, setSize] = useState(500)
  const [peak, setPeak] = useState(3)
  const [retention, setRetention] = useState(5)
  const [replicas, setReplicas] = useState(3)
  const [perServer, setPerServer] = useState(5000)

  const reqDay = dau * perUser
  const avgQps = reqDay / 86_400
  const peakQps = avgQps * peak
  const writeQps = avgQps * (1 - readPct / 100)
  const readQps = avgQps * (readPct / 100)
  const writesDay = reqDay * (1 - readPct / 100)
  const storageDay = writesDay * size
  const storageTotal = storageDay * 365 * retention * replicas
  const egress = peakQps * (readPct / 100) * size // bytes/s at peak
  const servers = Math.max(2, Math.ceil((peakQps / perServer) * 1.3)) // 30% headroom, at least 2 for redundancy
  // 80/20: caching the hottest 20% of a day's distinct reads covers most traffic
  const cacheBytes = readQps * 86_400 * 0.2 * size
  const shardsNeeded = Math.ceil(storageTotal / 2e12) // ~2 TB per database node as a rule of thumb

  const bars = [
    { label: 'Average QPS', v: avgQps },
    { label: 'Peak QPS', v: peakQps },
    { label: 'Read QPS', v: readQps },
    { label: 'Write QPS', v: writeQps },
  ]
  const max = Math.max(...bars.map((b) => b.v), 1)

  return (
    <div className="pg">
      <PgHeader kicker="System design playground" title="Capacity Estimation Lab">
        Back-of-the-envelope maths for any design: turn daily users into requests per second, storage, bandwidth, servers
        and cache size. Move a slider and watch which part of the architecture becomes the bottleneck.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Assumptions</h2>
          <div className="pg-row" style={{ flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="pg-chip"
                onClick={() => {
                  setDau(p.dau)
                  setPerUser(p.perUser)
                  setReadPct(p.readPct)
                  setSize(p.size)
                  setRetention(p.retention)
                  setPerServer(p.perServer)
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <Range label="Daily active users" value={toLog(dau, 3, 9)} min={0} max={100} onChange={(v) => setDau(fromLog(v, 3, 9))} fmt={() => fmtNum(dau)} />
          <Range label="Requests per user per day" value={perUser} min={1} max={200} onChange={setPerUser} />
          <Range label="Reads (% of requests)" value={readPct} min={0} max={100} onChange={setReadPct} fmt={(v) => `${v}%`} />
          <Range label="Size of one stored item" value={toLog(size, 1, 7)} min={0} max={100} onChange={(v) => setSize(fromLog(v, 1, 7))} fmt={() => fmtBytes(size)} />
          <Range label="Peak ÷ average traffic" value={peak} min={1} max={10} step={0.5} onChange={setPeak} fmt={(v) => `${v}×`} />
          <Range label="Keep data for (years)" value={retention} min={1} max={10} onChange={setRetention} />
          <Range label="Copies of each item (replication)" value={replicas} min={1} max={5} onChange={setReplicas} />
          <Range label="Requests one app server handles" value={perServer} min={500} max={20000} step={500} onChange={setPerServer} fmt={(v) => `${fmtNum(v)}/s`} />
        </div>

        <div className="pg-card">
          <h2>Results</h2>
          <div className="pg-stats">
            <Stat label="requests / day" value={fmtNum(reqDay)} />
            <Stat label="average QPS" value={fmtNum(avgQps)} />
            <Stat label="peak QPS" value={fmtNum(peakQps)} tone={peakQps > 100_000 ? 'warn' : undefined} />
            <Stat label="write QPS" value={fmtNum(writeQps)} tone={writeQps > 10_000 ? 'warn' : undefined} />
            <Stat label="new data / day" value={fmtBytes(storageDay)} />
            <Stat label={`total storage (${retention} y × ${replicas})`} value={fmtBytes(storageTotal)} tone={storageTotal > 1e14 ? 'warn' : undefined} />
            <Stat label="peak egress" value={`${fmtBytes(egress)}/s`} />
            <Stat label="app servers (30% headroom)" value={servers} />
            <Stat label="cache for hot 20%" value={fmtBytes(cacheBytes)} />
          </div>

          <div className="pg-bars" style={{ marginTop: '1rem' }}>
            {bars.map((b) => (
              <div key={b.label} className="pg-bar">
                <span className="pg-label">
                  {b.label}: <b>{fmtNum(b.v)}/s</b>
                </span>
                <div className="pg-bar-track">
                  <div style={{ width: `${Math.max(2, (b.v / max) * 100)}%`, height: '100%', background: '#0f766e', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '1rem' }}>What the numbers say</h3>
          <ul className="pg-insights">
            <li>
              {peakQps < 1000
                ? 'Under 1K QPS at peak: a couple of servers and one database are enough — keep it simple.'
                : peakQps < 50_000
                  ? `About ${servers} stateless app servers behind a load balancer handle the peak.`
                  : `Peak traffic of ${fmtNum(peakQps)}/s needs many app servers, aggressive caching and probably a CDN in front.`}
            </li>
            <li>
              {writeQps < 2000
                ? 'Writes fit comfortably on one primary database; add read replicas for reads.'
                : writeQps < 20_000
                  ? 'Writes are heavy for a single primary — batch them, queue them, or plan for sharding.'
                  : 'Write volume needs sharding or a write-optimised store (Cassandra, DynamoDB) from day one.'}
            </li>
            <li>
              {shardsNeeded <= 1
                ? 'All data fits on a single database node (≲ 2 TB).'
                : `Roughly ${shardsNeeded} database nodes of ~2 TB each: choose a shard key early.`}
            </li>
            <li>
              {readPct >= 90
                ? `Read-heavy (${readPct}% reads): a cache of ~${fmtBytes(cacheBytes)} absorbs most reads before they reach the database.`
                : 'Balanced or write-heavy traffic: caching helps less — focus on write throughput and partitioning.'}
            </li>
          </ul>
          <p className="pg-note">
            Rules of thumb: a day has 86,400 seconds (≈ 100K for quick maths); peak is often 2–3× average; one app server handles
            roughly 1K–10K simple requests per second; the hottest 20% of data usually serves ~80% of reads.
          </p>
        </div>
      </div>
    </div>
  )
}
