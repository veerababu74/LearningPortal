/**
 * Track builder shared by the Python and Async parsers.
 *
 *   const t = createTrack({ trackId, prefix, learnModules, moduleFor, labIdsFor })
 *   t.addDoc({...})      // a markdown document (README, chapter, guide)
 *   t.addCourse({...})   // a unit-structured course (chat-export course, MODULE-based plan)
 *   t.addPython({...})   // a .py file
 *   const lessons = t.finalize({ diagrams })
 */
import fs from 'node:fs'
import { redactSecrets } from './redact.mjs'
import path from 'node:path'
import {
  bodyKey,
  bullets,
  classifyHeading,
  cleanTitle,
  extractQA,
  firstParagraph,
  firstSentences,
  hash,
  headingsOf,
  makeSection,
  plain,
  proseLength,
  quizFromQA,
  repairFences,
  slugify,
  splitAtHeadings,
  splitPython,
  splitSections,
  splitUnits,
  tidy,
  unitDisplayTitle,
} from './course-kit.mjs'

export const MOD_EXERCISES = { id: '10', name: 'Exercises' }
export const MOD_PROJECTS = { id: '11', name: 'Projects' }
export const MOD_INTERVIEW = { id: '12', name: 'Interview' }

const LEARN_PART_CHARS = 38_000
const LEARN_SPLIT_OVER = 60_000
const COMPANION_PART_CHARS = 60_000
const SECTION_SPLIT_OVER = 40_000

const GENERIC_SECTION =
  /^(overview|introduction|intro|explanation|examples?|\d+ examples|code examples?|visual explanation|caveman explanation|concept explanation|junior developer|syntax|basic syntax|output|summary|key (points|terms|takeaways)|notes?|theory|theory & visual explanation)\b/i

/** Pick the document title: first H1 that is not shared with sibling files. */
export function docTitle(md, shared = new Set(), fallback = '') {
  const h1 = headingsOf(md, 1).filter((h) => !h.banner)
  const pick = h1.find((h) => !shared.has(h.title)) || h1[0]
  return cleanTitle(pick?.title || fallback || 'Lesson')
}

export function seriesName(title) {
  return cleanTitle(title)
    .replace(/^(the\s+)?complete\s+/i, '')
    .replace(/\s*[—–-]\s*(complete|full)\s+(learning\s+)?(guide|course).*$/i, '')
    .replace(/\s+(mastery\s+)?(guide|masterclass)$/i, '')
    .replace(/\s+mastery$/i, ' Mastery')
    .trim()
}

/** Drop H1 title lines; split at H2 (or the shallowest level that exists). */
function docSections(md, dropHeadings = new Set()) {
  const heads = headingsOf(md).filter((h) => !h.banner)
  const has2 = heads.some((h) => h.level === 2)
  const has3 = heads.some((h) => h.level === 3)
  const L = has2 ? 2 : has3 ? 3 : 1
  const bounds = heads.filter((h) => h.level <= L)
  const pieces = splitAtHeadings(md, bounds)
  const out = []
  for (const p of pieces) {
    if (!p.head) {
      if (proseLength(p.body) > 120 || /```mermaid/.test(p.body)) out.push({ title: 'Overview', kind: 'learn', body: p.body })
      continue
    }
    if (dropHeadings.has(p.head.title)) continue // banner shared by sibling files
    if (p.head.level < L && !p.body.trim()) continue // title-only H1
    if (p.head.level < L && proseLength(p.body) < 40 && !/```/.test(p.body)) continue
    out.push({ title: p.head.title, kind: classify(p.head.title), body: p.body })
  }
  return out.flatMap(expandHuge)
}

/** A single 80 KB section is unreadable: split it at its own sub-headings, keeping its kind. */
function expandHuge(section) {
  if (section.body.length <= SECTION_SPLIT_OVER) return [section]
  const heads = headingsOf(section.body).filter((h) => !h.banner)
  if (heads.length < 2) return [section]
  const lvl = Math.min(...heads.map((h) => h.level))
  const pieces = splitAtHeadings(section.body, heads.filter((h) => h.level === lvl))
  const out = []
  for (const p of pieces) {
    const body = p.body
    if (!p.head) {
      if (proseLength(body) > 120) out.push({ ...section, body })
      continue
    }
    if (!body.trim()) continue
    const sub = classify(p.head.title)
    out.push({ ...section, title: p.head.title, kind: section.kind === 'learn' && sub !== 'learn' && sub !== 'meta' ? sub : section.kind, body })
  }
  return out.length ? out.flatMap(expandHuge) : [section]
}

const classify = classifyHeading

function chunkSections(sections, limit) {
  const parts = []
  let buf = []
  let len = 0
  for (const s of sections) {
    const l = s.body.length
    if (buf.length && len + l > limit) {
      parts.push(buf)
      buf = []
      len = 0
    }
    buf.push(s)
    len += l
  }
  if (buf.length) parts.push(buf)
  return parts
}

function objectivesFrom(sections, topic) {
  const titles = sections
    .map((s) => cleanTitle(s.title).replace(/^\d+(?:\.\d+)*[.)]?\s+/, ''))
    .filter((t) => t && !GENERIC_SECTION.test(t) && t.length > 3)
  const uniq = [...new Set(titles)].slice(0, 6)
  if (uniq.length >= 2) return uniq
  // fall back to sub-headings inside the sections
  const subs = sections
    .flatMap((s) => headingsOf(s.body, 3).map((h) => h.title))
    .map((t) => t.replace(/^\d+(?:\.\d+)*[.)]?\s+/, ''))
    .filter((t) => t && !GENERIC_SECTION.test(t) && !/^(example|q\s*\d|scenario|output)/i.test(t))
  const all = [...new Set([...uniq, ...subs])].slice(0, 6)
  return all.length ? all : [topic]
}

