/**
 * Structured extraction for the LLM Security, LLM Gateways and Production Failures roadmaps.
 *
 * The roadmap files are long chat exports that mix several courses, repeat batches across files and
 * number concepts inconsistently ("# Concept 14." vs "# 16." vs "## 1. Rate Limiting"). The old regex
 * splitting also matched "# comments" inside code blocks. This module:
 *   - splits only at real headings (outside code fences),
 *   - turns every concept / topic into one whole lesson, keyed per course so numbers never collide,
 *   - keeps the longest copy when a concept appears in several files,
 *   - gathers each batch's revision / comparison / checklist / assessment sections into one
 *     "Batch N — revision & practice" lesson placed after that batch,
 *   - drops navigation: progress trackers, "Next batch" teasers, banners and roadmaps.
 */
import { headingsOf, proseLength, repairFences } from './course-kit.mjs'

const REVIEW =
  /revision|assessment|knowledge check|interview questions|comparison|compar|differ|checklist|cheat ?sheet|work together|connect|important concepts to remember|practical understanding|how these|final production architecture|production architecture|practical assessment|final assessment|bringing all|^important:/i
const SKIP =
  /^(next( batch)?\b|progress|overall learning progress|\d+\s*\/\s*\d+$|\d+\s*\/\s*\d+\s+concepts|every concept includes|complete roadmap|master roadmap|first, understand|.*complete learning roadmap|.*masterclass$|.*visual handbook|.*pdf masterclass|module \d+ complete|.*module \d+\s*[—–-]\s*llm gateway engineering$|llm gateway roadmap|production-grade genai|genai, agentic ai & multi-agent systems|\d+\.\s*complete production problems roadmap|llm security & llm gateways)/i

const BATCH = /^(?:llm gateway engineering\s*[—–-]\s*)?batch\s+(\d+)(?:\s*[—–:-]\s*(.+))?$/i

/** Slice of `md` from the first heading matching `from` up to the first heading matching `to`. */
export function region(md, from, to) {
  const src = repairFences(md)
  const heads = headingsOf(src)
  const lines = src.split('\n')
  const a = from ? heads.find((h) => from.test(h.title)) : null
  const start = a ? a.idx : 0
  const b = to ? heads.find((h) => h.idx > start && to.test(h.title)) : null
  return lines.slice(start, b ? b.idx : lines.length).join('\n')
}

/**
 * Segment a course region into concepts, batch intros and batch reviews.
 *   conceptAt(head) → { key, num, title } | null   decides which headings start a concept / topic
 */
export function segmentCourse(md, { conceptAt, maxLevel = 2, batchOfConcept, keyOf }) {
  const src = repairFences(md)
  const lines = src.split('\n')
  const heads = headingsOf(src).filter((h) => !h.banner && h.level <= Math.max(maxLevel, 3))

  // classify every heading; only classified ones become boundaries
  const marks = []
  for (const h of heads) {
    const t = h.title
    if (h.level <= maxLevel && SKIP.test(t)) {
      marks.push({ h, type: 'skip' })
      continue
    }
    const c = conceptAt(h)
    if (c) {
      marks.push({ h, type: 'concept', ...c })
      continue
    }
    const b = h.level <= maxLevel ? t.match(BATCH) : null
    if (b) {
      marks.push({ h, type: REVIEW.test(b[2] || '') ? 'review' : 'batch', batch: Number(b[1]), title: t })
      continue
    }
    if (h.level <= maxLevel && REVIEW.test(t)) marks.push({ h, type: 'review', title: t })
    else if (h.level === 1) marks.push({ h, type: 'skip-maybe', title: t })
  }

  const concepts = new Map()
  const reviews = new Map()
  const intros = new Map()
  const batchTitles = new Map()
  let batch = 0
  marks.forEach((m, i) => {
    // unknown H1 lines ("# 15 min") are content, not boundaries: extend the previous segment over them
    if (m.type === 'skip-maybe') return
    let j = i + 1
    while (j < marks.length && marks[j].type === 'skip-maybe' && m.type !== 'skip') j++
    const end = j < marks.length ? marks[j].h.idx : lines.length
    const body = lines.slice(m.h.idx + 1, end).join('\n').trim()
    if (m.type === 'batch') {
      batch = m.batch
      const bt = m.h.title.match(BATCH)?.[2]
      if (bt) batchTitles.set(batch, bt.trim())
      if (proseLength(body) > 400) intros.set(batch, body)
    } else if (m.type === 'review') {
      const b = m.batch || batch
      if (m.batch) batch = m.batch
      if (proseLength(body) > 150 || /```|\|/.test(body)) reviews.set(b, [...(reviews.get(b) || []), { title: m.h.title, body }])
    } else if (m.type === 'concept') {
      if (batchOfConcept) batch = batchOfConcept(m.num, batch)
      const key = keyOf ? keyOf(m, batch) : m.key
      const prev = concepts.get(key)
      if (!prev || body.length > prev.body.length) concepts.set(key, { key, num: m.num, title: m.title, body, batch })
    }
  })
  return { concepts, reviews, intros, batchTitles }
}

/** Merge segmentations from several files (longest copy of each concept / review wins). */
export function mergeCourses(...parts) {
  const out = { concepts: new Map(), reviews: new Map(), intros: new Map(), batchTitles: new Map() }
  for (const p of parts) {
    for (const [k, c] of p.concepts) {
      const prev = out.concepts.get(k)
      if (!prev || c.body.length > prev.body.length) out.concepts.set(k, c)
    }
    for (const [b, list] of p.reviews) {
      const prev = out.reviews.get(b) || []
      const len = (l) => l.reduce((n, x) => n + x.body.length, 0)
      if (len(list) > len(prev)) out.reviews.set(b, list)
    }
    for (const [b, t] of p.intros) if (!out.intros.has(b) || t.length > out.intros.get(b).length) out.intros.set(b, t)
    for (const [b, t] of p.batchTitles) if (!out.batchTitles.has(b)) out.batchTitles.set(b, t)
  }
  return out
}

/**
 * Lesson specs in learning order: each batch's concepts, then its revision lesson.
 *   name(concept) → lesson title
 */
export function courseLessons(course, { name, reviewTitle, idPrefix }) {
  const byBatch = new Map()
  for (const c of course.concepts.values()) byBatch.set(c.batch, [...(byBatch.get(c.batch) || []), c])
  const batches = [...new Set([...byBatch.keys(), ...course.reviews.keys()])].sort((a, b) => a - b)
  const out = []
  for (const b of batches) {
    const list = (byBatch.get(b) || []).sort((x, y) => x.num - y.num)
    for (const c of list) out.push({ title: name(c), body: c.body, idHint: `${idPrefix}-${c.key}` })
    const rev = course.reviews.get(b) || []
    if (rev.length) {
      const intro = course.intros.get(b)
      const body = [
        intro ? `## What this batch covers\n\n${intro}` : '',
        ...rev.map((r) => `## ${r.title}\n\n${r.body}`),
      ]
        .filter(Boolean)
        .join('\n\n')
      out.push({ title: reviewTitle(b, course.batchTitles.get(b)), body, idHint: `${idPrefix}-review-${b}` })
    }
  }
  return out
}
