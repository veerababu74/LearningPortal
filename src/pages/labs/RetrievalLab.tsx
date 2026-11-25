import { useMemo, useState } from 'react'
import './LabShared.css'

const DOCS = ['policy-leave', 'benefits-faq', 'security-acl', 'onboarding', 'incident-runbook']

function ranks(seed: number) {
  return [...DOCS]
    .map((id, i) => ({ id, score: ((seed * (i + 3)) % 17) + 3 }))
    .sort((a, b) => b.score - a.score)
}

function rrf(dense: { id: string }[], sparse: { id: string }[], k = 60) {
  const scores = new Map<string, number>()
  dense.forEach((d, i) => scores.set(d.id, (scores.get(d.id) || 0) + 1 / (k + i + 1)))
  sparse.forEach((d, i) => scores.set(d.id, (scores.get(d.id) || 0) + 1 / (k + i + 1)))
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

export function RetrievalLab() {
  const [step, setStep] = useState(0)
  const dense = useMemo(() => ranks(5), [])
  const sparse = useMemo(() => ranks(9), [])
  const fused = useMemo(() => rrf(dense, sparse), [dense, sparse])
  const steps = ['Query', 'Dense', 'Sparse', 'RRF fusion']

  const shown = step === 1 ? dense : step === 2 ? sparse : step === 3 ? fused : []

  return (
    <div className="lab">
      <h1>Hybrid retrieval lab</h1>
      <p className="lede">
        Dense search finds meaning. Sparse/BM25 finds keywords. Reciprocal Rank Fusion merges both
        rankings.
      </p>
      <div className="lab-panel">
        <div className="step-list">
          {steps.map((s, i) => (
            <button
              key={s}
              type="button"
              className={i === step ? 'step-chip active' : 'step-chip'}
              onClick={() => setStep(i)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="viz-box">
          {step === 0 ? (
            <p>Query: “What is the maternity leave policy?”</p>
          ) : (
            shown.map((d) => (
              <div key={d.id} className="rank-row">
                <span>{d.id}</span>
                <div
                  className="rank-bar"
                  style={{
                    width: `${Math.min(100, ('score' in d ? Number(d.score) : 0) * (step === 3 ? 400 : 5))}%`,
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
