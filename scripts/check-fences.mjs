/**
 * Detect code-fence inversions in generated lessons: markdown that ended up inside code blocks,
 * or code comments that ended up as headings. Exit code 1 when problems are found.
 *
 *   node scripts/check-fences.mjs [--list]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gen = path.join(root, 'src', 'content', 'generated')

const MD_IN_CODE = /^(#{2,4} (Q|S|SQ|CQ|Scenario|Question|Example|Concept|CONCEPT)\s*\d+[.:)\s—-].*|#{2,4} [①②③④⑤].*|\*\*(✅|❌)\s*(Answer|Explanation).*)$/
const CODE_AS_HEADING_NEXT = /^\s{2,}\S|^\s*(def|class|for|while|if|elif|return|import|from|except|with|await|yield|raise|async)\b|^\s*(else:|try:|finally:|print\()|^[A-Za-z_][\w.]*\s*=\s*\S/

function check(body) {
  const lines = body.split('\n')
  const issues = []
  let open = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (open) {
      if (m && m[1][0] === open.ch && m[1].length >= open.len && !m[2].trim()) {
        open = null
        continue
      }
      if (open.lang !== 'markdown' && open.lang !== 'md' && MD_IN_CODE.test(line)) issues.push(`markdown inside code: ${line.slice(0, 70)}`)
      continue
    }
    if (m) {
      open = { ch: m[1][0], len: m[1].length, lang: m[2].trim().toLowerCase() }
      continue
    }
    // a "# comment" heading followed by code-looking lines = a code comment outside its fence
    if (/^# \S/.test(line)) {
      const next = lines.slice(i + 1).find((l) => l.trim())
      if (next && CODE_AS_HEADING_NEXT.test(next)) issues.push(`code outside fence: ${line.slice(0, 70)}`)
    }
  }
  return issues
}

const list = process.argv.includes('--list')
let total = 0
for (const track of fs.readdirSync(gen)) {
  const dir = path.join(gen, track, 'lessons')
  if (!fs.existsSync(dir)) continue
  let sections = 0
  let lessons = 0
  for (const f of fs.readdirSync(dir)) {
    const l = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    let hit = false
    for (const s of l.sections) {
      const issues = check(s.body)
      if (issues.length) {
        sections++
        hit = true
        if (list) console.log(`  ${track} | ${l.title.slice(0, 60)} | ${s.title.slice(0, 40)} | ${issues[0]}`)
      }
    }
    if (hit) lessons++
  }
  total += sections
  console.log(`${track.padEnd(20)} ${String(lessons).padStart(4)} lessons, ${String(sections).padStart(4)} sections with broken fences`)
}
console.log(`TOTAL sections with broken fences: ${total}`)
process.exit(total ? 1 : 0)
