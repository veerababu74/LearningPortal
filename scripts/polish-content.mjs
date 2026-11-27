/**
 * Shared content polish — runs over every generated track after all parsers (idempotent).
 *
 *   1. Drop navigation / status sections ("Next steps", "Progress tracker", "Help & support", …).
 *   2. Strip chatbot filler paragraphs ("Let me know if you'd like…", "Type continue…").
 *   3. Merge heading-only sections into the next section (a title with nothing under it is not a step).
 *   4. Split sections over 30 KB at their own sub-headings.
 *   5. Give code walls a short "What this code covers" lead-in, taken from the code's own docstrings,
 *      comments and definitions.
 *   6. Template visuals: a flow diagram whose node labels repeat 25+ times in a track is a template.
 *      Template diagrams on points / later sections are removed, as are "points" that only repeat the
 *      section text; one topic-relevant overview diagram per lesson is kept.
 *   7. Replace generic one-size-fits-all quizzes with questions built from the lesson's own Q&A.
 *   8. Recompute fallback summaries from the first real paragraph.
 *
 *   node scripts/polish-content.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { annotate, extractQA, firstParagraph, firstSentences, headingsOf, proseLength, quizFromQA, slugify, splitAtHeadings } from './course-kit.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gen = path.join(root, 'src', 'content', 'generated')
const DRY = process.argv.includes('--dry')

const NAV =
  /^(?:\d+(?:\.\d+)*[.)]?\s*)?(next steps?|next concept\b.*|next batch\b.*|next:\s.*|what'?s next\??|coming up next|up next|where to go next|(your )?learning progress|progress( tracker)?|overall (learning )?progress|help (&|and) support|support|license|topic index.*|complete topic index.*|final words|congratulations!?|you did it.*|session summary|completion checklist|how to use (this|the) (guide|course|notebook))\s*[:.!]?$/i

const CHAT =
  /\b(let me know if you('d| would)? (like|want)|would you like me to|want me to (continue|create|generate|explain|write)|shall i (continue|proceed|create)|i('ll| will) (continue|now create|create the next)|feel free to ask|happy (learning|coding)!|hope this helps|type ["']?continue["']?|reply with ["']?continue|in the next (message|response|part)|ready for (the next|concept|batch)|say ["']?next["']?)/i

const GENERIC_QUIZ = /most production-ready mindset|^Best way to prove you understand/i
const GENERIC_SIGNATURES = new Set([
  'Define>Core idea>See the flow>Apply>Validate',
  'What it is>Why it happens>Where it appears>How to detect>How to fix',
  'Symptom>Detect>Isolate>Mitigate>Recover',
  'Read>Run>Predict',
  'Slider>Range:>Step:',
])
const FALLBACK_SUMMARY = /explanations and runnable examples\.?$|^Learn .* with explanations/
// summaries flattened from raw markdown: leading heading number, inline list dashes, bold, heading marks, fences, tables
const RAW_SUMMARY = /^\s*\d+(?:\.\d+)*[.)]\s|\s[-*]\s\S.*\s[-*]\s\S|\*\*|^#|\s#{1,4}\s|```|\|\s*---/

const sig = (d) => (d?.nodes || []).map((n) => n.label).join('>')
const isCode = (b) => /```/.test(b)

function rich(s) {
  const b = String(s.body || '')
  return (
    /```/.test(b) ||
    /!\[[^\]]*\]\(/.test(b) ||
    /^\s*\|.*\|\s*$/m.test(b) ||
    (b.match(/^\s*(?:[-*+]|\d+[.)])\s+\S/gm) || []).length >= 2 ||
    (s.diagrams?.length || 0) > 0
  )
}

/** Remove chat-filler paragraphs (outside code fences). */
function stripChat(body) {
  const ann = annotate(body)
  const out = []
  let block = []
  let blockCode = false
  const flush = () => {
    if (!block.length) return
    const text = block.join('\n')
    if (!blockCode && CHAT.test(text) && proseLength(text) < 400) {
      // drop
    } else out.push(text)
    block = []
  }
  for (const { line, code } of ann) {
    if (!line.trim() && !code) {
      flush()
      out.push('')
      continue
    }
    if (block.length && code !== blockCode) flush()
    blockCode = code
    block.push(line)
  }
  flush()
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** "What this code covers" from docstrings, comments and definitions. */
function codeLead(body) {
  if (/^\*\*What this code covers\*\*/.test(body)) return null
  const codes = [...body.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n')
  const points = []
  const seen = new Set()
  const add = (t) => {
    const s = t.replace(/\s+/g, ' ').replace(/[=─━#*]{3,}/g, '').trim()
    const k = s.toLowerCase()
    if (s.length < 12 || s.length > 160 || seen.has(k) || /^(todo|noqa|type: ignore|pylint|fmt:|output:?$|example \d+$)/i.test(s)) return
    seen.add(k)
    points.push(s)
  }
  for (const m of codes.matchAll(/"""([\s\S]*?)"""|'''([\s\S]*?)'''/g)) {
    const first = (m[1] || m[2] || '').trim().split(/\n\s*\n/)[0].replace(/\n/g, ' ')
    if (first) add(firstSentences(first, 1, 150))
    if (points.length >= 4) break
  }
  for (const m of codes.matchAll(/^\s*#\s+(.+)$/gm)) {
    const c = m[1].replace(/^[-=─━*#\s]+|[-=─━*#\s]+$/g, '')
    if (c.split(/\s+/).length >= 4 && !/^[A-Z0-9 _:=─━-]+$/.test(c)) add(c.charAt(0).toUpperCase() + c.slice(1))
    if (points.length >= 8) break
  }
  const defs = [...new Set([...codes.matchAll(/^(?:async\s+)?def\s+(\w+)|^class\s+(\w+)/gm)].map((m) => (m[1] ? `\`${m[1]}()\`` : `\`${m[2]}\``)))].slice(0, 10)
  if (points.length < 2 && defs.length < 2) return null
  const parts = ['**What this code covers**', '']
  for (const p of points.slice(0, 8)) parts.push(`- ${p}`)
  if (defs.length >= 2) parts.push('', `**Defines:** ${defs.join(', ')}`)
  return parts.join('\n')
}

/** Split a giant section at its shallowest sub-heading level. */
function splitGiant(s, used) {
  const heads = headingsOf(s.body).filter((h) => !h.banner)
  if (heads.length < 2) return [s]
  const lvl = Math.min(...heads.map((h) => h.level))
  const pieces = splitAtHeadings(s.body, heads.filter((h) => h.level === lvl))
  const out = []
  for (const p of pieces) {
    const body = p.body.trim()
    if (!body) continue
    const title = p.head ? p.head.title : s.title
    let id = slugify(title) || 'section'
    let n = 2
    const base = id
    while (used.has(id)) id = `${base}-${n++}`
    used.add(id)
    out.push({ id, title, body, ...(out.length === 0 && s.diagrams ? { diagrams: s.diagrams } : {}) })
  }
  return out.length ? out : [s]
}

const QUESTION_TITLE = /^(?:\d+(?:\.\d+)*[.)]?\s*)?((?:what|why|how|where|when|which)\b.+\?)\s*$/i

/** Lesson topic without numbering prefixes ("Concept 4. Provider Quota Exhaustion" → "Provider Quota Exhaustion"). */
function topicOf(title) {
  return String(title)
    .replace(/^\d{2}\.\s*[^:]+:\s*/, '')
    .replace(/^(concept|observability)\s+\d+\.\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .trim()
}

/** Explicit Q&A in the lesson, plus question-style section headings answered by their own section. */
function lessonQA(l, sections) {
  const qa = extractQA(sections.map((s) => s.body).join('\n\n'))
  const topic = topicOf(l.title)
  for (const s of sections) {
    const m = String(s.title).match(QUESTION_TITLE)
    if (!m || proseLength(s.body) < 120) continue
    // "Why does it happen?" → "Why does Provider Quota Exhaustion happen?"
    const q = m[1].replace(/\b(it|this|these problems|them)\b/i, topic)
    qa.push({ q: q === m[1] && !q.toLowerCase().includes(topic.toLowerCase().slice(0, 12)) ? `${topic}: ${q}` : q, answer: s.body })
  }
  return qa
}

function polishLesson(l, ctx) {
  const stats = ctx.stats
  let sections = l.sections.map((s) => ({ ...s }))

  // 1. navigation / status sections
  const keep = sections.filter((s) => !NAV.test(String(s.title).trim()))
  if (keep.length && keep.length < sections.length) {
    stats.nav += sections.length - keep.length
    sections = keep
  }

  // 1b. code panels that repeat code already shown in the lesson text
  const allText = sections.map((s) => String(s.body || '')).join('\n').replace(/\s+/g, ' ')
  for (const s of sections) {
    if (!s.code?.length) continue
    const kept = s.code.filter((c) => {
      const probe = String(c.code || '').replace(/\s+/g, ' ').trim().slice(0, 160)
      return probe.length > 20 && !allText.includes(probe)
    })
    if (kept.length < s.code.length) stats.codePanels = (stats.codePanels || 0) + s.code.length - kept.length
    if (kept.length) s.code = kept
    else delete s.code
  }

  // 2. chat filler
  for (const s of sections) {
    const b = stripChat(String(s.body || ''))
    if (b !== String(s.body || '').trim() && b.length < String(s.body || '').length) {
      stats.chat++
      s.body = b
    }
  }

  // 6 (first). template visuals — before merging, so sections that only carried template points can merge
  let keptOverview = false
  for (const s of sections) {
    if (s.points?.length) {
      const templ = s.points.filter((p) => ctx.templates.has(sig(p.diagram))).length
      if (templ >= Math.ceil(s.points.length / 2)) {
        stats.points += s.points.length
        delete s.points
      }
    }
    if (s.diagram && ctx.templates.has(sig(s.diagram))) {
      const generic = GENERIC_SIGNATURES.has(sig(s.diagram))
      if (keptOverview || generic) {
        delete s.diagram
        stats.diagrams++
      } else keptOverview = true
    }
  }

  // 3. heading-only sections → merge into the next (or previous) section
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    if (sections.length < 2) break
    if (proseLength(s.body) >= 80 || rich(s) || s.points?.length || s.code?.length) continue
    const target = sections[i + 1] || sections[i - 1]
    if (s.scenario && target.scenario) continue
    const lead = String(s.body || '').trim()
    if (lead) target.body = i + 1 < sections.length ? `${lead}\n\n${target.body}` : `${target.body}\n\n${lead}`
    if (s.diagrams?.length) target.diagrams = [...s.diagrams, ...(target.diagrams || [])]
    if (s.diagram && !target.diagram) target.diagram = s.diagram
    if (s.scenario) target.scenario = s.scenario
    sections.splice(i, 1)
    stats.merged++
    i--
  }

  // 4. giant sections
  const used = new Set(sections.map((s) => s.id))
  sections = sections.flatMap((s) => {
    if (String(s.body || '').length <= 30000 || s.points?.length) return [s]
    const parts = splitGiant(s, used)
    if (parts.length > 1) stats.split++
    return parts
  })

  // 5. code walls
  for (const s of sections) {
    const b = String(s.body || '')
    const code = (b.match(/```[\s\S]*?```/g) || []).reduce((n, c) => n + c.length, 0)
    if (b.length > 4000 && code > b.length * 0.8 && proseLength(b) < 700) {
      const lead = codeLead(b)
      if (lead) {
        s.body = `${lead}\n\n${b}`
        stats.codeLead++
      }
    }
  }

  // 7. generic (or missing) quizzes → questions from the lesson's own Q&A and question-style sections
  const generic = l.quiz?.length && l.quiz.every((q) => GENERIC_QUIZ.test(q.question))
  if (generic || (!l.quiz?.length && ctx.quizzable)) {
    const qa = lessonQA(l, sections)
    const quiz = qa.length >= 2 ? quizFromQA(qa, [...qa, ...ctx.pool], 5) : []
    if (quiz.length >= 2) {
      l.quiz = quiz
      stats.quizReal++
    } else if (generic) {
      delete l.quiz
      stats.quizDropped++
    }
  }

  // 8. summaries — first real paragraph, else what the code itself says it does
  if (!l.summary || FALLBACK_SUMMARY.test(l.summary) || RAW_SUMMARY.test(l.summary)) {
    let found = ''
    for (const s of sections) {
      const p = firstParagraph(s.body)
      if (p) {
        found = firstSentences(p, 2, 240)
        break
      }
    }
    if (!found) {
      for (const s of sections) {
        const lead = codeLead(String(s.body || '').replace(/^\*\*What this code covers\*\*[\s\S]*?\n\n(?=```)/, ''))
        const bullets = lead ? [...lead.matchAll(/^- (.+)$/gm)].map((m) => m[1]) : []
        if (bullets.length) {
          found = `${topicOf(l.title)}: ${bullets.slice(0, 2).join('; ')}.`.slice(0, 240)
          break
        }
      }
    }
    if (found) {
      // "intro: - a - b" → "intro: a; b", and drop leftover emphasis marks
      found = found.replace(/\*\*|__/g, '').replace(/`/g, '')
      if (/\s[-*]\s\S.*\s[-*]\s\S/.test(found)) found = found.replace(/:\s*[-*]\s+/, ': ').replace(/\s+[-*]\s+(?=\S)/g, '; ')
      l.summary = found
      stats.summary++
    }
  }

  l.sections = sections
  return l
}

function main() {
  const tracks = fs.readdirSync(gen).filter((d) => fs.existsSync(path.join(gen, d, 'lessons')))
  const indexPath = path.join(gen, 'index.json')
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  const total = { nav: 0, chat: 0, merged: 0, split: 0, codeLead: 0, points: 0, diagrams: 0, quizReal: 0, quizDropped: 0, summary: 0, renamed: 0, codePanels: 0 }
  for (const t of tracks) {
    const dir = path.join(gen, t, 'lessons')
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    const lessons = files.map((f) => ({ f, l: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }))
    // templates: diagram label signatures repeated 25+ times in this track
    const counts = new Map()
    for (const { l } of lessons)
      for (const s of l.sections)
        for (const d of [s.diagram, ...(s.points || []).map((p) => p.diagram)]) {
          const k = sig(d)
          if (k) counts.set(k, (counts.get(k) || 0) + 1)
        }
    const templates = new Set([...counts].filter(([, n]) => n >= 25).map(([k]) => k))
    for (const k of GENERIC_SIGNATURES) templates.add(k)
    const pool = lessons.flatMap(({ l }) => lessonQA(l, l.sections)).slice(0, 800)
    const stats = { nav: 0, chat: 0, merged: 0, split: 0, codeLead: 0, points: 0, diagrams: 0, quizReal: 0, quizDropped: 0, summary: 0 }
    const summaries = new Map()
    const titles = new Map()
    const seenTitle = new Set()
    stats.renamed = 0
    for (const { f, l } of [...lessons].sort((a, b) => (a.l.order || 0) - (b.l.order || 0))) {
      const before = JSON.stringify(l)
      polishLesson(l, { templates, pool, stats, quizzable: !l.kind || l.kind === 'learn' })
      // two lessons with the same title in one module (different courses teaching the same concept)
      const key = `${l.title.slice(0, 3)}|${l.title.replace(/^\d{2}\.\s*[^:]+:\s*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '')}`
      if (seenTitle.has(key) && !l.title.includes(' · ')) {
        // name the copy after its course, or — when the title already is the course — after its source file
        const topic = l.title.replace(/^\d{2}\.\s*[^:]+:\s*/, '')
        const fromFile = path
          .basename(String(l.sourceFile || ''))
          .replace(/\.(md|ipynb|py|pdf)$/i, '')
          .replace(/^\d+[_.-]*/, '')
          .replace(/[_-]+/g, ' ')
          .trim()
        const label = l.series && !topic.toLowerCase().includes(l.series.toLowerCase()) ? l.series : fromFile
        if (label) {
          l.title = `${l.title} · ${label.charAt(0).toUpperCase()}${label.slice(1)}`
          stats.renamed++
        }
      }
      seenTitle.add(key)
      summaries.set(l.id, l.summary)
      titles.set(l.id, l.title)
      if (!DRY && JSON.stringify(l) !== before) fs.writeFileSync(path.join(dir, f), JSON.stringify(l))
    }
    for (const ref of index.lessonsByTrack?.[t] || []) {
      if (summaries.has(ref.id)) ref.summary = String(summaries.get(ref.id)).slice(0, 240)
      if (titles.has(ref.id)) ref.title = titles.get(ref.id)
    }
    for (const k of Object.keys(total)) total[k] += stats[k]
    console.log(`${t.padEnd(20)} ${JSON.stringify(stats)}`)
  }
  if (!DRY) fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
  console.log(`TOTAL ${JSON.stringify(total)}${DRY ? ' (dry run — nothing written)' : ''}`)
}

main()
