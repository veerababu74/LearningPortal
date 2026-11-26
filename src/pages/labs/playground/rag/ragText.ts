/** Small, dependency-free text tools for the RAG labs (tokenising, BM25, chunking, toy dense vectors, metrics). */

const STOP = new Set(
  'a an the and or for of to in on at by with from is are was were be been it its this that these those as your you our we i my me do does how what when where which who why can will just then into than about'.split(' '),
)

export function stemWord(w: string) {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`
  if (w.length > 4 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 3 && w.endsWith('ed')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

export function tokenize(text: string, opts: { stop?: boolean; stem?: boolean } = {}) {
  const { stop = true, stem = true } = opts
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((w) => w && (!stop || !STOP.has(w)))
    .map((w) => (stem ? stemWord(w) : w))
}

export type BM25Result = {
  avgdl: number
  terms: { term: string; df: number; idf: number }[]
  ranked: { index: number; len: number; score: number; parts: { term: string; tf: number; contrib: number }[] }[]
}

export function bm25Rank(docs: string[], query: string, o: { k1?: number; b?: number; stop?: boolean; stem?: boolean } = {}): BM25Result {
  const { k1 = 1.2, b = 0.75 } = o
  const toks = docs.map((d) => tokenize(d, o))
  const N = Math.max(1, docs.length)
  const avgdl = toks.reduce((n, t) => n + t.length, 0) / N || 1
  const qTerms = [...new Set(tokenize(query, o))]
  const terms = qTerms.map((term) => {
    const df = toks.filter((t) => t.includes(term)).length
    return { term, df, idf: Math.log((N - df + 0.5) / (df + 0.5) + 1) }
  })
  const ranked = toks
    .map((t, index) => {
      const len = t.length
      const norm = 1 - b + b * (len / avgdl)
      const parts = terms.map(({ term, idf }) => {
        const tf = t.filter((x) => x === term).length
        const contrib = tf ? (idf * (tf * (k1 + 1))) / (tf + k1 * norm) : 0
        return { term, tf, contrib }
      })
      return { index, len, parts, score: parts.reduce((n, p) => n + p.contrib, 0) }
    })
    .sort((a, b2) => b2.score - a.score || a.index - b2.index)
  return { avgdl, terms, ranked }
}

/* ------------------------------------------------------------------ toy "dense" vectors
   Words map to concepts so paraphrases land near each other — enough to show what embeddings add. */
const CONCEPTS: Record<string, string[]> = {
  refund: ['refund', 'money', 'reimburse', 'reimbursement', 'chargeback', 'repay', 'payback'],
  return: ['return', 'send', 'exchange', 'rma', 'label'],
  damage: ['damage', 'damaged', 'broken', 'defect', 'defective', 'crack', 'cracked', 'faulty'],
  delivery: ['delivery', 'shipping', 'ship', 'shipment', 'courier', 'carrier', 'arrive', 'late', 'delay', 'tracking', 'track', 'parcel'],
  account: ['account', 'password', 'login', 'sign', 'reset', 'username', 'locked', 'credential'],
  privacy: ['privacy', 'data', 'gdpr', 'cookie', 'personal', 'delete', 'erase', 'consent'],
  payment: ['payment', 'card', 'charge', 'charged', 'invoice', 'billing', 'bill', 'pay', 'twice', 'double'],
  time: ['day', 'days', 'week', 'within', 'deadline', 'period', 'window', 'hours'],
  error: ['error', 'code', 'fail', 'failed', 'failure', 'bug', 'crash', 'e-4012', 'e4012'],
  warranty: ['warranty', 'guarantee', 'repair', 'replace', 'replacement'],
}
const CONCEPT_KEYS = Object.keys(CONCEPTS)
const WORD_TO_CONCEPT = new Map<string, string>()
for (const [c, words] of Object.entries(CONCEPTS)) for (const w of words) WORD_TO_CONCEPT.set(stemWord(w), c)

export function toyEmbed(text: string) {
  const v = CONCEPT_KEYS.map(() => 0)
  for (const w of tokenize(text)) {
    const c = WORD_TO_CONCEPT.get(w)
    if (c) v[CONCEPT_KEYS.indexOf(c)] += 1
  }
  return v
}

export function cosine(a: number[], b: number[]) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

/* ------------------------------------------------------------------ fusion + metrics */

export function rrf(rankings: number[][], k = 60) {
  const scores = new Map<number, number>()
  for (const r of rankings) r.forEach((id, i) => scores.set(id, (scores.get(id) || 0) + 1 / (k + i + 1)))
  return [...scores.entries()].sort((a, b) => b[1] - a[1])
}

export function recallAt(ranked: number[], relevant: Set<number>, k: number) {
  if (!relevant.size) return 0
  return ranked.slice(0, k).filter((d) => relevant.has(d)).length / relevant.size
}

export function precisionAt(ranked: number[], relevant: Set<number>, k: number) {
  const top = ranked.slice(0, k)
  return top.length ? top.filter((d) => relevant.has(d)).length / top.length : 0
}

export function mrr(ranked: number[], relevant: Set<number>) {
  const i = ranked.findIndex((d) => relevant.has(d))
  return i < 0 ? 0 : 1 / (i + 1)
}

export function ndcgAt(rels: number[], k: number, totalRelevant: number) {
  const dcg = rels.slice(0, k).reduce((s, r, i) => s + r / Math.log2(i + 2), 0)
  const ideal = Array.from({ length: Math.min(k, totalRelevant) }, () => 1).reduce((s, r, i) => s + r / Math.log2(i + 2), 0)
  return ideal ? dcg / ideal : 0
}

/* ------------------------------------------------------------------ chunking */

export type Chunk = { text: string; start: number; end: number }

export function splitSentences(text: string) {
  const out: Chunk[] = []
  const re = /[^.!?\n]+(?:[.!?]+|\n|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const t = m[0]
    if (t.trim()) out.push({ text: t.trim(), start: m.index, end: m.index + t.length })
    if (m.index === re.lastIndex) re.lastIndex++
  }
  return out
}

export function fixedChunks(text: string, size: number, overlap: number): Chunk[] {
  const out: Chunk[] = []
  const step = Math.max(1, size - overlap)
  for (let i = 0; i < text.length; i += step) {
    out.push({ text: text.slice(i, i + size), start: i, end: Math.min(text.length, i + size) })
    if (i + size >= text.length) break
  }
  return out
}

/** Paragraphs first, then sentences, then words — merged greedily up to `size` characters. */
export function recursiveChunks(text: string, size: number, overlap: number): Chunk[] {
  const pieces: Chunk[] = []
  const pushPiece = (t: string, start: number) => {
    if (t.length <= size) {
      if (t.trim()) pieces.push({ text: t, start, end: start + t.length })
      return
    }
    const sents = splitSentences(t)
    if (sents.length > 1) {
      for (const s of sents) pushPiece(t.slice(s.start, s.end), start + s.start)
      return
    }
    let off = 0
    for (const w of t.split(/(\s+)/)) {
      if (w) pieces.push({ text: w, start: start + off, end: start + off + w.length })
      off += w.length
    }
  }
  let pos = 0
  for (const para of text.split(/(\n\s*\n)/)) {
    if (para.trim()) pushPiece(para, pos)
    pos += para.length
  }
  return mergePieces(pieces, size, overlap, text)
}

export function sentenceChunks(text: string, size: number, overlap: number): Chunk[] {
  return mergePieces(splitSentences(text), size, overlap, text)
}

/** Pack pieces into chunks of at most `size` characters. Overlap repeats whole trailing pieces
    (never a fragment), as long as they fit in the `overlap` budget. */
function mergePieces(pieces: Chunk[], size: number, overlap: number, text: string): Chunk[] {
  const out: Chunk[] = []
  let cur: Chunk[] = []
  const span = (ps: Chunk[]) => (ps.length ? ps[ps.length - 1].end - ps[0].start : 0)
  const flush = () => {
    if (!cur.length) return
    const start = cur[0].start
    const end = cur[cur.length - 1].end
    out.push({ text: text.slice(start, end).trim(), start, end })
    // carry trailing pieces that fit in the overlap budget
    const carry: Chunk[] = []
    for (let i = cur.length - 1; i > 0; i--) {
      if (span([cur[i], ...carry]) > overlap) break
      carry.unshift(cur[i])
    }
    cur = carry
  }
  for (const p of pieces) {
    if (cur.length && span([...cur, p]) > size) flush()
    // a carried overlap that no longer leaves room for the new piece is dropped
    if (cur.length && span([...cur, p]) > size) cur = []
    cur.push(p)
  }
  if (cur.length) {
    const start = cur[0].start
    const end = cur[cur.length - 1].end
    const last = out[out.length - 1]
    if (!last || end > last.end) out.push({ text: text.slice(start, end).trim(), start, end })
  }
  return out
}

/** A chunk "breaks" a sentence if it starts or ends in the middle of one. */
export function brokenSentences(chunks: Chunk[], text: string) {
  const sents = splitSentences(text)
  const inside = (pos: number) => sents.some((s) => pos > s.start + 1 && pos < s.end - 1)
  return chunks.filter((c) => inside(c.start) || inside(c.end)).length
}
