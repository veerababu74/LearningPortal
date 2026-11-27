import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { fmt, gauss, mse, polyfit, polyval, rng, scale } from './mlMath'

const truth = (x: number) => Math.sin(2 * Math.PI * x)

function makeData(seed: number, n: number, noise: number) {
  const r = rng(seed)
  const pts = Array.from({ length: n }, () => {
    const x = r()
    return { x, y: truth(x) + gauss(r) * noise }
  })
  const test = Array.from({ length: 200 }, () => {
    const x = r()
    return { x, y: truth(x) + gauss(r) * noise }
  })
  return { train: pts, test }
}

const W = 460
const H = 280
const PAD = 30

export function BiasVarianceLab() {
  const [degree, setDegree] = useState(3)
  const [n, setN] = useState(15)
  const [noise, setNoise] = useState(0.25)
  const [lambdaExp, setLambdaExp] = useState(-8)
  const [seed, setSeed] = useState(3)

  const data = useMemo(() => makeData(seed, n, noise), [seed, n, noise])
  const lambda = lambdaExp <= -8 ? 0 : 10 ** lambdaExp
  const res = useMemo(() => {
    const curve = []
    for (let d = 1; d <= 12; d++) {
      const c = polyfit(data.train.map((p) => p.x), data.train.map((p) => p.y), d, lambda)
      curve.push({
        d,
        coef: c,
        train: mse(data.train.map((p) => polyval(c, p.x)), data.train.map((p) => p.y)),
        test: mse(data.test.map((p) => polyval(c, p.x)), data.test.map((p) => p.y)),
      })
    }
    return curve
  }, [data, lambda])
  const cur = res[degree - 1]
  const best = res.reduce((a, b) => (b.test < a.test ? b : a))
  const verdict =
    cur.train > 0.15 && cur.test > 0.15 ? 'underfit' : cur.test > cur.train * 3 && cur.test > best.test * 1.5 ? 'overfit' : 'good'

  const sx = (x: number) => scale(x, 0, 1, PAD, W - 10)
  const sy = (y: number) => scale(Math.max(-2, Math.min(2, y)), -2, 2, H - PAD, 10)
  const curvePts = (f: (x: number) => number) =>
    Array.from({ length: 121 }, (_, i) => i / 120)
      .map((x) => `${sx(x)},${sy(f(x))}`)
      .join(' ')

  const eMax = Math.min(2, Math.max(...res.map((r) => r.test)) * 1.05)
  const ex = (d: number) => scale(d, 1, 12, PAD, W - 10)
  const ey = (v: number) => scale(Math.min(v, eMax), 0, eMax, H - PAD, 10)

  return (
    <div className="pg">
      <PgHeader kicker="ML playground" title="Bias–Variance Lab">
        Fit polynomials of increasing degree to noisy samples of a sine wave. Watch training error keep falling while test
        error falls, bottoms out and then rises again — underfitting on the left, overfitting on the right.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Settings</h2>
          <Range label="Polynomial degree (model complexity)" value={degree} min={1} max={12} onChange={setDegree} />
          <Range label="Training points" value={n} min={8} max={80} onChange={setN} />
          <Range label="Noise" value={noise} min={0} max={0.8} step={0.05} onChange={setNoise} fmt={(v) => v.toFixed(2)} />
          <Range
            label="Ridge regularisation λ"
            value={lambdaExp}
            min={-8}
            max={1}
            step={1}
            onChange={setLambdaExp}
            fmt={(v) => (v <= -8 ? 'off' : `1e${v}`)}
          />
          <div className="pg-row">
            <button type="button" className="pg-chip" onClick={() => setSeed((s) => s + 1)}>
              Resample data
            </button>
            <button type="button" className="pg-chip" onClick={() => setDegree(best.d)}>
              Jump to best degree ({best.d})
            </button>
          </div>
          <div className="pg-stats" style={{ marginTop: '0.8rem' }}>
            <Stat label="train MSE" value={fmt(cur.train)} />
            <Stat label="test MSE" value={fmt(cur.test)} tone={verdict === 'good' ? 'ok' : 'bad'} />
            <Stat label="diagnosis" value={verdict === 'underfit' ? 'high bias' : verdict === 'overfit' ? 'high variance' : 'good fit'} tone={verdict === 'good' ? 'ok' : 'warn'} />
          </div>
          <p className="pg-note">
            {verdict === 'underfit'
              ? 'Both errors are high: the model is too simple to follow the curve. Increase the degree.'
              : verdict === 'overfit'
                ? 'Training error is tiny but test error is much higher: the curve is chasing noise. Lower the degree, add training points, or turn on ridge regularisation.'
                : 'Train and test errors are both low and close: the model captures the pattern, not the noise.'}
          </p>
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>Fit (degree {degree})</h2>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Polynomial fit">
              <polyline fill="none" stroke="#16a34a" strokeDasharray="5 4" strokeWidth={1.5} points={curvePts(truth)} />
              <polyline fill="none" stroke="#ea580c" strokeWidth={2.5} points={curvePts((x) => polyval(cur.coef, x))} />
              {data.train.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill="#2563eb" />
              ))}
              <text x={W - 12} y={20} textAnchor="end" fontSize={11} fill="#16a34a">
                dashed: true function
              </text>
            </svg>
          </div>
          <div className="pg-card">
            <h2>Error vs degree</h2>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Train and test error by degree">
              <line x1={PAD} y1={H - PAD} x2={W - 10} y2={H - PAD} stroke="currentColor" opacity={0.3} />
              <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={res.map((r) => `${ex(r.d)},${ey(r.train)}`).join(' ')} />
              <polyline fill="none" stroke="#dc2626" strokeWidth={2} points={res.map((r) => `${ex(r.d)},${ey(r.test)}`).join(' ')} />
              <line x1={ex(degree)} y1={10} x2={ex(degree)} y2={H - PAD} stroke="#ea580c" strokeDasharray="3 3" />
              {res.map((r) => (
                <text key={r.d} x={ex(r.d)} y={H - 12} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>
                  {r.d}
                </text>
              ))}
              <text x={W - 12} y={20} textAnchor="end" fontSize={11} fill="#2563eb">
                train
              </text>
              <text x={W - 12} y={36} textAnchor="end" fontSize={11} fill="#dc2626">
                test
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
