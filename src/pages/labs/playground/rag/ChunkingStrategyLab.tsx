import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from '../common'
import { bm25Rank, brokenSentences, fixedChunks, recursiveChunks, sentenceChunks, splitSentences, type Chunk } from './ragText'

const DOC = `Returns and Refunds Policy

You can return most items within 30 days of delivery. Items must be unused and in their original packaging. To start a return, open your order and choose "Return item". We email a prepaid shipping label within one business day.

Refunds are issued to the original payment method. Card refunds take 5 to 10 business days to appear on your statement after we receive the item. If you paid with a gift card, the refund is added back to the same gift card immediately.

Damaged or defective items are handled differently. Report the damage within 48 hours of delivery and attach a photo. We send a replacement at no cost, or a full refund if the item is out of stock. You do not need to return a damaged item worth less than $20.

Final-sale items, gift cards and personalised products cannot be returned. Shipping fees are non-refundable unless the return is due to our error.`

const QUESTIONS = [
  { q: 'How long do card refunds take?', answer: '5 to 10 business days' },
  { q: 'What do I do with a damaged item?', answer: 'within 48 hours of delivery and attach a photo' },
  { q: 'Can I return a gift card?', answer: 'gift cards and personalised products cannot be returned' },
  { q: 'Are shipping fees refunded?', answer: 'Shipping fees are non-refundable unless the return is due to our error' },
]

type Strategy = 'fixed' | 'recursive' | 'sentence' | 'window'
const STRATEGIES: { id: Strategy; label: string; text: string }[] = [
  { id: 'fixed', label: 'Fixed size', text: 'Cut every N characters. Simple and predictable, but cuts through words and sentences.' },
  { id: 'recursive', label: 'Recursive', text: 'Split by paragraph, then sentence, then word, merging pieces up to N characters. The usual default.' },
  { id: 'sentence', label: 'Sentence-based', text: 'Never split a sentence; pack whole sentences up to N characters.' },
  { id: 'window', label: 'Sliding window', text: 'Windows of W sentences moving S sentences at a time — heavy overlap, high recall, more chunks.' },
]

function windowChunks(text: string, w: number, stride: number): Chunk[] {
  const s = splitSentences(text)
  const out: Chunk[] = []
  for (let i = 0; i < s.length; i += stride) {
    const part = s.slice(i, i + w)
    out.push({ text: part.map((x) => x.text).join(' '), start: part[0].start, end: part[part.length - 1].end })
    if (i + w >= s.length) break
  }
  return out
}

const COLORS = ['#ede9fe', '#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0f2fe']

