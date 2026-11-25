/**
 * course-kit — faithful markdown → lesson pipeline for the Python and Async tracks.
 *
 * Design goals (vs. the old generic builders):
 *  - Never drop source content: no section caps, no body truncation, fence-aware splitting.
 *  - Understand chat exports (Copilot "Now teach me X" courses with `continue` turns).
 *  - Route each sub-section to the right place exactly once:
 *      explanation/examples → Learn, interview Q&A → Interview, challenges → Exercises,
 *      mini-projects → Projects, table-of-contents / "how to use" → dropped.
 *  - Dedupe by content (hash), never by title.
 *  - Visuals come from the source (mermaid) or curated diagrams — no generic filler flows.
 */
import { createHash } from 'node:crypto'

export const hash = (s, n = 12) => createHash('sha1').update(String(s)).digest('hex').slice(0, n)

const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu
const BOX_RE = /[\u2500-\u259F]/g

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function stripInline(s) {
  return String(s || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(?<!\\)\*\*(?=\S)(.+?)(?<=\S)(?<!\\)\*\*/g, '$1') // **bold** (paired only; keep "__" — usually a dunder)
    .replace(/\\([*_`#\[\]()<>|])/g, '$1') // markdown escapes: except\* → except*, \*\*kwargs → **kwargs
    .replace(/`+/g, '')
}

/** Clean a heading / title: no markdown, emoji, box art, or dangling punctuation. */
export function cleanTitle(s, max = 96) {
  let t = stripInline(s).replace(EMOJI_RE, '').replace(BOX_RE, '')
  t = t.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim()
  t = t.replace(/^[\s:—–\-|.#*]+/, '').replace(/[\s:—–\-|#*]+$/, '')
  if (t.length > max) t = `${t.slice(0, max).replace(/\s+\S*$/, '')}…`
  return t.trim()
}

/** Plain prose (for summaries, quiz options, narration). */
export function plain(s, max = 240) {
  let t = String(s || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
  t = stripInline(t).replace(EMOJI_RE, '').replace(BOX_RE, '')
  // *emphasis* only — underscores inside identifiers (run_in_executor) must survive
  t = t.replace(/(^|[\s(])\*(\S[^*]*?)\*(?=[\s.,;:!?)]|$)/g, '$1$2').replace(/\s+/g, ' ').trim()
  t = t.replace(/^["“]|["”]$/g, '').trim()
  if (t.length > max) t = `${t.slice(0, max).replace(/\s+\S*$/, '')}…`
  return t
}

/** First real prose paragraph (not a heading, list, table, quote banner or code). */
export function firstParagraph(md, min = 60) {
  const blocks = []
  let cur = []
  for (const { line, code } of annotate(String(md || ''))) {
    if (code || !line.trim()) {
      if (cur.length) blocks.push(cur)
      cur = []
      continue
    }
    cur.push(line)
  }
  if (cur.length) blocks.push(cur)
  for (const b of blocks) {
    if (b.every((l) => /^\s*(#|\||[-*+]\s|\d+[.)]\s)/.test(l))) continue
    const prose = b.filter((l) => !/^\s*(#|\|)/.test(l)).join(' ')
    if (plain(prose, 1000).length >= min) return prose
  }
  return ''
}

export function firstSentences(text, n = 1, max = 220) {
  const p = plain(text, 4000)
  const parts = p.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(`])/).filter((x) => x.length > 2)
  let out = ''
  for (const s of parts) {
    if (out && (out + ' ' + s).length > max) break
    out = out ? `${out} ${s}` : s
    if (--n <= 0) break
  }
  if (!out) out = p
  if (out.length > max) out = `${out.slice(0, max).replace(/\s+\S*$/, '')}…`
  return out
}

/* ------------------------------------------------------------------ fences */

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/

/** Heading that can only be a document heading (used to detect truncated code fences). */
function looksLikeDocHeading(line) {
  if (!/^#{1,3}\s+\S/.test(line)) return false
  const t = line.replace(/^#+\s*/, '')
  if (/^[\p{Extended_Pictographic}]/u.test(t) && /[A-Z]{3,}|Example|Concept|Chapter|Interview|Challenge|Explanation|Scenario|Question/.test(t)) {
    return true
  }
  return /^(CONCEPT|CHAPTER|MODULE|PHASE|TOPIC|DAY|PART)\b/.test(t)
}

/**
 * Balance code fences. With `aggressive` (chat exports), a fence left open by a truncated
 * answer is closed when a new fenced block or an unmistakable document heading starts.
 */
export function repairFences(md, { aggressive = false } = {}) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let open = null
  for (const line of lines) {
    const m = line.match(FENCE_RE)
    if (open) {
      if (m && m[1][0] === open.ch && m[1].length >= open.len && !m[2].trim()) {
        out.push(line)
        open = null
        continue
      }
      if (aggressive && open.len === 3 && m && m[1].length === 3 && /^\w/.test(m[2].trim())) {
        out.push(open.ch.repeat(3))
        open = { ch: m[1][0], len: 3 }
        out.push(line)
        continue
      }
      if (aggressive && looksLikeDocHeading(line) && !(out[out.length - 1] || '').trim()) {
        out.push(open.ch.repeat(open.len), '')
        open = null
        out.push(line)
        continue
      }
      out.push(line)
      continue
    }
    if (m) open = { ch: m[1][0], len: m[1].length }
    out.push(line)
  }
  if (open) out.push(open.ch.repeat(open.len))
  return out.join('\n')
}

/** Lines annotated with whether they are inside a code fence (input must be balanced). */
export function annotate(md) {
  const lines = String(md || '').split('\n')
  const res = []
  let open = null
  for (const line of lines) {
    const m = line.match(FENCE_RE)
    if (open) {
      res.push({ line, code: true })
      if (m && m[1][0] === open.ch && m[1].length >= open.len && !m[2].trim()) open = null
      continue
    }
    if (m) {
      open = { ch: m[1][0], len: m[1].length }
      res.push({ line, code: true })
      continue
    }
    res.push({ line, code: false })
  }
  return res
}

export function headingsOf(md, maxLevel = 6) {
  return annotate(md)
    .map((a, idx) => ({ ...a, idx }))
    .filter((a) => !a.code)
    .map((a) => {
      const m = a.line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
      if (!m || m[1].length > maxLevel) return null
      const title = cleanTitle(m[2])
      if (!title || !/[A-Za-z0-9]/.test(title)) return { idx: a.idx, level: m[1].length, raw: m[2], title: '', banner: true }
      return { idx: a.idx, level: m[1].length, raw: m[2], title }
    })
    .filter(Boolean)
}

/** Split markdown at the given heading line indices. Returns [{head, body}] (head null for preamble). */
export function splitAtHeadings(md, heads) {
  const lines = String(md || '').split('\n')
  const sorted = [...heads].sort((a, b) => a.idx - b.idx)
  const out = []
  const first = sorted[0]?.idx ?? lines.length
  const pre = lines.slice(0, first).join('\n')
  if (pre.trim()) out.push({ head: null, body: pre })
  sorted.forEach((h, i) => {
    const end = i + 1 < sorted.length ? sorted[i + 1].idx : lines.length
    out.push({ head: h, body: lines.slice(h.idx + 1, end).join('\n') })
  })
  return out
}

/** Remove banner-only headings (=====, ─────) and stray horizontal rules. */
export function tidy(md) {
  const ann = annotate(md)
  const out = []
  for (const { line, code } of ann) {
    if (!code) {
      const h = line.match(/^#{1,6}\s+(.*)$/)
      if (h && !/[A-Za-z0-9]/.test(cleanTitle(h[1]))) continue
      if (/^\s*([-*_=])\1{2,}\s*$/.test(line)) {
        out.push('')
        continue
      }
    }
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function proseLength(md) {
  return plain(md, 1e9).length
}

export function mermaidCount(md) {
  return (String(md).match(/```mermaid/g) || []).length
}

/* ------------------------------------------------------------- chat exports */

const USER_RE = /^##\s+@[\w.-]+\s*$/
const BOT_RE = /^##\s+(?:Copilot|ChatGPT|Assistant|Claude)\s*$/

export function isChatExport(md) {
  return /^#\s+(?:Copilot|ChatGPT) Chat Conversation Export/m.test(String(md).slice(0, 500))
}

function stripContinuationPreface(md) {
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length && i < 12) {
    const l = lines[i].trim()
    if (!l || /^-{3,}$/.test(l)) {
      i++
      continue
    }
    if (/^(I'?ll|I will|Let me|Let's|Sure|Continuing|Picking up|Great|Perfect|Here'?s|Resuming)\b/i.test(l) && !/^#/.test(l)) {
      i++
      continue
    }
    if (/^#{1,3}\s+.*\b(continu|picking up|resum)/i.test(l)) {
      i++
      continue
    }
    break
  }
  return lines.slice(i).join('\n')
}

/**
 * Split a chat export into courses. A user prompt that is not a "continue" starts a new course;
 * "continue" answers are appended to the current course.
 */
export function parseChatExport(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n')
  const turns = []
  let cur = null
  for (const line of lines) {
    if (USER_RE.test(line)) {
      cur = { role: 'user', lines: [] }
      turns.push(cur)
      continue
    }
    if (BOT_RE.test(line)) {
      cur = { role: 'bot', lines: [] }
      turns.push(cur)
      continue
    }
    if (cur) cur.lines.push(line)
  }
  const courses = []
  let course = null
  for (const t of turns) {
    const text = t.lines.join('\n').trim()
    if (t.role === 'user') {
      const isCont = text.length < 80 && /^(con\w*|go on|next|more|proceed|ok|yes|keep going|carry on)/i.test(text)
      if (!isCont || !course) {
        course = { prompt: text, parts: [] }
        courses.push(course)
      }
      course.pendingContinue = isCont
    } else {
      if (!course) {
        course = { prompt: '', parts: [] }
        courses.push(course)
      }
      const body = course.parts.length ? stripContinuationPreface(text) : text
      course.parts.push(repairFences(body, { aggressive: true }))
    }
  }
  return courses
    .map((c) => ({ prompt: c.prompt, md: c.parts.join('\n\n') }))
    .filter((c) => c.md.trim().length > 300)
}

/* -------------------------------------------------------------- unit split */

const UNIT_RE = /(?:^|[\s:#—–\-(])(concept|chapter|day|topic|lesson|module|phase|part)\s*#?\s*(\d+(?:\.\d+)?)/i
const FINE = new Set(['concept', 'chapter', 'day', 'topic', 'lesson'])

export function unitKey(title) {
  const m = title.match(UNIT_RE)
  const rest = title
    .replace(UNIT_RE, ' ')
    .toLowerCase()
    .replace(/&|\band\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
  return { num: m ? `${m[1].toLowerCase()}-${m[2]}` : null, rest }
}

function mostCommonLevel(heads) {
  const counts = new Map()
  for (const h of heads) counts.set(h.level, (counts.get(h.level) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0]
}

/**
 * Split a course/document into numbered units (Concept 1, Chapter 2, Day 3, MODULE 4…).
 * Returns { intro, units: [{title, rawTitle, group, body, level}] } or null if not unit-structured.
 */
export function splitUnits(md) {
  const heads = headingsOf(md, 3).filter((h) => !h.banner)
  const kw = heads
    .map((h) => ({ ...h, m: h.title.match(UNIT_RE) }))
    .filter((h) => h.m && h.title.search(UNIT_RE) < 12 && !/^(table of contents|contents|curriculum)/i.test(h.title))
  const fine = kw.filter((h) => FINE.has(h.m[1].toLowerCase()))
  const coarse = kw.filter((h) => !FINE.has(h.m[1].toLowerCase()))
  let unitHeads
  let groupHeads = []
  if (fine.length >= 3) {
    const lvl = mostCommonLevel(fine)
    unitHeads = fine.filter((h) => h.level === lvl)
    groupHeads = coarse
  } else if (coarse.length >= 2) {
    const lvl = mostCommonLevel(coarse)
    unitHeads = coarse.filter((h) => h.level === lvl)
  } else {
    return null
  }
  if (unitHeads.length < 2) return null

  const pieces = splitAtHeadings(md, unitHeads)
  let intro = ''
  const units = []
  for (const p of pieces) {
    if (!p.head) {
      intro = p.body
      continue
    }
    // group label = last coarse heading before this unit
    const group = [...groupHeads].reverse().find((g) => g.idx < p.head.idx)
    // a coarse group heading inside the body is just a banner – drop it from the body
    let body = p.body
    for (const g of groupHeads) {
      if (g.idx > p.head.idx && g.idx < p.head.idx + body.split('\n').length + 1) {
        body = body.replace(new RegExp(`^#{1,3}\\s+${escapeRe(g.raw)}\\s*$`, 'm'), '')
      }
    }
    units.push({
      rawTitle: p.head.title,
      title: unitDisplayTitle(p.head.title),
      num: p.head.title.match(UNIT_RE)?.[2] || null,
      group: group ? unitDisplayTitle(group.title) : '',
      level: p.head.level,
      body,
    })
  }

  // Merge tiny banner units ("CONCEPT 10–15: Quick reference") forward.
  const merged = []
  for (let i = 0; i < units.length; i++) {
    const u = units[i]
    if (proseLength(u.body) < 500 && i + 1 < units.length && !/```/.test(u.body)) {
      units[i + 1].body = `${u.body}\n\n${units[i + 1].body}`
      continue
    }
    merged.push(u)
  }

  // Drop regenerated duplicates: same unit number or same normalised title → keep the longer one.
  const byKey = new Map()
  const order = []
  for (const u of merged) {
    const k = unitKey(u.rawTitle)
    const key = k.rest.length > 6 ? `t:${k.rest}` : k.num ? `n:${k.num}` : `t:${k.rest}`
    const altKey = k.num ? `n:${k.num}` : null
    const prevKey = byKey.has(key) ? key : altKey && byKey.has(altKey) ? altKey : null
    if (prevKey) {
      const prev = byKey.get(prevKey)
      if (u.body.length > prev.body.length) Object.assign(prev, u)
      continue
    }
    byKey.set(key, u)
    if (altKey) byKey.set(altKey, u)
    order.push(u)
  }
  return { intro, units: order }
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function unitDisplayTitle(t) {
  const s = cleanTitle(t)
    // "CHAPTER 2 & 3 —", "CONCEPT 10, 11, 12 —", "CONCEPT 24 & 25:", "CONCEPT 2.4 & 2.5 —", "(FINAL)"
    .replace(
      /^(?:concepts?|chapters?|day|topics?|lesson|module|phase|part)\s*#?\s*\d+(?:\.\d+)?(?:\s*(?:&|,|and|to|–|—|-)\s*\d+(?:\.\d+)?)*\s*(?:\(final\))?\s*[:.—–\-|]*\s*/i,
      '',
    )
    .trim()
  return s || cleanTitle(t)
}

/* -------------------------------------------------------- section classify */

export function classifyHeading(title) {
  const t = cleanTitle(title).toLowerCase()
  if (/^(table of contents|contents|how to use|your learning format|where to go next|additional resources|congratulations|prerequisites|setup$|learning path$)/.test(t)) return 'meta'
  if (/(master )?curriculum|what you will learn|what you'll learn|course (map|outline)|roadmap$/.test(t) && t.length < 60) return 'meta'
  if (/learning objectives|^objectives/.test(t)) return 'objectives'
  if (/interview|q\s*&\s*a|\bquestions?\b|\bfaq\b|scenario[- ]based/.test(t)) return 'interview'
  if (
    /coding challenges?|^\d*\s*challenges?\b|exercises?\b|practice (problems|tasks|exercises)|hands-?on (tasks?|exercises?|practice|lab)|^hands-?on$|^tasks?(\s+\d|$)|homework|try it yourself|assignments?|practice problems|problems?\s*\d|\d+\s.*\bproblems\b|^problems\b/.test(t)
  ) {
    return 'exercise'
  }
  if (/mini[- ]?projects?|^\d*\s*projects?\b|^project\s*\d|real[- ]world projects|industry projects|capstone/.test(t)) return 'project'
  return 'learn'
}

/**
 * Split a unit / document body into sections at the shallowest heading level present
 * (below `minLevel`). Returns [{title, kind, body}].
 */
export function splitSections(md, { minLevel = 1, fallbackTitle = 'Overview' } = {}) {
  const heads = headingsOf(md).filter((h) => h.level >= minLevel && !h.banner)
  if (!heads.length) return [{ title: fallbackTitle, kind: 'learn', body: md }]
  const lvl = Math.min(...heads.map((h) => h.level))
  const pieces = splitAtHeadings(md, heads.filter((h) => h.level === lvl))
  const out = []
  for (const p of pieces) {
    const title = p.head ? p.head.title : fallbackTitle
    const body = p.body
    if (!p.head && proseLength(body) < 60 && !/```/.test(body)) continue
    out.push({ title, kind: p.head ? classifyHeading(title) : 'learn', body, level: lvl })
  }
  return out
}

/** Bullets from a "Learning objectives" block. */
export function bullets(md, max = 6) {
  return [...String(md).matchAll(/^\s*(?:[-*+]|\d+[.)])\s+(.+)$/gm)]
    .map((m) => plain(m[1], 140))
    .filter((s) => s.length > 6)
    .slice(0, max)
}

/* ------------------------------------------------------------------- Q & A */

/**
 * Extract question/answer pairs from interview markdown. Supports:
 *   ### Q1: question … answer        ### Scenario 2: + **"question"** … answer
 *   **Q1: question** … **A:** answer **Scenario 3: …** **Q:** … answer
 */
export function extractQA(md) {
  const src = String(md || '')
  const ann = annotate(src)
  const starts = []
  ann.forEach((a, i) => {
    if (a.code) return
    const l = a.line
    let m = l.match(/^#{2,5}\s+(?:\S+\s+)?(?:Q\s*\d+|Question\s*\d+|Scenario\s*\d+)\s*[:.)—–-]?\s*(.*)$/i)
    if (m) return starts.push({ i, q: m[1] })
    m = l.match(/^\*\*(?:\S+\s+)?(?:Q\s*\d+|Scenario\s*\d+)\s*[:.)]\s*(.+?)\*\*\s*$/i)
    if (m) return starts.push({ i, q: m[1] })
  })
  const lines = src.split('\n')
  const items = []
  starts.forEach((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].i : lines.length
    let bodyLines = lines.slice(s.i + 1, end)
    // stop at the next same-or-higher heading that is not a Q
    const stop = bodyLines.findIndex((l, j) => /^#{1,3}\s+/.test(l) && !ann[s.i + 1 + j]?.code)
    if (stop > 0) bodyLines = bodyLines.slice(0, stop)
    let q = plain(s.q, 300)
    let body = bodyLines.join('\n').trim()
    if (!q || q.length < 8) {
      const firstLine = body.split('\n').find((l) => l.trim())
      q = plain(firstLine || '', 300)
      body = body.replace(firstLine || '', '').trim()
    }
    const qLine = body.match(/^\*\*Q:\*\*\s*(.+)$/m)
    if (qLine) q = `${q} ${plain(qLine[1], 200)}`.trim()
    const answer = body
      .replace(/^\*\*Q:\*\*.*$/m, '')
      .replace(/^\*\*(?:\S+\s+)?(?:A|Answer)[^*\n]*:?\*\*:?\s*/gim, '')
      .trim()
    if (q.length >= 8 && plain(answer, 400).length > 30) items.push({ q, answer })
  })
  return items
}

function seededShuffle(arr, seed) {
  const a = [...arr]
  let h = parseInt(hash(seed, 8), 16) || 1
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const j = h % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Real knowledge-check questions built from source Q&A: the correct option is the source
 * answer's lead sentence; distractors are lead sentences of *other* answers in the pool.
 */
export function quizFromQA(items, pool = items, max = 5) {
  const lead = (a) => {
    const src = firstParagraph(a, 30) || a
    const one = firstSentences(src, 1, 170)
    return one.length < 60 ? firstSentences(src, 2, 190) : one
  }
  const usable = items.filter((i) => lead(i.answer).length > 25)
  const poolLeads = [...new Set(pool.map((p) => lead(p.answer)).filter((x) => x.length > 25))]
  if (poolLeads.length < 4) return []
  const out = []
  for (const it of usable) {
    const correct = lead(it.answer)
    const distract = seededShuffle(poolLeads.filter((x) => x !== correct), it.q).slice(0, 3)
    if (distract.length < 3) continue
    const options = seededShuffle([correct, ...distract], `${it.q}#opts`)
    out.push({
      id: `q-${hash(it.q, 6)}`,
      question: it.q,
      options,
      answerIndex: options.indexOf(correct),
      explanation: firstSentences(it.answer, 3, 420),
    })
    if (out.length >= max) break
  }
  return out
}

/* --------------------------------------------------------------- sections */

function shortLabel(title) {
  let t = cleanTitle(title).replace(/^\d+(?:\.\d+)*[.)]?\s+/, '')
  const ex = t.match(/^(example|task|step|exercise|challenge|scenario|q)\s*#?\s*(\d+(?:\.\d+)?)/i)
  if (ex) return `${ex[1][0].toUpperCase()}${ex[1].slice(1).toLowerCase()} ${ex[2]}`
  if (t.length <= 16) return t
  const words = t.split(/\s+/)
  let out = ''
  for (const w of words) {
    if ((out + ' ' + w).trim().length > 16) break
    out = `${out} ${w}`.trim()
  }
  return out || t.slice(0, 16)
}

/**
 * Step-through walkthrough built from a section's own sub-headings (### …), narrated with
 * the first prose of each sub-section. Returns null unless it adds real information.
 */
export function walkthrough(title, body) {
  const heads = headingsOf(body).filter((h) => !h.banner)
  if (heads.length < 3) return null
  const lvl = Math.min(...heads.map((h) => h.level))
  const subs = splitAtHeadings(body, heads.filter((h) => h.level === lvl)).filter((p) => p.head)
  if (subs.length < 3 || subs.length > 9) return null
  if (subs.every((s) => /^(example|q\s*\d|question|scenario|exercise|task|challenge)/i.test(s.head.title))) return null
  const steps = subs.map((s) => ({
    label: shortLabel(s.head.title),
    full: s.head.title,
    text: firstSentences(firstParagraph(s.body, 40) || s.body, 2, 300),
  }))
  if (steps.filter((s) => s.text.length > 50).length < Math.ceil(steps.length / 2)) return null
  const nodes = steps.map((s, i) => ({
    id: `n${i}`,
    label: s.label,
    x: 0,
    y: 0,
    kind: i === 0 ? 'start' : i === steps.length - 1 ? 'end' : 'process',
  }))
  const edges = steps.slice(1).map((_, i) => ({ id: `e${i}`, source: `n${i}`, target: `n${i + 1}` }))
  return {
    title: `${cleanTitle(title)} — step by step`,
    nodes,
    edges,
    steps: steps.map((s, i) => ({
      id: `s${i}`,
      label: s.full,
      activeNodeIds: nodes.slice(0, i + 1).map((n) => n.id),
      activeEdgeIds: edges.slice(0, i).map((e) => e.id),
      narration: s.text || s.full,
    })),
  }
}

export function makeSection(title, body, { usedIds, walk = true } = {}) {
  const clean = repairMermaidBlocks(tidy(body))
  let id = slugify(title) || 'section'
  if (usedIds) {
    let n = 2
    const base = id
    while (usedIds.has(id)) id = `${base}-${n++}`
    usedIds.add(id)
  }
  const section = { id, title: cleanTitle(title) || 'Overview', body: clean }
  const diagram = walk ? walkthrough(title, clean) : null
  if (diagram) section.diagram = diagram
  return section
}

/* ---------------------------------------------------------- mermaid repair */

const SEQ_KEYWORDS = /^(loop|alt|opt|par|end|else|note|critical|break|rect|box|and|activate|deactivate|autonumber|over|link|links)$/i

/**
 * Fix common authoring mistakes in source Mermaid without changing what the diagram says:
 *  - sequence participants named after keywords ("participant Loop") are renamed internally
 *  - flowchart labels containing [] or () are quoted:  A[dict[key] = value] → A["dict[key] = value"]
 *  - "\n" inside flowchart labels becomes a line break
 */
export function repairMermaid(src) {
  let s = String(src)
  const first = s.trim().split('\n')[0].trim()
  if (/^sequenceDiagram/.test(first)) {
    const ids = new Set()
    for (const m of s.matchAll(/^\s*(?:participant|actor)\s+(\S+)/gm)) if (SEQ_KEYWORDS.test(m[1])) ids.add(m[1])
    for (const id of ids) {
      const nid = `${id}Actor`
      s = s
        .split('\n')
        .map((line) => {
          const decl = line.match(/^(\s*(?:participant|actor)\s+)(\S+)(.*)$/)
          if (decl) {
            if (decl[2] !== id) return line
            return /^\s+as\s+/.test(decl[3]) ? `${decl[1]}${nid}${decl[3]}` : `${decl[1]}${nid} as ${id}${decl[3]}`
          }
          const colon = line.indexOf(':')
          const head = colon >= 0 ? line.slice(0, colon) : line
          const tail = colon >= 0 ? line.slice(colon) : ''
          if (/^\s*(loop|alt|opt|par|else|critical|break|rect|end|box)\b/i.test(head) && !/-[->x)]|--/.test(head)) return line
          return head.replace(new RegExp(`(^|[\\s,>+\\-])${id}(?=[\\s,\\-+]|$)`, 'g'), `$1${nid}`) + tail
        })
        .join('\n')
    }
  }
  if (/^(flowchart|graph)\b/.test(first)) {
    s = s.replace(/(\b[A-Za-z0-9_]+)\[(?!["(\[/\\])((?:[^[\]\n]|\[[^[\]\n]*\])*)\]/g, (m, id, label) =>
      /[[\]()]/.test(label) ? `${id}["${label.replace(/"/g, '#quot;')}"]` : m,
    )
    s = s.replace(/\\n/g, '<br/>')
  }
  return s
}

export function repairMermaidBlocks(md) {
  return String(md).replace(/```mermaid\s*\n([\s\S]*?)```/g, (_, body) => '```mermaid\n' + repairMermaid(body).trimEnd() + '\n```')
}

/** Normalised body fingerprint for cross-lesson duplicate detection. */
export function bodyKey(body) {
  return hash(
    String(body)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ''),
    16,
  )
}

/* ------------------------------------------------------------------ python */

/** Split Python source into overview + top-level def/class units, merging tiny ones. */
export function splitPython(code) {
  const src = String(code || '').replace(/\r\n?/g, '\n')
  const lines = src.split('\n')
  const starts = []
  for (let i = 0; i < lines.length; i++) {
    if (/^(?:async\s+)?def\s+\w+|^class\s+\w+|^if\s+__name__\s*==/.test(lines[i])) {
      // include decorators / comment block directly above
      let s = i
      while (s > 0 && /^(@|#)/.test(lines[s - 1])) s--
      starts.push(s)
    }
  }
  if (!starts.length) return [{ title: 'Full program', code: src.trim(), doc: '' }]
  const units = []
  const pre = lines.slice(0, starts[0]).join('\n').trim()
  if (pre) units.push({ title: 'Overview', code: pre, doc: docOf(pre) })
  starts.forEach((s, k) => {
    const block = lines.slice(s, k + 1 < starts.length ? starts[k + 1] : lines.length).join('\n').trim()
    const head = block.split('\n').find((l) => /^(?:async\s+)?def\s|^class\s|^if\s+__name__/.test(l)) || ''
    const name = head.match(/(?:def|class)\s+(\w+)/)?.[1]
    const title = /^if\s+__name__/.test(head)
      ? 'Run it'
      : /^class\s/.test(head)
        ? `class ${name}`
        : `${name}()`
    units.push({ title, code: block, doc: docOf(block) })
  })
  // merge consecutive small units so each section is meaningful
  const merged = []
  for (const u of units) {
    const last = merged[merged.length - 1]
    if (last && last.code.length + u.code.length < 1800 && last.title !== 'Overview' && u.title !== 'Run it') {
      last.title = last.parts ? last.title : last.title
      last.parts = [...(last.parts || [last.title]), u.title]
      last.code = `${last.code}\n\n\n${u.code}`
      last.doc = [last.doc, u.doc].filter(Boolean).join(' ')
    } else merged.push({ ...u })
  }
  return merged.map((u) => ({
    ...u,
    title: u.parts ? `${u.parts.slice(0, 3).join(', ')}${u.parts.length > 3 ? ' …' : ''}` : u.title,
  }))
}

function docOf(code) {
  const m = String(code).match(/"""([\s\S]*?)"""|'''([\s\S]*?)'''/)
  return (m?.[1] || m?.[2] || '').trim()
}

/** Fraction of a Python file's distinctive lines already present in `haystack`. */
export function codeCoverage(code, haystack) {
  const lines = String(code)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 30 && !/^(#|"""|'''|import |from |print\(|return |pass$)/.test(l))
  if (lines.length < 4) return 0
  const sample = lines.filter((_, i) => i % Math.max(1, Math.floor(lines.length / 24)) === 0).slice(0, 24)
  const hit = sample.filter((l) => haystack.includes(l)).length
  return hit / sample.length
}
