import { useMemo, useState } from 'react'
import { Check, PgHeader, Range } from '../common'
import { bm25Rank, cosine, mrr, recallAt, rrf, toyEmbed } from './ragText'

const DOCS = [
  'Refund policy: you can request a refund within 30 days of delivery.',
  'Money back guarantee — if you are unhappy we reimburse the full price.',
  'Error E-4012 means the payment provider declined the card; retry or use another card.',
  'Shipping delays: international parcels can take 10 to 15 days to arrive.',
  'Damaged items: report broken or defective products within 48 hours for a replacement.',
  'Reset your password from the login page using the Forgot password link.',
  'Charged twice? Duplicate card charges are reversed automatically within 5 days.',
  'Privacy: request deletion of your personal data under GDPR.',
  'Track your parcel with the tracking number in your shipping email.',
  'Warranty covers manufacturing defects for one year; we repair or replace the item.',
]

const QUERIES = [
  { q: 'can I get my money back', rel: [0, 1], note: 'Paraphrase: “money back” ≈ refund. Dense search shines.' },
  { q: 'E-4012', rel: [2], note: 'An exact error code: BM25 finds it; a meaning model has no idea what “E-4012” means. Fusion rescues it.' },
  { q: 'my parcel is late', rel: [3, 8], note: 'Mixed: “parcel” matches lexically, “late” only by meaning.' },
  { q: 'broken product replacement', rel: [4, 9], note: 'Two relevant docs with different wording.' },
  { q: 'I was billed two times', rel: [6], note: 'No shared keywords with the answer at all.' },
]

type Mode = 'rrf' | 'weighted'

