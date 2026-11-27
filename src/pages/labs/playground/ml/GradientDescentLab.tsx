import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { fmt, gauss, rng, scale } from './mlMath'

type Step = { w: number; b: number; loss: number }

function makeData(seed: number, noise: number) {
  const r = rng(seed)
  const xs = Array.from({ length: 20 }, (_, i) => i / 19 * 4)
  const ys = xs.map((x) => 2 * x + 1 + gauss(r) * noise)
  return { xs, ys }
}

function run(xs: number[], ys: number[], lr: number, steps: number): Step[] {
  let w = 0
  let b = 0
  const out: Step[] = []
  const loss = () => xs.reduce((s, x, i) => s + (w * x + b - ys[i]) ** 2, 0) / xs.length
  out.push({ w, b, loss: loss() })
  for (let k = 0; k < steps; k++) {
    let gw = 0
    let gb = 0
    xs.forEach((x, i) => {
      const e = w * x + b - ys[i]
      gw += (2 * e * x) / xs.length
      gb += (2 * e) / xs.length
    })
    w -= lr * gw
    b -= lr * gb
    const L = loss()
    out.push({ w, b, loss: L })
    if (!Number.isFinite(L) || L > 1e12) break
  }
  return out
}

const W = 420
const H = 260
const PAD = 34

export function GradientDescentLab() {
  const [lr, setLr] = useState(0.05)
  const [steps, setSteps] = useState(40)
  const [noise, setNoise] = useState(0.6)
  const [seed, setSeed] = useState(7)
  const [at, setAt] = useState(40)

  const data = useMemo(() => makeData(seed, noise), [seed, noise])
  const hist = useMemo(() => run(data.xs, data.ys, lr, steps), [data, lr, steps])
  const idx = Math.min(at, hist.length - 1)
  const cur = hist[idx]
  const diverged = !Number.isFinite(cur.loss) || cur.loss > hist[0].loss * 5
  const yMin = Math.min(...data.ys, 0) - 1
  const yMax = Math.max(...data.ys) + 1
  const sx = (x: number) => scale(x, 0, 4, PAD, W - 10)
  const sy = (y: number) => scale(y, yMin, yMax, H - PAD, 10)

  const lossMax = Math.max(...hist.slice(0, Math.max(2, Math.min(hist.length, steps + 1))).map((h) => (Number.isFinite(h.loss) ? h.loss : 0)), 1e-6)
  const lx = (i: number) => scale(i, 0, Math.max(1, hist.length - 1), PAD, W - 10)
  const ly = (v: number) => scale(Math.min(v, lossMax), 0, lossMax, H - PAD, 10)

  return (
    <div className="pg">
      <PgHeader kicker="ML playground" title="Gradient Descent Lab">
        Fit a line to noisy points with gradient descent. Change the learning rate and number of steps, scrub through the
        updates, and see when training converges, crawls or diverges.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Settings</h2>
          <Range label="Learning rate η" value={lr} min={0.005} max={0.2} step={0.005} onChange={(v) => { setLr(v); setAt(steps) }} fmt={(v) => v.toFixed(3)} />
          <Range label="Number of steps" value={steps} min={1} max={200} onChange={(v) => { setSteps(v); setAt(v) }} />
          <Range label="Noise in the data" value={noise} min={0} max={2} step={0.1} onChange={setNoise} fmt={(v) => v.toFixed(1)} />
          <Range label="Show the model after step" value={idx} min={0} max={hist.length - 1} onChange={setAt} />
          <div className="pg-row">
            {[0.01, 0.05, 0.12, 0.16].map((v) => (
              <button key={v} type="button" className={v === lr ? 'pg-chip on' : 'pg-chip'} onClick={() => { setLr(v); setAt(steps) }}>
                η = {v}
              </button>
            ))}
            <button type="button" className="pg-chip" onClick={() => setSeed((s) => s + 1)}>
              New data
            </button>
          </div>
          <div className="pg-stats" style={{ marginTop: '0.8rem' }}>
            <Stat label="step" value={idx} />
            <Stat label="w (true 2)" value={fmt(cur.w)} />
            <Stat label="b (true 1)" value={fmt(cur.b)} />
            <Stat label="MSE loss" value={fmt(cur.loss)} tone={diverged ? 'bad' : cur.loss < 1 ? 'ok' : 'warn'} />
          </div>
          <p className="pg-note">
            {diverged
              ? 'The loss is growing: each step overshoots the minimum. Lower the learning rate.'
              : lr < 0.02
                ? 'Converging, but slowly — a larger learning rate would get there in fewer steps.'
                : 'Each update is w ← w − η·∂L/∂w and b ← b − η·∂L/∂b. Steps shrink as the gradient shrinks near the minimum.'}
          </p>
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>Data and current line</h2>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Scatter plot with the fitted line">
              <line x1={PAD} y1={H - PAD} x2={W - 10} y2={H - PAD} stroke="currentColor" opacity={0.3} />
              <line x1={PAD} y1={10} x2={PAD} y2={H - PAD} stroke="currentColor" opacity={0.3} />
              <line x1={sx(0)} y1={sy(1)} x2={sx(4)} y2={sy(9)} stroke="#16a34a" strokeDasharray="5 4" opacity={0.7} />
              {data.xs.map((x, i) => (
                <circle key={i} cx={sx(x)} cy={sy(data.ys[i])} r={3.5} fill="#2563eb" />
              ))}
              {Number.isFinite(cur.w) && Number.isFinite(cur.b) ? (
                <line x1={sx(0)} y1={sy(cur.b)} x2={sx(4)} y2={sy(cur.w * 4 + cur.b)} stroke={diverged ? '#dc2626' : '#ea580c'} strokeWidth={2.5} />
              ) : null}
              <text x={W - 12} y={22} textAnchor="end" fontSize={11} fill="#16a34a">
                dashed: true line y = 2x + 1
              </text>
            </svg>
          </div>
          <div className="pg-card">
            <h2>Loss per step</h2>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Loss curve">
              <line x1={PAD} y1={H - PAD} x2={W - 10} y2={H - PAD} stroke="currentColor" opacity={0.3} />
              <line x1={PAD} y1={10} x2={PAD} y2={H - PAD} stroke="currentColor" opacity={0.3} />
              <polyline
                fill="none"
                stroke={diverged ? '#dc2626' : '#7c3aed'}
                strokeWidth={2}
                points={hist.map((h, i) => `${lx(i)},${ly(Number.isFinite(h.loss) ? h.loss : lossMax)}`).join(' ')}
              />
              <circle cx={lx(idx)} cy={ly(Number.isFinite(cur.loss) ? cur.loss : lossMax)} r={5} fill="#ea580c" />
              <text x={PAD} y={H - 12} fontSize={11} fill="currentColor" opacity={0.7}>
                step 0
              </text>
              <text x={W - 10} y={H - 12} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.7}>
                step {hist.length - 1}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
