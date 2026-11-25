import { useMemo, useState } from 'react'
import './LabShared.css'

function cosine(a: number[], b: number[]) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const na = Math.hypot(...a)
  const nb = Math.hypot(...b)
  return na && nb ? dot / (na * nb) : 0
}

export function CosineLab() {
  const [ax, setAx] = useState(0.8)
  const [ay, setAy] = useState(0.2)
  const [bx, setBx] = useState(0.6)
  const [by, setBy] = useState(0.55)

  const score = useMemo(() => cosine([ax, ay], [bx, by]), [ax, ay, bx, by])

  const size = 280
  const mid = size / 2
  const scale = 110

  return (
    <div className="lab">
      <h1>Cosine similarity lab</h1>
      <p className="lede">
        Cosine similarity measures the angle between vectors — the foundation of dense retrieval
        scoring.
      </p>
      <div className="lab-panel">
        <div className="lab-controls">
          <label>
            Query vector x: {ax.toFixed(2)}
            <input type="range" min={-1} max={1} step={0.05} value={ax} onChange={(e) => setAx(+e.target.value)} />
          </label>
          <label>
            Query vector y: {ay.toFixed(2)}
            <input type="range" min={-1} max={1} step={0.05} value={ay} onChange={(e) => setAy(+e.target.value)} />
          </label>
          <label>
            Doc vector x: {bx.toFixed(2)}
            <input type="range" min={-1} max={1} step={0.05} value={bx} onChange={(e) => setBx(+e.target.value)} />
          </label>
          <label>
            Doc vector y: {by.toFixed(2)}
            <input type="range" min={-1} max={1} step={0.05} value={by} onChange={(e) => setBy(+e.target.value)} />
          </label>
        </div>
        <div className="viz-box" style={{ display: 'grid', gap: '0.8rem', justifyItems: 'start' }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="vector-canvas">
            <line x1={20} y1={mid} x2={size - 20} y2={mid} stroke="rgba(255,255,255,0.2)" />
            <line x1={mid} y1={20} x2={mid} y2={size - 20} stroke="rgba(255,255,255,0.2)" />
            <line
              x1={mid}
              y1={mid}
              x2={mid + ax * scale}
              y2={mid - ay * scale}
              stroke="#7cb8b0"
              strokeWidth="3"
            />
            <line
              x1={mid}
              y1={mid}
              x2={mid + bx * scale}
              y2={mid - by * scale}
              stroke="#f0b429"
              strokeWidth="3"
            />
          </svg>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
            cosine = {score.toFixed(3)}
          </p>
          <p style={{ margin: 0, opacity: 0.85 }}>
            Teal = query embedding · Amber = document embedding. Closer angles → higher similarity.
          </p>
        </div>
      </div>
    </div>
  )
}
