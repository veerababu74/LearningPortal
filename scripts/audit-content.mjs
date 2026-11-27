/**
 * Content quality audit across every generated track.
 *
 *   node scripts/audit-content.mjs            → summary per track
 *   node scripts/audit-content.mjs --list X   → list offending lessons for issue X (e.g. thin, chat, meta)
 *   node scripts/audit-content.mjs --json f   → write the full report to a file
 *
 * Issues detected (per section unless noted):
 *   thin-lesson   lesson with < 600 chars of prose and no code / figures / diagrams      (lesson)
 *   empty-section section with < 80 chars of prose and no code / figures / diagrams
 *   meta          navigation / status / housekeeping sections ("What's next", "Table of contents", …)
 *   chat          leftover chatbot filler ("Let me know if…", "Would you like me to…")
 *   code-wall     section that is > 85% code and > 6k chars with almost no explanation
 *   giant         section > 30k chars
 *   dup-title     two lessons in the same track and module with the same title         (lesson)
 *   no-summary    fallback / empty summary                                               (lesson)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gen = path.join(root, 'src', 'content', 'generated')

export const META_TITLE =
  /^(?:\d+(?:\.\d+)*[.)]?\s*)?(table of contents|contents|toc|what'?s next\??|coming up next|next steps?|up next|where to go next|related (topics|lessons)|help & support|support|navigation|quick (jump|links)|topic index.*|complete topic index.*|progress( tracker)?|completion checklist|congratulations!?|you did it.*|the end|final words|closing thoughts|stage \d+ summary|course (map|outline)|learning path by experience|how to use (this|the) (guide|course|notebook)|your learning format|session summary|changelog|license|author|about (this|the) (guide|course))\s*[:.!]?$/i

export const CHAT_RE =
  /\b(let me know if you('d| would)? (like|want)|would you like me to|want me to (continue|create|generate|explain|write)|shall i (continue|proceed|create)|i('ll| will) (continue|now create|create the next)|feel free to ask|happy (learning|coding)!|hope this helps|here'?s (the|a) (complete|comprehensive) (guide|breakdown)|type ["']?continue["']?|reply with ["']?continue|in the next (message|response|part)|as an ai\b)/i

function prose(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length
}
const codeLen = (md) => (String(md).match(/```[\s\S]*?```/g) || []).reduce((n, c) => n + c.length, 0)
const hasFigure = (md) => /!\[[^\]]*\]\(|```mermaid/.test(md)

export function auditLesson(l) {
  const issues = []
  let lessonProse = 0
  let lessonRich = 0
  for (const s of l.sections) {
    const body = String(s.body || '')
    const p = prose(body)
    const c = codeLen(body)
    lessonProse += p
    const rich =
      c > 200 ||
      hasFigure(body) ||
      (s.diagrams?.length || 0) > 0 ||
      /^\s*\|.*\|\s*$/m.test(body) ||
      (body.match(/^\s*(?:[-*+]|\d+[.)])\s+\S/gm) || []).length >= 2
    if (rich) lessonRich++
    if (META_TITLE.test(String(s.title).trim())) issues.push({ type: 'meta', section: s.title })
    else if (p < 80 && !rich) issues.push({ type: 'empty-section', section: s.title })
    if (CHAT_RE.test(body)) issues.push({ type: 'chat', section: s.title, sample: body.match(CHAT_RE)[0] })
    if (body.length > 6000 && c > body.length * 0.85 && p < 600 && !/^\*\*What this code covers\*\*/.test(body)) issues.push({ type: 'code-wall', section: s.title })
    if (body.length > 30000) issues.push({ type: 'giant', section: s.title, size: body.length })
  }
  if (lessonProse < 600 && !lessonRich) issues.push({ type: 'thin-lesson' })
  if (!l.summary || /explanations and runnable examples\.?$|^Learn .* with explanations/.test(l.summary)) issues.push({ type: 'no-summary' })
  return { prose: lessonProse, issues }
}

function main() {
  const listType = process.argv.includes('--list') ? process.argv[process.argv.indexOf('--list') + 1] : null
  const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null
  const tracks = fs.readdirSync(gen).filter((d) => fs.existsSync(path.join(gen, d, 'lessons')))
  const report = {}
  const rows = []
  for (const t of tracks) {
    const dir = path.join(gen, t, 'lessons')
    const lessons = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    const counts = {}
    const titles = new Map()
    const items = []
    for (const l of lessons) {
      const a = auditLesson(l)
      const key = `${l.title.slice(0, 2)}|${l.title.toLowerCase().replace(/[^a-z0-9]+/g, '')}`
      if (titles.has(key)) a.issues.push({ type: 'dup-title', other: titles.get(key) })
      else titles.set(key, l.id)
      for (const i of a.issues) counts[i.type] = (counts[i.type] || 0) + 1
      if (a.issues.length) items.push({ id: l.id, title: l.title, source: l.sourceFile, issues: a.issues })
    }
    report[t] = { lessons: lessons.length, counts, items }
    rows.push([t, lessons.length, counts])
  }
  const types = ['thin-lesson', 'empty-section', 'meta', 'chat', 'code-wall', 'giant', 'dup-title', 'no-summary']
  console.log('track'.padEnd(22), 'lessons'.padStart(7), ...types.map((x) => x.padStart(13)))
  for (const [t, n, c] of rows) console.log(t.padEnd(22), String(n).padStart(7), ...types.map((x) => String(c[x] || 0).padStart(13)))
  if (listType) {
    for (const [t, r] of Object.entries(report)) {
      for (const it of r.items) {
        const hits = it.issues.filter((i) => i.type === listType)
        if (hits.length) console.log(`${t} | ${it.title.slice(0, 70)} | ${hits.map((h) => h.section || h.sample || h.other || '').join(' ; ').slice(0, 140)}`)
      }
    }
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
