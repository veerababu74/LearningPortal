/**
 * Extract every interview question from the generated interview lessons into one small map,
 * so the site can group questions by topic and drill them one at a time.
 *
 *   src/content/generated/interview-map.json
 *   { lessons: { [track]: { [id]: [title, series] } }, questions: { [track]: [[lessonId, sectionId, question, headingLine|null], …] } }
 *
 * The answer is not copied: the drill loads the lesson and slices the section from `headingLine`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gen = path.join(root, 'src', 'content', 'generated')
const TRACKS = { python: '12', agents: '12', veerarag: '22' }

const GENERIC = /^(\d+\.\s*)?(question|conceptual question|scenario[- ]based question|scenario|the question|q|scenario q|interview question)(\s*#?\d+)?\s*[:.]?$/i
const NOT_A_QUESTION = /summary|cheat ?sheet|key (concepts|takeaways)|^introduction$|^overview$|table of contents|^\d+\.\s*(conceptual|scenario)[^?]*questions(\s*\(\d+\))?$/i
const QHEAD = /^(?:\*\*)?(?:Q|S|SQ|CQ)\s*\d+[a-z]?\s*[.:)\]]|^(?:Question|Scenario)\s*\d+\s*[.:)—-]|^\d{1,3}\.\s+.{12,}\?\s*$|^.{12,}\?\s*(\*\*)?$/i

function plain(s) {
  return String(s)
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const clip = (s, n = 220) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s)

function questionsOf(section) {
  const out = []
  const lines = section.body.split('\n')
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^(#{2,6})\s+(.+)$/)
    if (!m) continue
    const text = plain(m[2])
    if (GENERIC.test(text)) {
      // the real question is the next non-empty prose line
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const t = plain(lines[j].replace(/^>\s?/, ''))
        if (t && !/^#/.test(lines[j]) && !/^(```|---)/.test(lines[j].trim())) {
          out.push([clip(t), line])
          break
        }
      }
    } else if (QHEAD.test(text)) out.push([clip(text.replace(/^\*\*|\*\*$/g, '')), line])
  }
  if (!out.length) {
    const t = plain(section.title)
    // a section titled like a question, or one topic block of questions
    if (!NOT_A_QUESTION.test(t) && !GENERIC.test(t)) out.push([clip(t), null])
  }
  return out.filter(([q]) => !GENERIC.test(q) && !NOT_A_QUESTION.test(q))
}

const result = { generatedAt: new Date().toISOString(), lessons: {}, questions: {} }
let total = 0
for (const [track, mod] of Object.entries(TRACKS)) {
  const dir = path.join(gen, track, 'lessons')
  if (!fs.existsSync(dir)) continue
  result.lessons[track] = {}
  result.questions[track] = []
  for (const f of fs.readdirSync(dir).sort()) {
    const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    if (!lesson.title.startsWith(`${mod}.`)) continue
    result.lessons[track][lesson.id] = [lesson.title.replace(/^\d{2}\.\s*[^:]+:\s*/, ''), lesson.series || '']
    for (const s of lesson.sections) {
      if (/^(introduction|overview|summary|table of contents)$/i.test(s.title.trim()) && !/\?/.test(s.body.slice(0, 400))) continue
      for (const [q, h] of questionsOf(s)) result.questions[track].push([lesson.id, s.id, q, h])
    }
  }
  total += result.questions[track].length
  console.log(`  ${track}: ${Object.keys(result.lessons[track]).length} interview lessons → ${result.questions[track].length} questions`)
}
fs.writeFileSync(path.join(gen, 'interview-map.json'), JSON.stringify(result))
console.log(`Interview map: ${total} questions (${(fs.statSync(path.join(gen, 'interview-map.json')).size / 1024).toFixed(0)} KB)`)
