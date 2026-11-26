/**
 * Parse every Mermaid diagram with mermaid's own parser:
 *   - curated diagrams (scripts/diagrams-*.mjs)
 *   - ```mermaid blocks inside generated python / asyncconcur lessons
 *
 *   node scripts/validate-diagrams.mjs            → report, exit 1 if a curated diagram fails
 *   node scripts/validate-diagrams.mjs --curated  → curated only
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'
import { ASYNC_DIAGRAMS } from './diagrams-async.mjs'
import { PYTHON_DIAGRAMS } from './diagrams-python.mjs'
import { AGENT_DIAGRAMS } from './diagrams-agents.mjs'
import { RAG_DIAGRAMS } from './diagrams-rag.mjs'

// mermaid's parser touches DOMPurify hooks; outside a browser they are missing.
for (const fn of ['addHook', 'removeHook', 'removeHooks', 'removeAllHooks', 'setConfig']) {
  if (typeof DOMPurify[fn] !== 'function') DOMPurify[fn] = () => {}
}
if (typeof DOMPurify.sanitize !== 'function') DOMPurify.sanitize = (s) => s

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function validate(source) {
  try {
    await mermaid.parse(source.trim())
    return null
  } catch (e) {
    return String(e?.message || e).split('\n').slice(0, 4).join(' ')
  }
}

async function main() {
  const curatedOnly = process.argv.includes('--curated')
  let curatedFail = 0
  for (const [name, list] of [
    ['async', ASYNC_DIAGRAMS],
    ['python', PYTHON_DIAGRAMS],
    ['agents', AGENT_DIAGRAMS],
    ['veerarag', RAG_DIAGRAMS],
  ]) {
    const ids = new Set()
    for (const d of list) {
      if (ids.has(d.id)) {
        console.log(`✗ ${name}/${d.id}: duplicate id`)
        curatedFail++
      }
      ids.add(d.id)
      const err = await validate(d.mermaid)
      if (err) {
        curatedFail++
        console.log(`✗ ${name}/${d.id}: ${err}`)
      }
    }
    console.log(`curated ${name}: ${list.length} diagrams`)
  }

  if (!curatedOnly) {
    for (const track of ['python', 'asyncconcur', 'agents', 'veerarag']) {
      const dir = path.join(root, 'src', 'content', 'generated', track, 'lessons')
      if (!fs.existsSync(dir)) continue
      let total = 0
      let bad = 0
      for (const f of fs.readdirSync(dir)) {
        const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
        for (const s of lesson.sections) {
          for (const m of String(s.body).matchAll(/```mermaid\s*\n([\s\S]*?)```/g)) {
            total++
            const err = await validate(m[1])
            if (err) {
              bad++
              console.log(`  source diagram failed: ${lesson.sourceFile} › ${s.title}: ${err.slice(0, 140)}`)
            }
          }
        }
      }
      console.log(`source ${track}: ${total} mermaid blocks, ${bad} fail to parse`)
    }
  }
  if (curatedFail) {
    console.error(`${curatedFail} curated diagram(s) failed`)
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