/** "Covers: event loop, coroutines and await, tasks …" — used when a lesson opens with diagrams/code, not prose. */
function coversLine(sections, topic) {
  const names = [
    ...new Set(
      sections
        .map((s) => cleanTitle(s.title).replace(/^\d+(?:\.\d+)*[.)]?\s+/, ''))
        .filter((t) => t && !GENERIC_SECTION.test(t) && !/^(pitfalls|performance notes|introduction)/i.test(t)),
    ),
  ]
  if (!names.length) return `${topic}: explanations and runnable examples.`
  return `Covers ${names.slice(0, 5).join(', ')}${names.length > 5 ? ' and more' : ''}.`
}

function summaryFrom(sections, fallback) {
  for (const s of sections) {
    const para = firstParagraph(s.body)
    if (!para) continue
    const t = firstSentences(para, 2, 240)
    if (t.length >= 60 && !/^(table of contents|contents)/i.test(t)) return t
  }
  return fallback
}

export function createTrack({ trackId, prefix, moduleFor, labIdsFor = () => [], seriesRank = () => 50 }) {
  const raw = [] // internal lesson records

  function push(rec) {
    rec._seq = raw.length
    raw.push(rec)
  }

  function addLearn({ rel, series, topic, sections, qa = [], qaPool = qa, objectives, defaultModule, part, unitKey = '', mixed = false }) {
    const learn = sections.filter((s) => s.kind === 'learn')
    if (!learn.length) return
    const totalProse = learn.reduce((n, s) => n + proseLength(s.body), 0)
    const hasCode = learn.some((s) => /```/.test(s.body))
    if (totalProse < 150 && !hasCode) return
    const mod = moduleFor(`${topic}`, { rel, series, defaultModule, mixed })
    const learnLen = learn.reduce((n, s) => n + s.body.length, 0)
    if (learnLen > LEARN_SPLIT_OVER && learn.length > 1) {
      const parts = chunkSections(learn, LEARN_PART_CHARS)
      parts.forEach((secs, i) => {
        push({
          kind: 'learn',
          rel,
          series,
          topic: `${topic} (Part ${i + 1} of ${parts.length})`,
          mod,
          part,
          unitKey: `${unitKey}-p${i}`,
          sections: secs,
          qa: i === 0 ? qa : [],
          qaPool,
          objectives: i === 0 && objectives?.length ? objectives : null,
          summary: null,
        })
      })
      return
    }
    push({
      kind: 'learn',
      rel,
      series,
      topic,
      mod,
      part,
      unitKey,
      sections: learn,
      qa,
      qaPool,
      objectives: objectives?.length ? objectives : null, // null → derived after dedupe
      summary: null, // derived after dedupe
    })
  }

  function addCompanion({ kind, rel, series, topic, sections, qa = [] }) {
    if (!sections.length) return
    const mod = kind === 'interview' ? MOD_INTERVIEW : kind === 'exercise' ? MOD_EXERCISES : MOD_PROJECTS
    const parts = chunkSections(sections, COMPANION_PART_CHARS)
    parts.forEach((secs, i) => {
      const t = parts.length > 1 ? `${topic} (Part ${i + 1})` : topic
      const label = kind === 'interview' ? 'Interview Q&A' : kind === 'exercise' ? 'Exercises' : 'Projects'
      const count = kind === 'interview' ? Math.max(qa.length, extractQA(secs.map((s) => `### ${s.title}\n${s.body}`).join('\n')).length) : 0
      push({
        kind,
        rel,
        series,
        topic: t,
        mod,
        part: i + 1,
        unitKey: `${kind}-${i}`,
        sections: secs,
        qa: kind === 'interview' ? qa : [],
        qaPool: qa,
        objectives:
          kind === 'interview'
            ? [`Answer ${count || 'the'} ${topic} interview questions out loud`, 'Lead with the concept, then a small example, then a tradeoff']
            : kind === 'exercise'
              ? [`Solve the ${topic} exercises without looking at the lesson`, 'Test edge cases and explain your approach']
              : [`Build the ${topic} projects end to end`, 'Keep a short README with assumptions and tradeoffs'],
        summary:
          kind === 'interview'
            ? `${label} for ${topic}${count ? ` — ${count} questions with model answers` : ''}${parts.length > 1 ? ` (part ${i + 1} of ${parts.length})` : ''}.`
            : summaryFrom(secs, `${label} for ${topic}.`),
      })
    })
  }

  /** Route sections of one document/unit to learn + companion collections. */
  function routeSections(sections, kindOverride, force = false) {
    const out = { learn: [], interview: [], exercise: [], project: [], objectives: [] }
    for (const s of sections) {
      let kind = s.kind
      if (kind === 'meta') continue
      if (kind === 'objectives') {
        out.objectives.push(...bullets(s.body))
        continue
      }
      if (kindOverride && (force || kindOverride !== 'interview')) kind = kindOverride
      out[kind].push({ ...s, kind })
    }
    return out
  }

  /* ------------------------------------------------------------- addDoc */
  function addDoc({ rel, md, series, title, kindOverride = null, forceKind = false, defaultModule, preferUnits = true, dropHeadings }) {
    const fixed = repairFences(md)
    const topic = cleanTitle(title || docTitle(fixed, undefined, path.basename(rel)))
    if (preferUnits) {
      const u = splitUnits(fixed)
      const avg = u ? u.units.reduce((n, x) => n + proseLength(x.body), 0) / u.units.length : 0
      if (u && u.units.length >= 3 && fixed.length > 30_000 && avg >= 3000) {
        return addCourse({ rel, md: fixed, series: series || seriesName(topic), defaultModule, units: u, courseTitle: topic, kindOverride })
      }
    }
    const sectionsRaw = docSections(fixed, dropHeadings).map((s) =>
      // the document's own title as a section heading reads as noise; call it what it is
      cleanTitle(s.title) === topic || headingsOf(fixed, 1).some((h) => h.title === s.title) ? { ...s, title: 'Introduction' } : s,
    )
    const routed = routeSections(sectionsRaw, kindOverride, forceKind)
    const qa = extractQA(routed.interview.map((s) => s.body).join('\n\n'))
    const ser = series || seriesName(topic)

    const learnLen = routed.learn.reduce((n, s) => n + s.body.length, 0)
    if (learnLen > LEARN_SPLIT_OVER) {
      const parts = chunkSections(routed.learn, LEARN_PART_CHARS)
      parts.forEach((secs, i) => {
        const names = secs.map((s) => cleanTitle(s.title).replace(/^\d+(?:\.\d+)*[.)]?\s+/, '')).filter((t) => !GENERIC_SECTION.test(t))
        const label = names.slice(0, 2).join(' · ') + (names.length > 2 ? ' …' : '')
        addLearn({
          rel,
          series: ser,
          topic: `${seriesName(topic)} ${i + 1}/${parts.length}: ${label || `Part ${i + 1}`}`,
          sections: secs,
          qa: i === 0 ? qa : [],
          qaPool: qa,
          objectives: i === 0 ? routed.objectives : undefined,
          defaultModule,
          part: i + 1,
          unitKey: `p${i}`,
        })
      })
    } else {
      addLearn({ rel, series: ser, topic, sections: routed.learn, qa, objectives: routed.objectives, defaultModule, part: 1 })
    }
    addCompanion({ kind: 'interview', rel, series: ser, topic, sections: routed.interview, qa })
    addCompanion({ kind: 'exercise', rel, series: ser, topic, sections: routed.exercise })
    addCompanion({ kind: 'project', rel, series: ser, topic, sections: routed.project })
  }

  /* ---------------------------------------------------------- addCourse */
  function addCourse({ rel, md, series, defaultModule, units, courseTitle, kindOverride = null, mixed = false }) {
    const fixed = repairFences(md)
    const u = units || splitUnits(fixed)
    const title = cleanTitle(courseTitle || docTitle(fixed, undefined, path.basename(rel)))
    const ser = series || seriesName(title)
    if (!u) return addDoc({ rel, md: fixed, series: ser, title, defaultModule, preferUnits: false, kindOverride })

    const courseQA = []
    const perUnit = []
    for (const unit of u.units) {
      const secs = splitSections(unit.body, { minLevel: unit.level + 1, fallbackTitle: 'Introduction' })
      // A unit titled "Hands-on Tasks" / "Scenario-Based Interview Questions" decides the kind of all its sections.
      const unitKind = classifyHeading(unit.title)
      const forced = ['interview', 'exercise', 'project'].includes(unitKind)
      const routed = routeSections(secs, forced ? unitKind : kindOverride, forced)
      if (forced) {
        // keep the whole chapter as one section (its Q1…Q10 / Task 1…5 stay as sub-headings)
        routed[unitKind] = [{ title: unit.title, kind: unitKind, body: unit.body, whole: true }]
      }
      const qa = extractQA(routed.interview.map((s) => s.body).join('\n\n'))
      courseQA.push(...qa)
      perUnit.push({ unit, routed, qa })
    }
    const interview = []
    const exercise = []
    const project = []
    perUnit.forEach(({ unit, routed, qa }, i) => {
      addLearn({
        rel,
        series: ser,
        topic: unit.title,
        sections: routed.learn,
        qa,
        qaPool: courseQA,
        objectives: routed.objectives,
        defaultModule,
        mixed,
        part: i + 1,
        unitKey: `u${i}-${slugify(unit.title)}`,
      })
      const label = (s) => (s.whole ? unit.title : `${unit.title} — ${cleanTitle(s.title).replace(/^\d+\s+/, '')}`)
      for (const s of routed.interview) interview.push({ ...s, title: label(s) })
      for (const s of routed.exercise) exercise.push({ ...s, title: label(s) })
      for (const s of routed.project) project.push({ ...s, title: label(s) })
    })
    addCompanion({ kind: 'interview', rel, series: ser, topic: ser, sections: interview, qa: courseQA })
    addCompanion({ kind: 'exercise', rel, series: ser, topic: ser, sections: exercise })
    addCompanion({ kind: 'project', rel, series: ser, topic: ser, sections: project })
  }

  /* ---------------------------------------------------------- addPython */
  function addPython({ rel, code, series, topic, kindOverride = null, defaultModule }) {
    const units = splitPython(code)
    const sections = units.map((unit) => ({
      title: unit.title,
      kind: 'learn',
      body: [unit.doc ? `${unit.doc}\n` : '', '```python', unit.code, '```'].join('\n'),
    }))
    const name = cleanTitle(topic || path.basename(rel, '.py').replace(/^v\d+_/, '').replace(/[_-]+/g, ' '))
    const niceTopic = name.replace(/\b\w/g, (c) => c.toUpperCase())
    if (kindOverride === 'exercise' || kindOverride === 'project') {
      addCompanion({ kind: kindOverride, rel, series, topic: niceTopic, sections })
      return
    }
    const mod = moduleFor(niceTopic, { rel, series, defaultModule })
    const doc = units[0]?.doc || ''
    push({
      kind: 'learn',
      rel,
      series,
      topic: niceTopic,
      mod,
      part: 1,
      unitKey: 'py',
      sections,
      qa: [],
      qaPool: [],
      objectives: [`Read and run the ${niceTopic} program`, 'Predict the output before running each part', 'Change one line and explain the new behaviour'],
      summary: doc ? firstSentences(doc, 2, 240) : `Runnable ${niceTopic} program, walked through function by function.`,
      isCode: true,
    })
  }

  /* ----------------------------------------------------------- finalize */
  function finalize({ diagrams = [] } = {}) {
    // order: module → series rank → series → original sequence
    const recs = [...raw].sort((a, b) => {
      if (a.mod.id !== b.mod.id) return a.mod.id.localeCompare(b.mod.id)
      const ra = seriesRank(a.series, a)
      const rb = seriesRank(b.series, b)
      if (ra !== rb) return ra - rb
      if (a.series !== b.series) return a.series.localeCompare(b.series)
      return a._seq - b._seq
    })

    // cross-lesson section dedupe (keep first occurrence)
    const seen = new Set()
    let dropped = 0
    for (const r of recs) {
      r.sections = r.sections.filter((s) => {
        const body = tidy(s.body)
        if (body.length < 400) return true
        const k = bodyKey(body)
        if (seen.has(k)) {
          dropped++
          return false
        }
        seen.add(k)
        return true
      })
    }
    let live = recs.filter((r) => r.sections.length && r.sections.some((s) => proseLength(s.body) > 80 || /```/.test(s.body)))

    // Tiny companion lessons from the same series become one combined lesson.
    const SMALL = 6_000
    const sizeOf = (r) => r.sections.reduce((n, s) => n + s.body.length, 0)
    const groups = new Map()
    for (const r of live) if (r.kind === 'interview') groups.set(r.series, [...(groups.get(r.series) || []), r])
    const mergeable = new Set(
      [...groups.entries()].filter(([, rs]) => rs.length > 2 && rs.every((r) => sizeOf(r) < SMALL)).map(([s]) => s),
    )
    const merged = []
    const bank = new Map()
    for (const r of live) {
      if (r.kind !== 'interview' || !mergeable.has(r.series)) {
        merged.push(r)
        continue
      }
      const key = `${r.kind}|${r.series}`
      if (!bank.has(key)) {
        const label = r.kind === 'interview' ? 'question bank' : r.kind === 'exercise' ? 'practice set' : 'project ideas'
        const host = { ...r, topic: `${r.series} — ${label}`, sections: [], qa: [], qaPool: [], unitKey: `bank-${r.kind}`, summary: null, objectives: r.objectives, members: 0 }
        bank.set(key, host)
        merged.push(host)
      }
      const host = bank.get(key)
      host.members++
      host.sections.push(...r.sections.map((s) => ({ ...s, title: r.sections.length === 1 || /^(introduction|overview)$/i.test(s.title) ? r.topic : `${r.topic} — ${s.title}` })))
      host.qa.push(...r.qa)
      host.qaPool.push(...(r.qaPool || []))
    }
    for (const host of bank.values()) {
      if (host.members === 1) host.topic = host.sections[0]?.title || host.topic
      if (!host.summary) {
        const n = host.kind === 'interview' ? extractQA(host.sections.map((s) => s.body).join('\n')).length : 0
        host.summary = host.kind === 'interview' ? `Practice questions from ${host.series} (${host.sections.length} topics${n ? `, ${n} with model answers` : ''}).` : `${host.series}: ${host.sections.length} topics.`
      }
    }
    live = merged

    // build lessons
    const lessons = live.map((r, i) => {
      const used = new Set()
      const sections = r.sections.map((s) => makeSection(s.title, s.body, { usedIds: used, walk: r.kind === 'learn' && !r.isCode }))
      let quiz = r.kind === 'learn' || r.kind === 'interview' ? quizFromQA(r.qa, r.qaPool, 5) : []
      const id = `${prefix}-${r.mod.id}-${slugify(r.topic).slice(0, 48)}-${hash(`${r.rel}|${r.kind}|${r.unitKey}|${r.part}`, 6)}`
      return {
        id,
        trackId,
        title: `${r.mod.id}. ${r.mod.name}: ${r.topic}`.slice(0, 140),
        summary: r.summary || summaryFrom(r.sections, coversLine(r.sections, r.topic)),
        order: i + 1,
        objectives: r.objectives || objectivesFrom(r.sections, r.topic),
        sections,
        quiz: quiz.length ? quiz : undefined,
        sourceFile: r.rel,
        labIds: trackId === 'python' ? labIdsFor(r.topic, r.rel) : [],
        series: r.series,
        kind: r.kind,
      }
    })

    // series position numbers (per module + series)
    const counters = new Map()
    const totals = new Map()
    for (const l of lessons) {
      const k = `${l.title.slice(0, 2)}|${l.series}`
      totals.set(k, (totals.get(k) || 0) + 1)
    }
    for (const l of lessons) {
      const k = `${l.title.slice(0, 2)}|${l.series}`
      const n = (counters.get(k) || 0) + 1
      counters.set(k, n)
      l.part = n
      l.partCount = totals.get(k)
    }

    // curated diagrams
    const placed = placeDiagrams(lessons, diagrams)
    return { lessons, stats: { candidates: raw.length, droppedSections: dropped, diagramsPlaced: placed.placed, diagramsMissed: placed.missed } }
  }

  return { addDoc, addCourse, addPython, finalize }
}

function placeDiagrams(lessons, diagrams) {
  const missed = []
  let placed = 0
  const learn = lessons.filter((l) => l.kind === 'learn')
  for (const d of diagrams) {
    const w = d.where || {}
    const candidates = learn.filter(
      (l) =>
        (!w.source || w.source.test(l.sourceFile)) &&
        (!w.topic || w.topic.test(l.title)) &&
        (!w.module || l.title.startsWith(`${w.module}.`)),
    )
    let target = null
    let section = null
    for (const l of candidates) {
      const s = w.section ? l.sections.find((x) => w.section.test(x.title)) : l.sections[0]
      if (s) {
        target = l
        section = s
        break
      }
    }
    if (!target && candidates.length && w.section && w.fallbackFirst) {
      target = candidates[0]
      section = target.sections[0]
    }
    if (!target) {
      missed.push(d.id)
      continue
    }
    section.diagrams = section.diagrams || []
    section.diagrams.push({ id: d.id, title: d.title, mermaid: d.mermaid.trim(), explain: d.explain.trim() })
    placed++
  }
  return { placed, missed }
}

/* ---------------------------------------------------------------- output */

export function writeTrack({ outDir, trackId, track, lessons, extraIndexFields = () => ({}) }) {
  const libDir = path.join(outDir, trackId)
  const lessonsDir = path.join(libDir, 'lessons')
  fs.mkdirSync(lessonsDir, { recursive: true })
  for (const f of fs.readdirSync(lessonsDir)) if (f.endsWith('.json')) fs.unlinkSync(path.join(lessonsDir, f))
  for (const lesson of lessons) {
    const safe = lesson.id.replace(/[^a-z0-9-_]/gi, '_').slice(0, 100)
    const { text, count } = redactSecrets(JSON.stringify(lesson))
    if (count) console.log(`  redacted ${count} API key(s) in ${lesson.sourceFile}`)
    fs.writeFileSync(path.join(lessonsDir, `${safe}.json`), text)
  }
  fs.writeFileSync(
    path.join(outDir, `${trackId}.json`),
    JSON.stringify(
      lessons.map((l) => ({
        id: l.id,
        trackId,
        title: l.title,
        summary: l.summary,
        order: l.order,
        objectives: l.objectives,
        sourceFile: l.sourceFile,
        labIds: l.labIds,
        series: l.series,
      })),
      null,
      1,
    ),
  )

  const indexPath = path.join(outDir, 'index.json')
  let index = { generatedAt: new Date().toISOString(), tracks: [], lessonsByTrack: {} }
  if (fs.existsSync(indexPath)) index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  index.generatedAt = new Date().toISOString()
  index.tracks = (index.tracks || []).filter((t) => t.id !== trackId)
  const entry = { ...track, lessonCount: lessons.length }
  if (trackId === 'python') index.tracks.unshift(entry)
  else {
    const pyIdx = index.tracks.findIndex((t) => t.id === 'python')
    index.tracks.splice(pyIdx >= 0 ? pyIdx + 1 : 0, 0, entry)
  }
  index.lessonsByTrack = index.lessonsByTrack || {}
  index.lessonsByTrack[trackId] = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    summary: l.summary,
    order: l.order,
    series: l.series,
    part: l.part,
    partCount: l.partCount,
    ...extraIndexFields(l),
  }))
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
}

export function unitTitle(t) {
  return unitDisplayTitle(t)
}

export { plain }
