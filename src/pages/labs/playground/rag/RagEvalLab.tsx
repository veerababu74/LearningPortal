import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { mrr, ndcgAt, precisionAt, recallAt } from './ragText'

const QUESTION = 'How long do card refunds take, and can a refund go back to a gift card?'

const INITIAL = [
  { id: 'A', text: 'Shipping fees are non-refundable unless the return is due to our error.', rel: false },
  { id: 'B', text: 'Card refunds take 5 to 10 business days to appear after we receive the item.', rel: true },
  { id: 'C', text: 'You can return most items within 30 days of delivery.', rel: false },
  { id: 'D', text: 'If you paid with a gift card, the refund is added back to the same gift card immediately.', rel: true },
  { id: 'E', text: 'Gift cards themselves cannot be returned.', rel: false },
  { id: 'F', text: 'Refunds are issued to the original payment method.', rel: true },
]

const CLAIMS = [
  { text: 'Card refunds take 5–10 business days.', supported: true },
  { text: 'Gift-card payments are refunded to the same gift card.', supported: true },
  { text: 'Gift-card refunds arrive immediately.', supported: true },
  { text: 'You will also receive a 10% store credit for the delay.', supported: false },
]

export function RagEvalLab() {
  const [docs, setDocs] = useState(INITIAL)
  const [k, setK] = useState(3)
  const [totalRel, setTotalRel] = useState(4)
  const [claims, setClaims] = useState(CLAIMS)
  const [parts, setParts] = useState({ timing: true, giftcard: true })

  const relSet = useMemo(() => new Set(docs.filter((d) => d.rel).map((d) => d.id)), [docs])
  const ids = docs.map((d) => d.id)
  // ranking metrics work on ids; map letters → numbers for the helpers
  const num = ids.map((_, i) => i)
  const relNum = new Set(docs.map((d, i) => (d.rel ? i : -1)).filter((i) => i >= 0))
  const retrievedRel = relSet.size
  const effTotal = Math.max(totalRel, retrievedRel)

  const p = precisionAt(num, relNum, k)
  const r = recallAt(num, new Set([...relNum, ...Array.from({ length: effTotal - retrievedRel }, (_, i) => 100 + i)]), k)
  const m = mrr(num, relNum)
  const n = ndcgAt(docs.map((d) => (d.rel ? 1 : 0)), k, effTotal)
  // RAGAS-style context precision: mean of precision@i at each relevant position within top k
  const relPositions = docs.slice(0, k).map((d, i) => (d.rel ? i + 1 : 0)).filter(Boolean)
  const ctxPrecision = relPositions.length ? relPositions.reduce((s, pos) => s + precisionAt(num, relNum, pos), 0) / relPositions.length : 0
  const faith = claims.filter((c) => c.supported).length / claims.length
  const relevancy = (Number(parts.timing) + Number(parts.giftcard)) / 2
  const firstRel = docs.findIndex((d) => d.rel)

  const move = (i: number, dir: -1 | 1) =>
    setDocs((ds) => {
      const j = i + dir
      if (j < 0 || j >= ds.length) return ds
      const next = [...ds]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const fmt = (v: number) => v.toFixed(2)
  const tone = (v: number) => (v >= 0.8 ? 'ok' : v >= 0.5 ? 'warn' : 'bad') as 'ok' | 'warn' | 'bad'

  return (
    <div className="pg">
      <PgHeader kicker="RAG playground" title="RAG Evaluation Metrics Lab">
        Judge the retrieved chunks and the answer yourself, and watch every metric update with its formula. Reorder the
        results to see which metrics care about rank.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Question</h2>
          <p className="pg-note" style={{ marginTop: 0 }}>
            <strong>{QUESTION}</strong>
          </p>
          <h3 style={{ marginTop: '0.8rem' }}>Retrieved chunks (in rank order)</h3>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {docs.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0,1fr) auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.45rem 0.55rem',
                  borderRadius: 10,
                  border: `1px solid ${d.rel ? '#86efac' : 'var(--line)'}`,
                  background: i < k ? (d.rel ? 'var(--growth-tint)' : 'var(--paper)') : '#fff',
                  opacity: i < k ? 1 : 0.6,
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: '0.8rem' }}>
                  <input
                    type="checkbox"
                    checked={d.rel}
                    onChange={(e) => setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, rel: e.target.checked } : x)))}
                    aria-label={`Chunk ${d.id} is relevant`}
                  />
                  #{i + 1}
                </label>
                <span style={{ fontSize: '0.84rem' }}>{d.text}</span>
                <span className="pg-row" style={{ gap: 2 }}>
                  <button type="button" className="pg-chip" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" className="pg-chip" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === docs.length - 1}>
                    ↓
                  </button>
                </span>
              </div>
            ))}
          </div>
          <p className="pg-note">Tick = relevant. Faded rows are outside the top k.</p>
          <Range label="k (chunks sent to the LLM)" value={k} min={1} max={6} onChange={setK} />
          <Range label="Relevant chunks that exist in the whole index" value={totalRel} min={1} max={8} onChange={setTotalRel} />
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>Retrieval metrics @ k = {k}</h2>
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>How it is computed here</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Precision@{k}</td>
                    <td>
                      <strong>{fmt(p)}</strong>
                    </td>
                    <td>
                      relevant in top {k} / {k} = {docs.slice(0, k).filter((d) => d.rel).length} / {k}
                    </td>
                  </tr>
                  <tr>
                    <td>Recall@{k}</td>
                    <td>
                      <strong>{fmt(r)}</strong>
                    </td>
                    <td>
                      relevant in top {k} / all relevant = {docs.slice(0, k).filter((d) => d.rel).length} / {effTotal}
                    </td>
                  </tr>
                  <tr>
                    <td>MRR</td>
                    <td>
                      <strong>{fmt(m)}</strong>
                    </td>
                    <td>{firstRel >= 0 ? `1 / rank of first relevant = 1 / ${firstRel + 1}` : 'no relevant chunk → 0'}</td>
                  </tr>
                  <tr>
                    <td>nDCG@{k}</td>
                    <td>
                      <strong>{fmt(n)}</strong>
                    </td>
                    <td>Σ rel / log₂(rank + 1), divided by the best possible ordering</td>
                  </tr>
                  <tr>
                    <td>Context precision (RAGAS-style)</td>
                    <td>
                      <strong>{fmt(ctxPrecision)}</strong>
                    </td>
                    <td>mean of precision@i at each relevant position i ≤ {k}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pg-card">
            <h2>Generation metrics</h2>
            <p className="pg-note" style={{ marginTop: 0 }}>
              Answer: “{claims.map((c) => c.text).join(' ')}”
            </p>
            <p className="pg-label" style={{ marginTop: '0.6rem' }}>
              Is each claim supported by the retrieved context?
            </p>
            {claims.map((c, i) => (
              <label key={c.text} className="pg-check">
                <input
                  type="checkbox"
                  checked={c.supported}
                  onChange={(e) => setClaims((cs) => cs.map((x, j) => (j === i ? { ...x, supported: e.target.checked } : x)))}
                />
                <span>
                  {c.text}
                  {!CLAIMS[i].supported ? <small>Hint: no chunk mentions store credit — this is a hallucination.</small> : null}
                </span>
              </label>
            ))}
            <p className="pg-label" style={{ marginTop: '0.6rem' }}>
              Does the answer address each part of the question?
            </p>
            <label className="pg-check">
              <input type="checkbox" checked={parts.timing} onChange={(e) => setParts((x) => ({ ...x, timing: e.target.checked }))} />
              <span>How long card refunds take</span>
            </label>
            <label className="pg-check">
              <input type="checkbox" checked={parts.giftcard} onChange={(e) => setParts((x) => ({ ...x, giftcard: e.target.checked }))} />
              <span>Whether a refund can go to a gift card</span>
            </label>
          </div>

          <div className="pg-stats">
            <Stat label="Precision@k" value={fmt(p)} tone={tone(p)} />
            <Stat label="Recall@k" value={fmt(r)} tone={tone(r)} />
            <Stat label="MRR" value={fmt(m)} tone={tone(m)} />
            <Stat label="nDCG@k" value={fmt(n)} tone={tone(n)} />
            <Stat label="Faithfulness" value={fmt(faith)} tone={tone(faith)} />
            <Stat label="Answer relevancy" value={fmt(relevancy)} tone={tone(relevancy)} />
          </div>

          <div className="pg-card">
            <h3>Read the numbers</h3>
            <ul className="pg-insights">
              <li>Use ↑ to move the relevant chunks (B, D, F) to the top: precision@3, MRR and nDCG all reach 1.00. Then move A (not relevant) back up to #1: precision@3 drops to 0.67, MRR halves to 0.50, and nDCG shows the rank penalty.</li>
              <li>Set k to 2: precision rises but recall falls — the classic trade-off behind choosing top-k.</li>
              <li>Faithfulness is {fmt(faith)}: one invented claim (“10% store credit”) costs a quarter of the score. Faithfulness catches hallucinations; relevancy catches dodged questions.</li>
              <li>Recall needs to know <em>all</em> relevant chunks in the index — that is why golden datasets record expected chunk ids.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