export function ChunkingStrategyLab() {
  const [text, setText] = useState(DOC)
  const [strategy, setStrategy] = useState<Strategy>('recursive')
  const [size, setSize] = useState(300)
  const [overlap, setOverlap] = useState(40)
  const [win, setWin] = useState(3)
  const [stride, setStride] = useState(2)
  const [qi, setQi] = useState(0)
  const [custom, setCustom] = useState('')
  const question = custom || QUESTIONS[qi].q
  const answer = custom ? '' : QUESTIONS[qi].answer

  const chunks = useMemo(() => {
    if (strategy === 'fixed') return fixedChunks(text, size, Math.min(overlap, size - 10))
    if (strategy === 'recursive') return recursiveChunks(text, size, overlap)
    if (strategy === 'sentence') return sentenceChunks(text, size, overlap)
    return windowChunks(text, win, Math.min(stride, win))
  }, [text, strategy, size, overlap, win, stride])

  const ranking = useMemo(() => bm25Rank(chunks.map((c) => c.text), question), [chunks, question])
  const top = ranking.ranked[0]
  const topIdx = top && top.score > 0 ? top.index : -1
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
  const hit = topIdx >= 0 && answer ? norm(chunks[topIdx].text).includes(norm(answer)) : null
  const anyHas = answer ? chunks.some((c) => norm(c.text).includes(norm(answer))) : null
  const broken = brokenSentences(chunks, text)
  const avg = chunks.length ? Math.round(chunks.reduce((n, c) => n + c.text.length, 0) / chunks.length) : 0
  const stored = chunks.reduce((n, c) => n + c.text.length, 0)

  return (
    <div className="pg">
      <PgHeader kicker="RAG playground" title="Chunking Strategy Lab">
        Chunk a real policy document four different ways, then ask a question. You see the chunks, which one BM25
        retrieves, and whether that chunk actually contains the whole answer.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Strategy</h2>
          <div className="pg-row" style={{ marginBottom: '0.5rem' }}>
            {STRATEGIES.map((s) => (
              <button key={s.id} type="button" className={s.id === strategy ? 'pg-chip on' : 'pg-chip'} onClick={() => setStrategy(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="pg-note">{STRATEGIES.find((s) => s.id === strategy)!.text}</p>
          <div style={{ marginTop: '0.7rem' }}>
            {strategy === 'window' ? (
              <>
                <Range label="Window (sentences)" value={win} min={1} max={6} onChange={setWin} />
                <Range label="Stride (sentences)" value={stride} min={1} max={6} onChange={setStride} />
              </>
            ) : (
              <>
                <Range label="Chunk size (characters)" value={size} min={80} max={900} step={20} onChange={setSize} />
                <Range label="Overlap (characters)" value={overlap} min={0} max={200} step={10} onChange={setOverlap} />
              </>
            )}
          </div>
          <h3 style={{ marginTop: '0.6rem' }}>Question</h3>
          <div className="pg-row" style={{ marginBottom: '0.5rem' }}>
            {QUESTIONS.map((q, i) => (
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
          <label className="pg-field">
            <span>Or type your own</span>
            <input type="text" value={custom} placeholder="e.g. how do I start a return?" onChange={(e) => setCustom(e.target.value)} />
          </label>
          <label className="pg-field">
            <span>Document (editable)</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 160 }} />
          </label>
        </div>

        <div className="pg-stack">
          <div className="pg-stats">
            <Stat label="Chunks" value={chunks.length} />
            <Stat label="Avg size" value={`${avg} chars`} />
            <Stat label="Cut mid-sentence" value={broken} tone={broken ? 'warn' : 'ok'} />
            <Stat label="Stored vs original" value={`${Math.round((stored / Math.max(1, text.length)) * 100)}%`} tone={stored > text.length * 1.4 ? 'warn' : undefined} />
          </div>

          {answer ? (
            <div className={`pg-banner ${hit ? 'ok' : anyHas ? 'warn' : 'bad'}`}>
              {hit
                ? 'The retrieved chunk contains the full answer'
                : anyHas
                  ? 'The answer exists in a chunk — but not the one retrieved first'
                  : 'No single chunk contains the whole answer (it was split)'}
              <p>Expected: “{answer}”.</p>
            </div>
          ) : null}

          <div className="pg-card">
            <h2>Chunks — the highlighted one is retrieved first for “{question}”</h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {chunks.map((c, i) => {
                const isTop = i === topIdx
                const has = answer && norm(c.text).includes(norm(answer))
                return (
                  <div
                    key={i}
                    style={{
                      background: COLORS[i % COLORS.length],
                      border: isTop ? '3px solid #7c3aed' : '1px solid var(--line)',
                      borderRadius: 10,
                      padding: '0.5rem 0.65rem',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ink-muted)', marginBottom: 4 }}>
                      <span>chunk {i + 1}</span>
                      <span>{c.text.length} chars</span>
                      <span>BM25 {(ranking.ranked.find((r) => r.index === i)?.score || 0).toFixed(2)}</span>
                      {isTop ? <span style={{ color: '#7c3aed' }}>◀ retrieved</span> : null}
                      {has ? <span style={{ color: 'var(--growth-deep)' }}>✓ contains answer</span> : null}
                    </div>
                    {c.text}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pg-card">
            <h3>Try this</h3>
            <ul className="pg-insights">
              <li>Fixed size at 120 characters: count the chunks cut mid-sentence, then switch to sentence-based.</li>
              <li>Fixed size at 120 characters with 0 overlap: “What do I do with a damaged item?” loses its answer across two chunks. Switch to sentence-based and it stays whole.</li>
              <li>Sliding window with stride 1 always contains the answer but stores the text several times over.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
