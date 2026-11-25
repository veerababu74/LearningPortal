/**
 * "Python copy/" → Python track.
 *
 * Every source is used once; true duplicates are removed by content:
 *   - topics/topics/**                 exact copy of topics/**                    → skipped
 *   - thu_apr_30 / sun_apr_19 plans    same or older copy of the sun_may_03 plan → course-level dedupe
 *   - chat-export courses repeated across exports (Strings ×3, Sets/File/Dataclasses ×2, OOP ×2)
 *                                      → the longest version of each course is kept
 *   - v1_*.py scripts that Copilot also printed inside an export → skipped when the export already
 *     contains their code (codeCoverage ≥ 0.5)
 *   - sat_may_30 (deep learning) and ai-ml-interview-guide       → out of scope for the Python track
 *
 * Each chat course becomes a series: one Learn lesson per Concept/Chapter (explanation + examples),
 * its interview Q&A → Interview module, its coding challenges → Exercises module.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cleanTitle,
  codeCoverage,
  extractQA,
  hash,
  headingsOf,
  isChatExport,
  parseChatExport,
  plain,
  splitUnits,
} from './course-kit.mjs'
import { createTrack, seriesName, writeTrack } from './track-builder.mjs'
import { PYTHON_DIAGRAMS } from './diagrams-python.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
// Source material lives in .bin/ (never pushed to GitHub); a root-level copy also works.
const srcRoot = [path.join(root, 'Python copy'), path.join(root, '.bin', 'Python copy')].find((d) => fs.existsSync(d)) || path.join(root, '.bin', 'Python copy')
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK = {
  id: 'python',
  title: 'Python Mastery',
  tagline: 'Learn → Exercises → Projects → Interview',
  description:
    'Every guide, course and interview pack from the Python copy folder — one lesson per concept with full explanations, examples, flow diagrams, exercises and model interview answers.',
  accent: '#1f6feb',
}

const MODULES = {
  '01': { id: '01', name: 'Fundamentals' },
  '02': { id: '02', name: 'Data Structures' },
  '03': { id: '03', name: 'Functions' },
  '04': { id: '04', name: 'OOP' },
  '05': { id: '05', name: 'Advanced Python' },
  '06': { id: '06', name: 'Typing & Models' },
  '07': { id: '07', name: 'Concurrency' },
  '08': { id: '08', name: 'Files & Errors' },
  '09': { id: '09', name: 'Backend Python' },
}

/** Topic → module, used for mixed courses (interview plan, "missing topics", core concepts). Order matters. */
const TOPIC_RULES = [
  ['07', /thread|multiprocess|asyncio|\basync\b|asynchronous|\bgil\b|concurren|coroutine|event loop|semaphore|deadlock|race condition|executor/i],
  ['06', /pydantic|typing|type hint|dataclass|\benums?\b|\battrs\b|named ?tuple/i],
  ['05', /decorator|generator|iterator|context manager|magic|dunder|descriptor|metaclass|itertools|functools|match.?case|metaprogramming|\bast\b|abstract syntax|introspection/i],
  ['08', /exception|\btry\b|\bexcept\b|error handling|errors?\b|file|pathlib|os module|\bos\b|\bcsv\b|\bjson\b|logging|serializ|pickle|shelve|datetime|requests|subprocess|system interaction|argparse|argument parsing|\bcli\b|\bstruct\b|binary data|hashlib|secrets|crypto/i],
  ['01', /memory|garbage|reference count|refcount|weakref|interning|deepcopy|\bcopy\b|cloning|bit manipulation|bitwise|math|statistics|string formatting|idioms/i],
  ['03', /functions?\b|arguments?\b|args|kwargs|lambda|\bmap\b|filter|reduce|zip|enumerate|sorted|scope|legb|closure|higher.order|partial|functional|\beval\b|\bexec\b|built-?ins?|packing/i],
  ['04', /\boop\b|object.oriented|class(es)?\b|objects?\b|inherit|encapsul|polymorph|abstract|\bmro\b|super\(|composition|solid|design pattern|singleton|factory|observer|strategy|mixin|propert(y|ies)|interface|protocol|\bddd\b|repository|slots/i],
  ['02', /lists?\b|tuples?\b|dict|\bsets?\b|collections|comprehension|data structure|dsa|algorithm|sort|search|binary|tree|\bbst\b|graph|stack|queue|heap|linked list|hash|recursion|big.?o|complexity|array/i],
  ['01', /variables?|data types?|operators?|control flow|\bstrings?\b|fundamentals/i],
  ['09', /fastapi|\bsql\b|database|\bapi\b|auth|jwt|caching|cache|redis|migration|alembic|config|environment variables|\.env|architecture|system design|docker|\bgit\b|testing|pytest|\brest\b|code quality|networking|sockets?/i],
]

function moduleByTopic(text) {
  for (const [id, re] of TOPIC_RULES) if (re.test(text)) return id
  return null
}

/* ----------------------------------------------------------- series config */

const SERIES_RANK = {
  'Core Guides': 10,
  'OOP Course': 12,
  'OOP Masterclass': 14,
  'Topic Workshops': 20,
  'Deep-Dive Notes': 40,
  'OOP Interview Deep Dives': 45,
  'Interview Rebuild Plan': 50,
  'Advanced Python Topics': 52,
  'Backend Essentials': 54,
  'Backend Interview Guide': 56,
  'Reference Scripts': 70,
}
const COURSE_RANK = 30 // chat-export masterclasses sit between workshops and notes

/** Chat courses: key → { series, module, mixed } (key = normalised H1). */
const COURSE_META = [
  [/strings/i, { series: 'Strings Masterclass', module: '01' }],
  [/\bsets\b/i, { series: 'Sets Masterclass', module: '02' }],
  [/file handling/i, { series: 'File Handling Masterclass', module: '08' }],
  [/dataclasses|pydantic|enum/i, { series: 'Dataclasses, Enum & Pydantic Masterclass', module: '06' }],
  [/dictionar/i, { series: 'Dictionaries Masterclass', module: '02' }],
  [/lists?\s*&\s*tuples|lists and tuples/i, { series: 'Lists & Tuples Masterclass', module: '02' }],
  [/asynchronous programming/i, { series: 'Async Programming Masterclass', module: '07' }],
  [/core concepts/i, { series: 'Functions & Built-ins Masterclass', module: '03', mixed: true }],
  [/binary search tree/i, { series: 'Binary Search Tree Masterclass', module: '02' }],
  [/multiprocessing|multithreading/i, { series: 'Threading & Multiprocessing Masterclass', module: '07' }],
  [/comprehensions/i, { series: 'Comprehensions Masterclass', module: '02' }],
  [/memory management/i, { series: 'Memory Management Masterclass', module: '01' }],
  [/recursion/i, { series: 'Recursion Masterclass', module: '02' }],
  [/oop.*(roadmap|learning roadmap)/i, { series: 'OOP Masterclass', module: '04', rank: 14 }],
  [/advanced oop/i, { series: 'OOP Masterclass', module: '04', rank: 14 }],
  [/object internals/i, { series: 'OOP Masterclass', module: '04', rank: 14 }],
  [/everyone fails interviews|rebuild you/i, { series: 'Interview Rebuild Plan', module: '01', mixed: true }],
  [/missing topics/i, { series: 'Advanced Python Topics', module: '05', mixed: true }],
  [/49 python core topics|covered/i, { series: 'Backend Essentials', module: '09' }],
  [/deep learning|regularization techniques/i, { skip: 'deep learning — not part of the Python track' }],
]

const ROOT_GUIDES = {
  '01_Python_Fundamentals_Complete.md': '01',
  '02_Python_Functions_Complete.md': '03',
  '03_Python_OOP_Complete.md': '04',
  '04_Python_Design_Patterns_SOLID.md': '04',
  '05_Python_Decorators_Generators_Iterators.md': '05',
  '06_Python_Exception_FileHandling.md': '08',
  '07_Python_Concurrency_Threading.md': '07',
  '08_Python_Pydantic_Advanced.md': '06',
  'Python_Lists_Complete_Guide.md': '02',
  'Python_Dictionaries_Complete_Guide.md': '02',
  'Python_DSA_Roadmap.md': '02',
  'System_Design_Roadmap.md': '09',
}
const ROOT_NOTES = {
  '01_oop.md': '04',
  '02_dsa.md': '02',
  '03_file_handling.md': '08',
  '04_design_principles.md': '04',
  '05_exceptions.md': '08',
  '06_context_managers.md': '05',
  '07_concurrency.md': '07',
  '08_collections.md': '02',
  '09_comprehensions.md': '02',
  '10_dataclass_enum.md': '06',
  '11_args_kwargs_functional.md': '03',
  '12_generators_iterators.md': '05',
  '13_memory.md': '01',
  '14_strings.md': '01',
  '15_os_module.md': '08',
  '16_pydantic.md': '06',
  '17_magic_methods.md': '05',
  '18_bonus.md': '05',
  '19_coding_challenges.md': '02',
}
/** Navigation pages (tables of links to other files) — not lessons. */
const INDEX_DOCS = new Set([
  '00_README.md',
  '00_INTERVIEW_MASTERY_INDEX.md',
  'oops/README.md',
  'oops/COURSE_OVERVIEW.md',
  'python-interview-questions/README.md',
  'python-interview-questions/topics/01-oop/README.md',
])

const SKIP_DIRS = [
  /^topics\/topics(\/|$)/, // exact duplicate of topics/
  /^sat_may_30_2026/, // deep learning
  /ai-ml-interview-guide/,
  /(^|\/)\.git(\/|$)/,
]

function labIdsFor(title, rel) {
  const t = `${title} ${rel}`
  const ids = []
  if (/mutable|reference|is vs|identity|names? (and|vs) objects|id\(/i.test(t)) ids.push('name-vs-object')
  if (/default arg|mutable default/i.test(t)) ids.push('mutable-trap')
  if (/decorator/i.test(t)) ids.push('decorator-unwrap')
  if (/generator|yield/i.test(t)) ids.push('generator-stepper')
  if (/\bgil\b|asyncio|thread/i.test(t)) ids.push('gil-vs-async')
  if (/\bmro\b|inheritance|super\(\)/i.test(t)) ids.push('mro-tracer')
  return [...new Set(ids)].slice(0, 2)
}

/* ------------------------------------------------------------------ main */

function relOf(full) {
  return path.relative(srcRoot, full).split(path.sep).join('/')
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    const r = relOf(full)
    if (SKIP_DIRS.some((re) => re.test(r))) continue
    if (e.isDirectory()) walk(full, acc)
    else if (/\.(md|py)$/i.test(e.name)) acc.push(full)
  }
  return acc
}

function courseMeta(title, prompt) {
  // the course's own heading decides; the user prompt is only a fallback (it can mention other topics)
  for (const [re, meta] of COURSE_META) if (re.test(title)) return meta
  const topic = prompt.match(/python\s+(.+?)\s+concepts?\s+all/i)?.[1] || ''
  for (const [re, meta] of COURSE_META) if (topic && re.test(topic)) return meta
  return null
}

function courseKey(title, prompt) {
  const topic = prompt.match(/python\s+(.+?)\s+concepts?\s+all/i)?.[1]
  const meta = courseMeta(title, prompt)
  // courses that share a series and topic (e.g. three "Strings" courses) collapse to one key
  if (meta?.series && !/OOP Masterclass/.test(meta.series)) return `series:${meta.series}`
  return `title:${cleanTitle(title).toLowerCase().replace(/[^a-z0-9]+/g, '')}|${(topic || '').toLowerCase()}`
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.log('Python copy sources not found (.bin/Python copy) — skipping, keeping the committed generated lessons.')
    process.exit(0)
  }
  const files = walk(srcRoot).sort()
  const report = { used: [], skipped: [] }

  const track = createTrack({
    trackId: 'python',
    prefix: 'py',
    moduleFor: (topic, ctx) => {
      if (ctx.mixed) return MODULES[moduleByTopic(topic) || ctx.defaultModule] || MODULES['01']
      return MODULES[ctx.defaultModule] || MODULES[moduleByTopic(topic) || '01']
    },
    labIdsFor,
    seriesRank: (s) => SERIES_RANK[s] ?? COURSE_RANK,
  })

  /* 1. chat exports → courses (deduped across exports, longest version wins) */
  const exportText = new Map() // dir → concatenated export markdown (for .py coverage checks)
  const courses = new Map()
  for (const full of files.filter((f) => f.endsWith('.md'))) {
    const md = fs.readFileSync(full, 'utf8')
    if (!isChatExport(md)) continue
    const r = relOf(full)
    const dir = path.dirname(full)
    exportText.set(dir, `${exportText.get(dir) || ''}\n${md}`)
    for (const c of parseChatExport(md)) {
      const h1 = headingsOf(c.md, 1).filter((h) => !h.banner)[0]?.title || r
      const meta = courseMeta(h1, c.prompt)
      if (meta?.skip) {
        report.skipped.push(`${r} › ${cleanTitle(h1).slice(0, 50)} (${meta.skip})`)
        continue
      }
      const units = splitUnits(c.md)
      if (!units && c.md.length < 30_000) {
        report.skipped.push(`${r} › ${cleanTitle(h1).slice(0, 50)} (outline reply, no lessons)`)
        continue
      }
      const key = courseKey(h1, c.prompt)
      const prev = courses.get(key)
      if (prev && prev.md.length >= c.md.length) {
        report.skipped.push(`${r} › ${cleanTitle(h1).slice(0, 50)} (duplicate course; longer copy kept)`)
        continue
      }
      if (prev) report.skipped.push(`${prev.rel} › ${cleanTitle(prev.h1).slice(0, 50)} (duplicate course; longer copy kept)`)
      courses.set(key, { rel: r, h1, md: c.md, units, meta })
    }
  }
  for (const c of courses.values()) {
    const meta = c.meta || { series: seriesName(c.h1), module: moduleByTopic(c.h1) || '01' }
    track.addCourse({
      rel: c.rel,
      md: c.md,
      series: meta.series,
      courseTitle: c.h1,
      defaultModule: meta.module,
      units: c.units,
      mixed: !!meta.mixed,
    })
    report.used.push(`${c.rel} › ${meta.series}`)
  }

  /* 2. regular markdown + python files */
  const docHashes = new Set()
  for (const full of files) {
    const r = relOf(full)
    const base = path.basename(r)
    const raw = fs.readFileSync(full, 'utf8')
    if (raw.trim().length < 80) continue
    if (r.endsWith('.md') && isChatExport(raw)) continue // handled above
    if (/^(sun_apr_19|thu_apr_30)_2026_python_interview/.test(r) || /^sun_may_03_2026_animal/.test(r)) {
      report.skipped.push(`${r} (older copy of another folder)`)
      continue
    }
    if (INDEX_DOCS.has(r)) {
      report.skipped.push(`${r} (index / navigation page)`)
      continue
    }
    const h = hash(raw.replace(/\s+/g, ' '), 16)
    if (docHashes.has(h)) {
      report.skipped.push(`${r} (identical to another file)`)
      continue
    }
    docHashes.add(h)

    if (r.endsWith('.py')) {
      if (raw.replace(/^\s*#.*$/gm, '').trim().length < 600) {
        report.skipped.push(`${r} (too small to be a lesson)`)
        continue
      }
      // scripts Copilot also printed inside an export in the same folder are duplicates
      let exp = ''
      for (let d = path.dirname(full); d.startsWith(srcRoot) && d !== srcRoot; d = path.dirname(d)) {
        exp += exportText.get(d) || ''
      }
      const siblingsMd = fs
        .readdirSync(path.dirname(full))
        .filter((f) => f.endsWith('.md'))
        .map((f) => fs.readFileSync(path.join(path.dirname(full), f), 'utf8'))
        .join('\n')
      const cover = Math.max(exp ? codeCoverage(raw, exp) : 0, codeCoverage(raw, siblingsMd))
      if (cover >= 0.5) {
        report.skipped.push(`${r} (code already shown in ${exp ? 'the chat export' : 'the topic notes'})`)
        continue
      }
      const kind = /exercises?\.py$/i.test(base) ? 'exercise' : null
      let series = 'Reference Scripts'
      let mod = moduleByTopic(base.replace(/[_-]+/g, ' ')) || '05'
      let topic
      const t = r.match(/^topics\/(\d+)_([^/]+)\//)
      const o = r.match(/^oops\/topics\/(\d+)_([^/]+)\//)
      if (t) {
        series = 'Topic Workshops'
        mod = moduleByTopic(t[2].replace(/_/g, ' ')) || mod
        topic = `${t[2].replace(/_/g, ' ')} — ${kind ? 'exercises' : 'runnable examples'}`
      } else if (o) {
        series = 'OOP Course'
        mod = '04'
        topic = `${o[2].replace(/_/g, ' ')} — runnable examples`
      }
      track.addPython({ rel: r, code: raw, series, topic, kindOverride: kind, defaultModule: mod })
      report.used.push(r)
      continue
    }

    // markdown documents
    if (ROOT_GUIDES[r]) {
      track.addDoc({ rel: r, md: raw, series: 'Core Guides', defaultModule: ROOT_GUIDES[r] })
    } else if (ROOT_NOTES[r]) {
      track.addDoc({
        rel: r,
        md: raw,
        series: 'Deep-Dive Notes',
        defaultModule: ROOT_NOTES[r],
        kindOverride: /coding_challenges/.test(r) ? 'exercise' : null,
        preferUnits: false,
      })
    } else if (/^topics\/\d+_/.test(r)) {
      const folder = r.split('/')[1].replace(/^\d+_/, '').replace(/_/g, ' ')
      const kind = /mini_projects?\.md$/i.test(base) ? 'project' : /exercises?\.md$/i.test(base) ? 'exercise' : null
      const label = /README_ADVANCED/i.test(base) ? `${folder} — advanced` : folder
      track.addDoc({
        rel: r,
        md: raw,
        series: 'Topic Workshops',
        title: label.replace(/\b\w/g, (c) => c.toUpperCase()),
        defaultModule: moduleByTopic(folder) || '05',
        kindOverride: kind,
        preferUnits: false,
      })
    } else if (r.startsWith('oops/')) {
      const kind = /exercises\.md$/.test(base) ? 'exercise' : /projects\.md$|final_projects/.test(r) ? 'project' : null
      track.addDoc({ rel: r, md: raw, series: 'OOP Course', defaultModule: '04', kindOverride: kind, preferUnits: false })
    } else if (r.startsWith('python-interview-questions/topics/')) {
      track.addDoc({ rel: r, md: raw, series: 'OOP Interview Deep Dives', defaultModule: '04', preferUnits: false })
    } else if (r === 'python-interview-questions/python_backend_interview_guide.md') {
      track.addDoc({
        rel: r,
        md: raw,
        series: 'Backend Interview Guide',
        title: 'Python Backend Interview Guide',
        defaultModule: '09',
        kindOverride: 'interview',
        forceKind: true,
        preferUnits: false,
      })
    } else {
      track.addDoc({ rel: r, md: raw, series: 'Reference Notes', defaultModule: moduleByTopic(base) || '05' })
    }
    report.used.push(r)
  }

  const { lessons, stats } = track.finalize({ diagrams: PYTHON_DIAGRAMS })
  writeTrack({ outDir, trackId: 'python', track: TRACK, lessons })
  writeLegacyIndexes(lessons)

  const byMod = {}
  for (const l of lessons) byMod[l.title.slice(0, 2)] = (byMod[l.title.slice(0, 2)] || 0) + 1
  console.log(`Python track: ${lessons.length} lessons from ${report.used.length} sources (${stats.candidates} candidates)`)
  console.log('  by module:', JSON.stringify(byMod))
  console.log(`  duplicate sections removed: ${stats.droppedSections}`)
  console.log(`  curated diagrams placed: ${stats.diagramsPlaced}/${PYTHON_DIAGRAMS.length}`)
  if (stats.diagramsMissed.length) console.log('  NOT placed:', stats.diagramsMissed.join(', '))
  if (process.argv.includes('--report')) {
    console.log('\nUSED:\n  ' + report.used.join('\n  '))
    console.log('\nSKIPPED:\n  ' + report.skipped.join('\n  '))
  } else {
    console.log(`  skipped ${report.skipped.length} duplicate / out-of-scope items (run with --report for the list)`)
  }
}

/** Files consumed by the Python library + interview arena pages. */
function writeLegacyIndexes(lessons) {
  const libDir = path.join(outDir, 'python')
  const guide = path.join(srcRoot, 'python-interview-questions', 'python_backend_interview_guide.md')
  const questions = []
  if (fs.existsSync(guide)) {
    const md = fs.readFileSync(guide, 'utf8')
    const re = /###\s*Question\s+(\d+):\s*([^\n]+)\n([\s\S]*?)(?=\n###\s*Question\s+\d+:|\n##\s[^#]|$)/gi
    let m
    while ((m = re.exec(md))) {
      const body = m[3]
      const q = body.match(/\*\*Question:\*\*\s*([\s\S]*?)(?=\n\*\*Answer:\*\*|\n\*\*)/)
      const a = body.match(/\*\*Answer:\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z]|\n```)/)
      const d = body.match(/\*\*Detailed Explanation:\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z]|\n```)/)
      const code = body.match(/```(?:python)?\n([\s\S]*?)```/)
      questions.push({
        id: `backend-q${m[1]}`,
        number: Number(m[1]),
        question: plain(q?.[1] || m[2], 400),
        answer: plain(a?.[1] || '', 600),
        detail: plain(d?.[1] || '', 900),
        code: code?.[1]?.trim().slice(0, 2000) || '',
      })
    }
  }
  fs.writeFileSync(path.join(libDir, 'backend-interview.json'), JSON.stringify({ questions }, null, 2))
  fs.writeFileSync(
    path.join(libDir, 'index.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        topicCount: lessons.length,
        oopSubtopicCount: lessons.filter((l) => l.title.startsWith('04.')).length,
        backendQuestionCount: questions.length,
        topics: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          file: l.sourceFile,
          summary: l.summary,
          conceptualCount: extractQA(l.sections.map((s) => s.body).join('\n')).length,
          scenarioCount: 0,
          codeCount: l.sections.reduce((n, s) => n + (s.body.match(/```python/g) || []).length, 0),
        })),
        oopSubtopics: lessons
          .filter((l) => l.title.startsWith('04.'))
          .map((l) => ({ id: l.id, title: l.title, file: l.sourceFile, summary: l.summary })),
      },
      null,
      1,
    ),
  )
}

main()
