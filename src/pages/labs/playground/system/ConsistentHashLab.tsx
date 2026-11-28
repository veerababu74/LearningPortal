import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat, Check } from '../common'

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#db2777', '#0891b2', '#ca8a04', '#dc2626']
const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const KEYS = 400
const SPACE = 2 ** 32

/** FNV-1a 32-bit — small, deterministic, good enough to spread points around a ring. */
function hash(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  // final avalanche so similar strings land far apart
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  return h >>> 0
}

type Point = { pos: number; server: number }

function ringFor(servers: number, vnodes: number): Point[] {
  const pts: Point[] = []
  for (let s = 0; s < servers; s++) for (let v = 0; v < vnodes; v++) pts.push({ pos: hash(`${NAMES[s]}#${v}`), server: s })
  return pts.sort((a, b) => a.pos - b.pos)
}

function owner(ring: Point[], pos: number) {
  let lo = 0
  let hi = ring.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (ring[mid].pos < pos) lo = mid + 1
    else hi = mid
  }
  return ring[lo % ring.length].server
}

const keyPos = Array.from({ length: KEYS }, (_, i) => hash(`user:${i}`))

function assign(servers: number, vnodes: number, modN: boolean) {
  if (modN) return keyPos.map((p) => p % servers)
  const ring = ringFor(servers, vnodes)
  return keyPos.map((p) => owner(ring, p))
}

const R = 150
const C = 190
const polar = (pos: number, r: number) => {
  const a = (pos / SPACE) * Math.PI * 2 - Math.PI / 2
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
}

export function ConsistentHashLab() {
  const [servers, setServers] = useState(3)
  const [vnodes, setVnodes] = useState(1)
  const [modN, setModN] = useState(false)
  const [prevServers, setPrevServers] = useState(3)

  const now = useMemo(() => assign(servers, vnodes, modN), [servers, vnodes, modN])
  const before = useMemo(() => assign(prevServers, vnodes, modN), [prevServers, vnodes, modN])
  const ring = useMemo(() => ringFor(servers, vnodes), [servers, vnodes])
  const moved = now.filter((s, i) => s !== before[i]).length
  const counts = Array.from({ length: servers }, (_, s) => now.filter((x) => x === s).length)
  const ideal = KEYS / servers
  const worst = Math.max(...counts)
  const imbalance = ((worst - ideal) / ideal) * 100

  const change = (n: number) => {
    setPrevServers(servers)
    setServers(n)
  }

  return (
    <div className="pg">
      <PgHeader kicker="System design playground" title="Consistent Hashing Lab">
        400 keys spread over cache servers. Add or remove a server and count how many keys must move — with plain
        hash-mod-N versus a hash ring — then add virtual nodes to even out the load.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Cluster</h2>
          <div className="pg-row">
            <button type="button" className="pg-btn" onClick={() => change(Math.min(8, servers + 1))} disabled={servers >= 8}>
              + Add server {NAMES[servers] || ''}
            </button>
            <button type="button" className="pg-btn" onClick={() => change(Math.max(1, servers - 1))} disabled={servers <= 1}>
              − Remove server {NAMES[servers - 1]}
            </button>
          </div>
          <Range label="Virtual nodes per server" value={vnodes} min={1} max={200} onChange={(v) => { setPrevServers(servers); setVnodes(v) }} />
          <Check label="Use hash(key) mod N instead of a ring" hint="the naive approach" checked={modN} onChange={(v) => { setPrevServers(servers); setModN(v) }} />

          <div className="pg-stats" style={{ marginTop: '0.8rem' }}>
            <Stat label="servers" value={`${prevServers} → ${servers}`} />
            <Stat
              label="keys moved by last change"
              value={`${moved} (${Math.round((moved / KEYS) * 100)}%)`}
              tone={prevServers === servers ? undefined : moved / KEYS > 0.5 ? 'bad' : 'ok'}
            />
            <Stat label="minimum possible" value={prevServers === servers ? '—' : `${Math.round((Math.abs(servers - prevServers) / Math.max(servers, prevServers)) * 100)}%`} />
            <Stat label="busiest server vs ideal" value={`+${Math.max(0, imbalance).toFixed(0)}%`} tone={imbalance > 40 ? 'warn' : 'ok'} />
          </div>

          <div className="pg-bars" style={{ marginTop: '0.8rem' }}>
            {counts.map((c, s) => (
              <div key={s} className="pg-bar">
                <span className="pg-label">
                  Server {NAMES[s]}: <b>{c} keys</b>
                </span>
                <div className="pg-bar-track">
                  <div style={{ width: `${(c / Math.max(worst, 1)) * 100}%`, height: '100%', background: COLORS[s], borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="pg-note">
            {modN
              ? 'With mod N, a key keeps its server only if hash % old_N equals hash % new_N — most keys move, so a cache cluster loses most of its hits at once.'
              : vnodes < 10
                ? 'With one point per server the arcs are uneven: one server can own far more than its share. Raise the virtual nodes.'
                : 'With many virtual nodes each server owns many small arcs, so load is even and a new server takes a little from every other server.'}
          </p>
        </div>

        <div className="pg-card">
          <h2>{modN ? 'Keys coloured by hash mod N' : 'The hash ring'}</h2>
          <svg viewBox="0 0 380 380" style={{ width: '100%', height: 'auto' }} role="img" aria-label="Hash ring with keys and servers">
            <circle cx={C} cy={C} r={R} fill="none" stroke="#cbd5e1" strokeWidth={2} />
            {keyPos.map((p, i) => {
              const { x, y } = polar(p, R - 14)
              const movedKey = now[i] !== before[i]
              return <circle key={i} cx={x} cy={y} r={movedKey ? 4 : 2.6} fill={COLORS[now[i]]} stroke={movedKey ? '#0f172a' : 'none'} strokeWidth={movedKey ? 1.2 : 0} opacity={0.85} />
            })}
            {!modN &&
              ring.slice(0, 400).map((pt, i) => {
                const a = polar(pt.pos, R + 4)
                const b = polar(pt.pos, R + (vnodes > 20 ? 10 : 18))
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLORS[pt.server]} strokeWidth={vnodes > 20 ? 1 : 3} />
              })}
            {!modN && vnodes <= 3
              ? ring.map((pt, i) => {
                  const t = polar(pt.pos, R + 30)
                  return (
                    <text key={`t${i}`} x={t.x} y={t.y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={COLORS[pt.server]}>
                      {NAMES[pt.server]}
                    </text>
                  )
                })
              : null}
            <text x={C} y={C - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill="#334155">
              {KEYS} keys
            </text>
            <text x={C} y={C + 14} textAnchor="middle" fontSize={11} fill="#64748b">
              outlined = moved
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}
