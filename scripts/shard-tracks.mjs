/**
 * Split the monolithic GenAI track files (rag.json, multi-agent.json, …) into one JSON file per lesson,
 * so the site downloads a single lesson instead of a whole 5–12 MB track.
 *
 *   src/content/generated/<track>.json                 → slim list (id, title, summary, order, …)
 *   src/content/generated/<track>/lessons/<id>.json    → one full lesson each
 *
 * Also trims summaries in index.json (it is bundled with every page).
 * Idempotent: a track whose <track>.json is already a slim list is left alone.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { redactSecrets } from './redact.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'src', 'content', 'generated')
const SUMMARY_MAX = 220

const safeName = (id) => id.replace(/[^a-z0-9-_]/gi, '_').slice(0, 100)
const trim = (s, n = SUMMARY_MAX) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t
}

const index = JSON.parse(fs.readFileSync(path.join(outDir, 'index.json'), 'utf8'))
let sharded = 0
for (const track of index.tracks) {
  const file = path.join(outDir, `${track.id}.json`)
  if (!fs.existsSync(file)) continue
  const list = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(list) || !list.length || !list[0].sections) continue // already slim
  const dir = path.join(outDir, track.id, 'lessons')
  fs.mkdirSync(dir, { recursive: true })
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) fs.unlinkSync(path.join(dir, f))
  for (const lesson of list) fs.writeFileSync(path.join(dir, `${safeName(lesson.id)}.json`), redactSecrets(JSON.stringify(lesson)).text)
  const slim = list.map((l) => ({
    id: l.id,
    trackId: l.trackId,
    title: l.title,
    summary: trim(l.summary),
    order: l.order,
    objectives: l.objectives,
    labIds: l.labIds,
    series: l.series,
  }))
  const before = fs.statSync(file).size
  fs.writeFileSync(file, JSON.stringify(slim, null, 1))
  console.log(`  ${track.id}: ${list.length} lessons → ${track.id}/lessons/ (${(before / 1e6).toFixed(1)} MB monolith removed)`)
  sharded++
}

// index.json ships in the main bundle: keep it small
const beforeIdx = JSON.stringify(index).length
for (const list of Object.values(index.lessonsByTrack || {})) for (const l of list) l.summary = trim(l.summary, 150)
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1))
console.log(`Sharded ${sharded} track(s); index.json ${(beforeIdx / 1024).toFixed(0)} KB → ${(JSON.stringify(index).length / 1024).toFixed(0)} KB`)