export function HybridRetrievalLab() {
  const [qi, setQi] = useState(0)
  const [custom, setCustom] = useState('')
  const [mode, setMode] = useState<Mode>('rrf')
  const [k, setK] = useState(60)
  const [alpha, setAlpha] = useState(0.5)
  const [rerank, setRerank] = useState(false)
  const query = custom || QUERIES[qi].q
  const relevant = useMemo(() => new Set(custom ? [] : QUERIES[qi].rel), [custom, qi])

  const r = useMemo(() => {
    const bm = bm25Rank(DOCS, query)
    const bmIds = bm.ranked.filter((x) => x.score > 0).map((x) => x.index)
    const bmScore = new Map(bm.ranked.map((x) => [x.index, x.score]))
    const qv = toyEmbed(query)
    const dense = DOCS.map((d, i) => ({ i, s: cosine(qv, toyEmbed(d)) })).sort((a, b) => b.s - a.s)
    const denseIds = dense.filter((x) => x.s > 0).map((x) => x.i)
    const denseScore = new Map(dense.map((x) => [x.i, x.s]))

    let fused: { i: number; s: number }[]
    if (mode === 'rrf') fused = rrf([bmIds, denseIds], k).map(([i, s]) => ({ i, s }))
    else {
      const maxB = Math.max(0.0001, ...bmScore.values())
      fused = DOCS.map((_, i) => ({ i, s: alpha * (denseScore.get(i) || 0) + (1 - alpha) * ((bmScore.get(i) || 0) / maxB) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
    }
    let final = fused
    if (rerank) {
      // simulated cross-encoder: reads query and doc together → rewards covering every query concept and term
      const qConcepts = qv.map((v) => v > 0)
      final = fused.slice(0, 6).map(({ i }) => {
        const dv = toyEmbed(DOCS[i])
        const coverage = qConcepts.filter(Boolean).length ? qConcepts.filter((c, j) => c && dv[j] > 0).length / qConcepts.filter(Boolean).length : 0
        const lex = (bmScore.get(i) || 0) > 0 ? 0.3 : 0
        return { i, s: coverage + lex + 0.2 * (denseScore.get(i) || 0) }
      }).sort((a, b) => b.s - a.s)
    }
    return { bm: bmIds.map((i) => ({ i, s: bmScore.get(i) || 0 })), dense: dense.filter((x) => x.s > 0).map((x) => ({ i: x.i, s: x.s })), final }
  }, [query, mode, k, alpha, rerank])

  const cols = [
    { title: 'BM25 (keywords)', list: r.bm, fmt: (s: number) => s.toFixed(2) },
    { title: 'Dense (meaning)', list: r.dense, fmt: (s: number) => s.toFixed(2) },
    { title: rerank ? 'Fused + reranked' : mode === 'rrf' ? `RRF fusion (k=${k})` : `Weighted (α=${alpha.toFixed(2)})`, list: r.final, fmt: (s: number) => s.toFixed(3) },
  ]

  return (
    <div className="pg">
      <PgHeader kicker="RAG playground" title="Hybrid Retrieval Lab">
        Run the same query through keyword search (BM25) and meaning-based search, fuse them, and optionally rerank.
        Relevant documents are marked green, with recall@3 and MRR for every list. (Dense scores use a small built-in
        synonym model so the lab runs in your browser.)
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Query</h2>
          <div className="pg-row" style={{ marginBottom: '0.4rem' }}>
            {QUERIES.map((q, i) => (
              <button
                key={q.q}
                type="button"
                className={!custom && i === qi ? 'pg-chip on' : 'pg-chip'}
                onClick={() => {
                  setCustom('')
                  setQi(i)
                }}
              >
                {q.q}
              </button>
            ))}
          </div>
          {!custom ? <p className="pg-note">{QUERIES[qi].note}</p> : null}
          <label className="pg-field" style={{ marginTop: '0.5rem' }}>
            <span>Or type your own</span>
            <input type="text" value={custom} placeholder="e.g. reset login" onChange={(e) => setCustom(e.target.value)} />
          </label>
          <h3>Fusion</h3>
          <div className="pg-row" style={{ marginBottom: '0.5rem' }}>
            <button type="button" className={mode === 'rrf' ? 'pg-chip on' : 'pg-chip'} onClick={() => setMode('rrf')}>
              Reciprocal Rank Fusion
            </button>
            <button type="button" className={mode === 'weighted' ? 'pg-chip on' : 'pg-chip'} onClick={() => setMode('weighted')}>
              Weighted scores
            </button>
          </div>
          {mode === 'rrf' ? (
            <Range label="RRF k" value={k} min={1} max={100} onChange={setK} />
          ) : (
            <Range label="α — weight of dense vs BM25" value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} fmt={(v) => v.toFixed(2)} />
          )}
          <Check label="Rerank the top 6" hint="simulated cross-encoder: reads query + document together" checked={rerank} onChange={setRerank} />
          <h3 style={{ marginTop: '0.6rem' }}>Documents</h3>
          <ol className="pg-insights" style={{ fontSize: '0.82rem' }} start={0}>
            {DOCS.map((d, i) => (
              <li key={i} style={relevant.has(i) ? { color: 'var(--growth-deep)', fontWeight: 700 } : undefined}>
                {d}
              </li>
            ))}
          </ol>
        </div>

        <div className="pg-stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.8rem' }}>
            {cols.map((c) => {
              const ids = c.list.map((x) => x.i)
              return (
                <div key={c.title} className="pg-card">
                  <h3>{c.title}</h3>
                  {relevant.size ? (
                    <p className="pg-note" style={{ marginTop: 0 }}>
                      recall@3 <strong>{recallAt(ids, relevant, 3).toFixed(2)}</strong> · MRR <strong>{mrr(ids, relevant).toFixed(2)}</strong>
                    </p>
                  ) : null}
                  <ol className="pg-timeline">
                    {c.list.slice(0, 5).map((x, i) => (
                      <li key={x.i} className={relevant.has(x.i) ? 'done' : ''} style={{ gridTemplateColumns: '1.6rem minmax(0,1fr) auto' }}>
                        <span className="n">#{i + 1}</span>
                        <span style={{ fontSize: '0.8rem' }}>
                          <strong>doc {x.i}</strong> {DOCS[x.i].slice(0, 42)}…
                        </span>
                        <span className="pg-tl-meta">{c.fmt(x.s)}</span>
                      </li>
                    ))}
                    {!c.list.length ? <li className="bad" style={{ gridTemplateColumns: '1fr' }}>No matches at all</li> : null}
                  </ol>
                </div>
              )
            })}
          </div>
          <div className="pg-card">
            <h3>What to notice</h3>
            <ul className="pg-insights">
              <li>“E-4012”: only BM25 finds it. “I was billed two times”: only dense search finds it. Fusion gets both right — that is the case for hybrid search.</li>
              <li>RRF uses ranks only, so it never needs BM25 scores and cosine similarities on the same scale. Weighted fusion does, and α needs tuning per corpus.</li>
              <li>A small k in RRF trusts the top of each list more; a large k flattens the differences.</li>
              <li>Reranking only reorders what retrieval found — it cannot recover a document that neither retriever returned.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
