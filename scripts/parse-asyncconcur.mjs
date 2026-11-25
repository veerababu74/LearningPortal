/**
 * asyncconcur/ → Async & Concurrency track.
 *
 * Sources (each used once):
 *   concurrent/NN_*.md              20-chapter core course
 *   async/dayN-*.md                 10-day bootcamp (the "master guide" is these days concatenated → skipped)
 *   async/topicN-*.md               Python internals deep dive
 *   concurrentprograming/**         hands-on workshop (READMEs, examples, exercises, projects)
 *   src/content/asyncconcur/sources/fastapi-async-interview-guide.md   (converted from the PDF)
 *
 * Learn modules 01–07, then Exercises (10), Projects (11), Interview (12).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanTitle, headingsOf } from './course-kit.mjs'
import { createTrack, writeTrack } from './track-builder.mjs'
import { ASYNC_DIAGRAMS } from './diagrams-async.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
// Source material lives in .bin/ (never pushed to GitHub); a root-level copy also works.
const srcRoot = [path.join(root, 'asyncconcur'), path.join(root, '.bin', 'asyncconcur')].find((d) => fs.existsSync(d)) || path.join(root, '.bin', 'asyncconcur')
const extraRoot = path.join(root, 'src', 'content', 'asyncconcur', 'sources')
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK = {
  id: 'asyncconcur',
  title: 'Async & Concurrency',
  tagline: 'Learn → Exercises → Projects → Interview',
  description:
    'Threading, multiprocessing, asyncio, Python internals and production FastAPI — the full asyncconcur course with curated flow diagrams, exercises, projects and interview drills.',
  accent: '#0f766e',
}

const M = {
  '01': { id: '01', name: 'Fundamentals' },
  '02': { id: '02', name: 'Threading' },
  '03': { id: '03', name: 'Multiprocessing' },
  '04': { id: '04', name: 'AsyncIO' },
  '05': { id: '05', name: 'Advanced Patterns' },
  '06': { id: '06', name: 'Production' },
  '07': { id: '07', name: 'Python Internals' },
}

const SERIES = {
  course: 'Concurrency Course',
  bootcamp: '10-Day Bootcamp',
  workshop: 'Hands-on Workshop',
  fastapi: 'FastAPI Async Interview Guide',
  internals: 'Python Internals Deep Dive',
}
const SERIES_RANK = { [SERIES.course]: 10, [SERIES.bootcamp]: 20, [SERIES.workshop]: 30, [SERIES.fastapi]: 40, [SERIES.internals]: 50 }

const CHAPTER_MODULE = {
  '00': '01', '01': '01',
  '02': '02', '03': '02', '04': '02',
  '05': '03', '06': '03', '07': '03',
  '08': '04', '09': '04', '10': '04', '11': '04', '13': '04',
  '12': '05', '14': '05', '15': '05',
  '16': '06', '17': '06', '18': '06', '19': '06', '20': '06',
}
const DAY_MODULE = { 1: '02', 2: '02', 3: '03', 4: '03', 5: '04', 6: '04', 7: '04', 8: '04', 9: '05', 10: '06' }
const WORKSHOP_MODULE = { '01_threading': '02', '02_multiprocessing': '03', '03_asynchronous': '04', '04_advanced_patterns': '05' }

function rel(full) {
  return path.relative(srcRoot, full).split(path.sep).join('/')
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '__pycache__'].includes(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (/\.(md|py)$/i.test(e.name)) acc.push(full)
  }
  return acc
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.log('asyncconcur sources not found (.bin/asyncconcur) — skipping, keeping the committed generated lessons.')
    process.exit(0)
  }
  const files = walk(srcRoot)
  // H1 titles shared by several files ("Python Concurrency Mastery — 10-Day Complete Guide") are banners.
  const h1Count = new Map()
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const first = headingsOf(fs.readFileSync(f, 'utf8'), 1)[0]?.title
    if (first) h1Count.set(first, (h1Count.get(first) || 0) + 1)
  }
  const shared = new Set([...h1Count].filter(([, n]) => n > 1).map(([t]) => t))

  const track = createTrack({
    trackId: 'asyncconcur',
    prefix: 'ac',
    moduleFor: (_topic, ctx) => M[ctx.defaultModule] || M['01'],
    seriesRank: (s) => SERIES_RANK[s] ?? 60,
  })

  const used = []
  const skipped = []
  for (const full of files.sort()) {
    const r = rel(full)
    const raw = fs.readFileSync(full, 'utf8')
    if (/master-guide/i.test(r)) {
      skipped.push(`${r} (concatenation of the day files)`)
      continue
    }
    const title = (md) => {
      const h1 = headingsOf(md, 1).filter((h) => !h.banner)
      return cleanTitle((h1.find((h) => !shared.has(h.title)) || h1[0])?.title || path.basename(r))
    }

    let m
    if ((m = r.match(/^concurrent\/(\d{2})_/))) {
      const chapter = m[1]
      if (chapter === '00') {
        // table of contents: keep only its "when to use what" reference
        track.addDoc({ rel: r, md: raw, series: SERIES.course, title: 'Course map: when to use what', defaultModule: '01', preferUnits: false, dropHeadings: shared })
      } else {
        track.addDoc({
          rel: r,
          md: raw,
          series: SERIES.course,
          title: title(raw).replace(/^Chapter\s+\d+:\s*/i, ''),
          defaultModule: CHAPTER_MODULE[chapter] || '01',
          kindOverride: chapter === '19' ? 'project' : null,
          preferUnits: false,
          dropHeadings: shared,
        })
      }
    } else if ((m = r.match(/^async\/day(\d+)-/))) {
      track.addDoc({ rel: r, md: raw, series: SERIES.bootcamp, title: title(raw), defaultModule: DAY_MODULE[+m[1]] || '04', preferUnits: false, dropHeadings: shared })
    } else if (/^async\/topic\d+-/.test(r)) {
      track.addDoc({ rel: r, md: raw, series: SERIES.internals, title: title(raw), defaultModule: '07', preferUnits: false, dropHeadings: shared })
    } else if (r.startsWith('concurrentprograming/')) {
      const folder = r.split('/')[1]
      const mod = WORKSHOP_MODULE[folder] || '01'
      const kind = /\/exercises\//.test(r) ? 'exercise' : /\/projects\/|industry_projects/.test(r) ? 'project' : null
      if (r.endsWith('.py')) {
        track.addPython({ rel: r, code: raw, series: SERIES.workshop, defaultModule: mod, kindOverride: kind })
      } else {
        const t = title(raw)
        const nice = r === 'concurrentprograming/README.md' ? 'Workshop overview' : t
        track.addDoc({ rel: r, md: raw, series: SERIES.workshop, title: nice, defaultModule: mod, kindOverride: kind, preferUnits: false, dropHeadings: shared })
      }
    } else {
      skipped.push(`${r} (unrecognised location)`)
      continue
    }
    used.push(r)
  }

  // FastAPI interview guide (converted once from the PDF by scripts/pdf-to-md.py)
  const guide = path.join(extraRoot, 'fastapi-async-interview-guide.md')
  if (fs.existsSync(guide)) {
    const md = fs.readFileSync(guide, 'utf8').replace(/<!--[\s\S]*?-->/g, '')
    track.addCourse({
      rel: 'sources/fastapi-async-interview-guide.md',
      md,
      series: SERIES.fastapi,
      courseTitle: 'Asynchronous Programming with FastAPI',
      defaultModule: '06',
    })
    used.push('Async_Programming_FastAPI_Interview_Guide.pdf (via sources/fastapi-async-interview-guide.md)')
  }

  const { lessons, stats } = track.finalize({ diagrams: ASYNC_DIAGRAMS })
  // the generic rel for the guide should point at the converted file
  for (const l of lessons) if (l.sourceFile.startsWith('sources/')) l.sourceFile = `async/Async_Programming_FastAPI_Interview_Guide.pdf`
  writeTrack({ outDir, trackId: 'asyncconcur', track: TRACK, lessons })

  const byMod = {}
  for (const l of lessons) {
    const k = l.title.slice(0, 2)
    byMod[k] = (byMod[k] || 0) + 1
  }
  console.log(`Async track: ${lessons.length} lessons from ${used.length} sources (${stats.candidates} candidates)`)
  console.log('  by module:', byMod)
  console.log(`  duplicate sections removed: ${stats.droppedSections}`)
  console.log(`  curated diagrams placed: ${stats.diagramsPlaced}/${ASYNC_DIAGRAMS.length}`)
  if (stats.diagramsMissed.length) console.log('  NOT placed:', stats.diagramsMissed.join(', '))
  if (skipped.length) console.log('  skipped:', skipped.join('; '))
}

main()
