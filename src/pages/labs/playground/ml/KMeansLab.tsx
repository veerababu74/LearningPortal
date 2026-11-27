import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { gauss, rng, scale } from './mlMath'

type P = { x: number; y: number }
const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#db2777', '#0891b2']

function blobs(seed: number, trueK: number, spread: number): P[] {
  const r = rng(seed)
  const centres = Array.from({ length: trueK }, () => ({ x: 0.15 + r() * 0.7, y: 0.15 + r() * 0.7 }))
  return Array.from({ length: 150 }, (_, i) => {
    const c = centres[i % trueK]
    return { x: c.x + gauss(r) * spread, y: c.y + gauss(r) * spread }
  })
}

type State = { centroids: P[]; labels: number[]; phase: 'assign' | 'update'; iter: number; converged: boolean }

const d2 = (a: P, b: P) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

function init(points: P[], k: number, seed: number, plusPlus: boolean): State {
  const r = rng(seed * 31 + k)
  const c: P[] = [points[Math.floor(r() * points.length)]]
  while (c.length < k) {
    if (plusPlus) {
      const dist = points.map((p) => Math.min(...c.map((q) => d2(p, q))))
      const total = dist.reduce((a, b) => a + b, 0)
      let pick = r() * total
      let idx = 0
      while (pick > dist[idx] && idx < points.length - 1) pick -= dist[idx++]
      c.push(points[idx])
    } else c.push(points[Math.floor(r() * points.length)])
  }
  return { centroids: c.map((p) => ({ ...p })), labels: points.map(() => -1), phase: 'assign', iter: 0, converged: false }
}

function step(points: P[], s: State): State {
  if (s.converged) return s
  if (s.phase === 'assign') {
    const labels = points.map((p) => {
      let best = 0
      s.centroids.forEach((c, i) => {
        if (d2(p, c) < d2(p, s.centroids[best])) best = i
      })
      return best
    })
    const changed = labels.some((l, i) => l !== s.labels[i])
    return { ...s, labels, phase: 'update', iter: s.iter + 1, converged: !changed && s.iter > 0 }
  }
  const centroids = s.centroids.map((c, k) => {
    const mine = points.filter((_, i) => s.labels[i] === k)
    return mine.length ? { x: mine.reduce((a, p) => a + p.x, 0) / mine.length, y: mine.reduce((a, p) => a + p.y, 0) / mine.length } : c
  })
  return { ...s, centroids, phase: 'assign' }
}

const W = 440
const H = 400

export function KMeansLab() {
  const [k, setK] = useState(3)
  const [trueK, setTrueK] = useState(3)
  const [spread, setSpread] = useState(0.06)
  const [seed, setSeed] = useState(5)
  const [plusPlus, setPlusPlus] = useState(true)
  const points = useMemo(() => blobs(seed, trueK, spread), [seed, trueK, spread])
  const [st, setSt] = useState<State>(() => init(blobs(5, 3, 0.06), 3, 5, true))
  const reset = (nk = k, pts = points, pp = plusPlus, sd = seed) => setSt(init(pts, nk, sd, pp))

  const inertia = st.labels[0] >= 0 ? points.reduce((a, p, i) => a + d2(p, st.centroids[st.labels[i]] || p), 0) : NaN
  const sx = (v: number) => scale(v, -0.05, 1.05, 10, W - 10)
  const sy = (v: number) => scale(v, -0.05, 1.05, H - 10, 10)

  const run = () => {
    let s = st
    for (let i = 0; i < 100 && !s.converged; i++) s = step(points, s)
    setSt(s)
  }

  return (
    <div className="pg">
      <PgHeader kicker="ML playground" title="K-Means Lab">
        Step through K-means yourself: assign every point to its nearest centroid, move each centroid to the mean of its
        points, repeat until nothing changes. Try a wrong k, bad initialisation and overlapping clusters.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Settings</h2>
          <Range label="k (clusters to find)" value={k} min={1} max={6} onChange={(v) => { setK(v); reset(v) }} />
          <Range label="True number of blobs" value={trueK} min={1} max={6} onChange={(v) => { setTrueK(v); reset(k, blobs(seed, v, spread)) }} />
          <Range label="Blob spread" value={spread} min={0.02} max={0.2} step={0.01} onChange={(v) => { setSpread(v); reset(k, blobs(seed, trueK, v)) }} fmt={(v) => v.toFixed(2)} />
          <label className="pg-check">
            <input type="checkbox" checked={plusPlus} onChange={(e) => { setPlusPlus(e.target.checked); reset(k, points, e.target.checked) }} />
            <span>
              k-means++ initialisation<small>spreads the starting centroids out</small>
            </span>
          </label>
          <div className="pg-row">
            <button type="button" className="pg-btn" onClick={() => setSt(step(points, st))} disabled={st.converged}>
              {st.phase === 'assign' ? 'Step: assign points' : 'Step: move centroids'}
            </button>
            <button type="button" className="pg-btn" onClick={run} disabled={st.converged}>
              Run to convergence
            </button>
            <button type="button" className="pg-chip" onClick={() => reset()}>
              Re-initialise
            </button>
            <button type="button" className="pg-chip" onClick={() => { const s = seed + 1; setSeed(s); reset(k, blobs(s, trueK, spread), plusPlus, s) }}>
              New data
            </button>
          </div>
          <div className="pg-stats" style={{ marginTop: '0.8rem' }}>
            <Stat label="iteration" value={st.iter} />
            <Stat label="next step" value={st.converged ? 'done' : st.phase} />
            <Stat label="inertia" value={Number.isFinite(inertia) ? inertia.toFixed(3) : '—'} tone={st.converged ? 'ok' : undefined} />
          </div>
          <p className="pg-note">
            {st.converged
              ? `Converged after ${st.iter} iterations: no point changed cluster. Re-initialise a few times — K-means can stop in a local minimum, which is why libraries run several initialisations and keep the lowest inertia.`
              : 'Inertia is the sum of squared distances from each point to its centroid. Both steps can only lower it, so the algorithm always converges.'}
          </p>
        </div>

        <div className="pg-card">
          <h2>Points and centroids</h2>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="K-means clustering scatter plot">
            {points.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={st.labels[i] >= 0 ? COLORS[st.labels[i] % COLORS.length] : '#94a3b8'} opacity={0.75} />
            ))}
            {st.centroids.map((c, i) => (
              <g key={i}>
                <circle cx={sx(c.x)} cy={sy(c.y)} r={11} fill="white" stroke={COLORS[i % COLORS.length]} strokeWidth={3} />
                <text x={sx(c.x)} y={sy(c.y) + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={COLORS[i % COLORS.length]}>
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}
