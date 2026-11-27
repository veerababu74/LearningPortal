import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { gauss, rng, scale } from './mlMath'

type Case = { p: number; y: 0 | 1 }

function makeCases(seed: number, n: number, positiveRate: number, separation: number): Case[] {
  const r = rng(seed)
  return Array.from({ length: n }, () => {
    const y = (r() < positiveRate ? 1 : 0) as 0 | 1
    const z = (y ? separation : -separation) + gauss(r)
    return { p: 1 / (1 + Math.exp(-z)), y }
  })
}

function confusion(cases: Case[], t: number) {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  for (const c of cases) {
    const pred = c.p >= t
    if (pred && c.y) tp++
    else if (pred) fp++
    else if (c.y) fn++
    else tn++
  }
  const precision = tp + fp ? tp / (tp + fp) : 1
  const recall = tp + fn ? tp / (tp + fn) : 0
  const fpr = fp + tn ? fp / (fp + tn) : 0
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  return { tp, fp, fn, tn, precision, recall, fpr, f1, accuracy: (tp + tn) / cases.length }
}

const W = 300
const H = 260
const PAD = 30

export function ThresholdLab() {
  const [t, setT] = useState(0.5)
  const [rate, setRate] = useState(0.1)
  const [sep, setSep] = useState(1.3)
  const [costFn, setCostFn] = useState(10)
  const [seed] = useState(11)
  const cases = useMemo(() => makeCases(seed, 1000, rate, sep), [seed, rate, sep])
  const m = confusion(cases, t)
  const sweep = useMemo(() => Array.from({ length: 101 }, (_, i) => ({ t: i / 100, ...confusion(cases, i / 100) })), [cases])
  const auc = useMemo(() => {
    const pts = [...sweep].sort((a, b) => a.fpr - b.fpr || a.recall - b.recall)
    let a = 0
    for (let i = 1; i < pts.length; i++) a += (pts[i].fpr - pts[i - 1].fpr) * (pts[i].recall + pts[i - 1].recall) / 2
    return a
  }, [sweep])
  const cost = (c: ReturnType<typeof confusion>) => c.fp + costFn * c.fn
  const best = sweep.reduce((a, b) => (cost(b) < cost(a) ? b : a))
  const sx = (v: number) => scale(v, 0, 1, PAD, W - 10)
  const sy = (v: number) => scale(v, 0, 1, H - PAD, 10)

  return (
    <div className="pg">
      <PgHeader kicker="ML playground" title="Threshold & Confusion Matrix Lab">
        A classifier outputs probabilities; the threshold turns them into decisions. Drag it and watch the confusion matrix,
        precision, recall and the cost of mistakes change — then see why accuracy misleads on imbalanced data.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Settings</h2>
          <Range label="Decision threshold" value={t} min={0.01} max={0.99} step={0.01} onChange={setT} fmt={(v) => v.toFixed(2)} />
          <Range label="Positive class rate" value={rate} min={0.01} max={0.5} step={0.01} onChange={setRate} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Range label="Model quality (class separation)" value={sep} min={0.2} max={3} step={0.1} onChange={setSep} fmt={(v) => v.toFixed(1)} />
          <Range label="Cost of a missed positive (× a false alarm)" value={costFn} min={1} max={50} onChange={setCostFn} />
          <div className="pg-row">
            <button type="button" className="pg-chip" onClick={() => setT(0.5)}>
              Default 0.50
            </button>
            <button type="button" className="pg-chip on" onClick={() => setT(best.t)}>
              Cheapest threshold ({best.t.toFixed(2)})
            </button>
          </div>

          <h2 style={{ marginTop: '1rem' }}>Confusion matrix (1,000 cases)</h2>
          <div className="pg-table-wrap">
            <table className="pg-table">
              <thead>
                <tr>
                  <th />
                  <th>Predicted positive</th>
                  <th>Predicted negative</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Actually positive</th>
                  <td className="ok">TP {m.tp}</td>
                  <td className="warn">FN {m.fn}</td>
                </tr>
                <tr>
                  <th>Actually negative</th>
                  <td className="warn">FP {m.fp}</td>
                  <td>TN {m.tn}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>Metrics at threshold {t.toFixed(2)}</h2>
            <div className="pg-stats">
              <Stat label="accuracy" value={`${(m.accuracy * 100).toFixed(1)}%`} />
              <Stat label="precision" value={m.precision.toFixed(2)} />
              <Stat label="recall" value={m.recall.toFixed(2)} />
              <Stat label="F1" value={m.f1.toFixed(2)} />
              <Stat label="cost" value={cost(m)} tone={cost(m) <= cost(best) * 1.05 ? 'ok' : 'warn'} />
              <Stat label="ROC-AUC" value={auc.toFixed(3)} />
            </div>
            <p className="pg-note">
              Predicting “negative” for everyone would score {((1 - cases.filter((c) => c.y).length / cases.length) * 100).toFixed(1)}% accuracy and catch nothing
              — that is why accuracy is the wrong metric for rare positives. ROC-AUC does not depend on the threshold; precision,
              recall and cost do.
            </p>
          </div>
          <div className="pg-card">
            <h2>ROC curve and precision/recall vs threshold</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="ROC curve">
                <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="currentColor" opacity={0.25} strokeDasharray="4 4" />
                <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={[...sweep].sort((a, b) => a.fpr - b.fpr).map((s) => `${sx(s.fpr)},${sy(s.recall)}`).join(' ')} />
                <circle cx={sx(m.fpr)} cy={sy(m.recall)} r={5} fill="#ea580c" />
                <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>
                  false positive rate
                </text>
                <text x={12} y={H / 2} fontSize={11} fill="currentColor" opacity={0.7} transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">
                  recall (TPR)
                </text>
              </svg>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Precision and recall by threshold">
                <polyline fill="none" stroke="#16a34a" strokeWidth={2} points={sweep.map((s) => `${sx(s.t)},${sy(s.precision)}`).join(' ')} />
                <polyline fill="none" stroke="#dc2626" strokeWidth={2} points={sweep.map((s) => `${sx(s.t)},${sy(s.recall)}`).join(' ')} />
                <line x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(1)} stroke="#ea580c" strokeDasharray="3 3" />
                <text x={W - 12} y={20} textAnchor="end" fontSize={11} fill="#16a34a">
                  precision
                </text>
                <text x={W - 12} y={36} textAnchor="end" fontSize={11} fill="#dc2626">
                  recall
                </text>
                <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>
                  threshold
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
