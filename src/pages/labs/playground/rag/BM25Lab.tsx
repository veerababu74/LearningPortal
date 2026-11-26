import { useMemo, useState } from 'react'
import { Check, PgHeader, Range } from '../common'
import { bm25Rank, tokenize } from './ragText'

const SAMPLE = `Refund policy for damaged items: request a refund within 30 days with proof of purchase.
Shipping policy for international orders and delivery times.
Request a refund online, then track the refund status in your account.
Privacy policy for customer data and cookies.
How to return a damaged item: print the label and drop it at a carrier.
Our refund refund refund guarantee — refunds are fast, refunds are easy, refunds for everyone, always.`

export function BM25Lab() {
  const [corpus, setCorpus] = useState(SAMPLE)
  const [query, setQuery] = useState('refund damaged item')
  const [k1, setK1] = useState(1.2)
  const [b, setB] = useState(0.75)
  const [stop, setStop] = useState(true)
  const [stem, setStem] = useState(true)

  const docs = useMemo(() => corpus.split('\n').map((d) => d.trim()).filter(Boolean), [corpus])
  const res = useMemo(() => bm25Rank(docs, query, { k1, b, stop, stem }), [docs, query, k1, b, stop, stem])
  const max = Math.max(0.0001, ...res.ranked.map((r) => r.score))

  return (
    <div className="pg">
      <PgHeader kicker="RAG playground" title="BM25 Lab">
        Edit the documents and the query, move k1 and b, and see exactly how BM25 scores each document: term frequency,
        IDF, length normalisation and each term’s contribution.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Corpus (one document per line)</h2>
          <label className="pg-field">
            <textarea value={corpus} onChange={(e) => setCorpus(e.target.value)} style={{ minHeight: 200 }} aria-label="Corpus" />
          </label>
          <label className="pg-field">
            <span>Query</span>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="pg-row" style={{ marginBottom: '0.6rem' }}>
            {['refund damaged item', 'privacy cookies', 'refund', 'international delivery'].map((q) => (
              <button key={q} type="button" className={q === query ? 'pg-chip on' : 'pg-chip'} onClick={() => setQuery(q)}>
                {q}
              </button>
            ))}
          </div>
          <Range label="k1 — term-frequency saturation" value={k1} min={0} max={3} step={0.1} onChange={setK1} fmt={(v) => v.toFixed(1)} />
          <Range label="b — length normalisation" value={b} min={0} max={1} step={0.05} onChange={setB} fmt={(v) => v.toFixed(2)} />
          <Check label="Remove stop words" hint="the, a, for, and, …" checked={stop} onChange={setStop} />
          <Check label="Light stemming" hint="refunds → refund, items → item" checked={stem} onChange={setStem} />
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>Query terms and IDF</h2>
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>df (docs containing it)</th>
                    <th>IDF</th>
                  </tr>
                </thead>
                <tbody>
                  {res.terms.map((t) => (
                    <tr key={t.term} className={t.df === 0 ? 'warn' : ''}>
                      <td>
                        <code>{t.term}</code>
                      </td>
                      <td>
                        {t.df} / {docs.length}
                      </td>
                      <td>{t.idf.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pg-note">
              IDF = ln((N − df + 0.5) / (df + 0.5) + 1), N = {docs.length}, average length = {res.avgdl.toFixed(1)} tokens.
              {res.terms.some((t) => t.df === 0) ? ' Terms with df = 0 match nothing — check spelling or stemming.' : ''}
            </p>
          </div>

          <div className="pg-card">
            <h2>Ranking</h2>
            <div className="pg-bars">
              {res.ranked.map((r, i) => (
                <div key={r.index} className={i === 0 && r.score > 0 ? 'pg-bar top' : 'pg-bar'}>
                  <span>
                    #{i + 1} doc {r.index + 1}
                  </span>
                  <div className="pg-bar-track">
                    <i style={{ width: `${(r.score / max) * 100}%` }} />
                  </div>
                  <span>{r.score.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pg-card">
            <h2>Per-document breakdown</h2>
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead>
                  <tr>
                    <th>Doc</th>
                    <th>Length</th>
                    {res.terms.map((t) => (
                      <th key={t.term}>
                        {t.term}
                        <br />
                        <small>tf → contribution</small>
                      </th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {res.ranked.map((r) => (
                    <tr key={r.index}>
                      <td title={docs[r.index]}>
                        <strong>doc {r.index + 1}</strong>
                        <br />
                        <small>{docs[r.index].slice(0, 46)}…</small>
                      </td>
                      <td>{r.len}</td>
                      {r.parts.map((p) => (
                        <td key={p.term}>{p.tf ? `${p.tf} → ${p.contrib.toFixed(3)}` : '—'}</td>
                      ))}
                      <td>
                        <strong>{r.score.toFixed(3)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="pg-insights" style={{ marginTop: '0.7rem' }}>
              <li>Doc 6 repeats “refund” many times. Set k1 to 3 and watch it climb; set k1 to 0.5 and repetition stops mattering.</li>
              <li>Set b to 0 to stop penalising long documents; set it to 1 for full length normalisation.</li>
              <li>Turn stemming off: “refunds” and “items” stop matching “refund” and “item”.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
