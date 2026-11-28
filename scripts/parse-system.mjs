/**
 * .system/ → VeeraSystem track (System Design).
 *
 * Sources (local-only, gitignored; exact copies removed by content hash):
 *   system-design/phase-NN-x/NN-topic.md   the main curriculum: 13 phases, 191 topics. Each topic has a
 *                                          one-line definition, explanation, mermaid + ASCII visual, code
 *                                          and 14 interview questions (7 conceptual + 7 scenario)
 *   System_Design_Course/NN_x/*.md         chapter deep dives (examples, 10 exercises, 15 interview Qs),
 *                                          real-world systems and capstone projects
 *   systemdesign/                          essentials: fundamentals, building blocks, patterns, interview
 *                                          framework, and Python implementations (caches, load balancer,
 *                                          SOLID + GoF design patterns)
 *   Scalable_App_Mastery/                  scaling-to-millions playbook, 10 build projects, case studies
 *
 * Learn modules 01–15, then Exercises (20), Projects (21), Interview (22).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanTitle, hash, headingsOf } from './course-kit.mjs'
import { createTrack, writeTrack } from './track-builder.mjs'
import { pyToMd, unprintFences } from './py-lesson.mjs'
import { SD_DIAGRAMS } from './diagrams-system.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcRoot = [path.join(root, '.system'), path.join(root, '.bin', '.system')].find((d) => fs.existsSync(d)) || path.join(root, '.system')
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK = {
  id: 'veerasys',
  title: 'VeeraSystem',
  tagline: 'System Design — Learn → Visualize → Practice → Build → Interview',
  description:
    'System design from first principles: requirements and trade-offs, networking and APIs, databases, caching, load balancing, distributed systems, messaging, microservices, storage, security, observability, cloud, scaling to millions, low-level design, and 25+ full case studies — with flow diagrams, simulations, labs, projects and interview answers.',
  accent: '#0f766e',
}

export const SD_MODULES = {
  '01': { id: '01', name: 'Fundamentals & Trade-offs' },
  '02': { id: '02', name: 'Networking, Protocols & APIs' },
  '03': { id: '03', name: 'Databases & Data Modeling' },
  '04': { id: '04', name: 'Caching' },
  '05': { id: '05', name: 'Load Balancing & Scalability' },
  '06': { id: '06', name: 'Distributed Systems & Consistency' },
  '07': { id: '07', name: 'Messaging & Event-Driven Architecture' },
  '08': { id: '08', name: 'Microservices & Architecture Patterns' },
  '09': { id: '09', name: 'Storage, CDN & Data Engineering' },
  '10': { id: '10', name: 'Security & Auth' },
  '11': { id: '11', name: 'Observability & SRE' },
  '12': { id: '12', name: 'Cloud, Containers & Deployment' },
  '13': { id: '13', name: 'Scaling to Millions' },
  '14': { id: '14', name: 'Low-Level Design' },
  '15': { id: '15', name: 'System Design Case Studies' },
}
const M = SD_MODULES
const COMPANIONS = {
  exercise: { id: '20', name: 'Exercises' },
  project: { id: '21', name: 'Projects' },
  interview: { id: '22', name: 'Interview' },
}

const SERIES = {
  core: 'System Design Curriculum',
  chapters: 'Chapter Deep Dives',
  essentials: 'System Design Essentials',
  scale: 'Scalable App Mastery',
  code: 'Python Implementations',
  realWorld: 'Real-World Systems',
  capstone: 'Capstone Designs',
  builds: 'Build Projects',
  playbook: 'Interview Playbook',
}
const SERIES_RANK = {
  [SERIES.core]: 10,
  [SERIES.chapters]: 20,
  [SERIES.realWorld]: 22,
  [SERIES.scale]: 25,
  [SERIES.essentials]: 30,
  [SERIES.code]: 35,
  [SERIES.builds]: 10,
  [SERIES.capstone]: 20,
  [SERIES.playbook]: 5,
}

/** system-design phase folder → module. */
const PHASE = { '01': '01', '02': '02', '03': '03', '04': '04', '05': '05', '06': '06', '07': '07', '08': '08', '09': '09', '10': '10', '11': '11', '12': '12', '13': '15' }

/** System_Design_Course chapter file → module. */
const CHAPTER = [
  [/^01_Foundations\//, '01'],
  [/^02_Scalability_Performance\/01_/, '05'],
  [/^02_Scalability_Performance\/02_/, '05'],
  [/^02_Scalability_Performance\/03_/, '04'],
  [/^03_Database_Design\//, '03'],
  [/^04_Distributed_Systems\//, '06'],
  [/^05_Communication\/01_/, '07'],
  [/^05_Communication\//, '02'],
  [/^06_Architecture_Patterns\/01_/, '08'],
  [/^06_Architecture_Patterns\//, '07'],
  [/^07_Security_Reliability\//, '10'],
  [/^08_Content_Storage\//, '09'],
  [/^09_Data_Engineering\//, '09'],
  [/^10_Real_World_Systems\//, '15'],
]

/** Scalable_App_Mastery core concept → module. */
const SCALE = { '01': '10', '02': '13', '03': '03', '04': '13', '05': '12', '06': '13', '07': '13', '08': '13' }

/** Index / status pages — not lessons. */
const META = /(^|\/)(README|README_PATTERNS|START_HERE|LEARNING_ROADMAP)\.md$/i
const KEEP_README = /^systemdesign\/0[1-5]_[^/]+\/README\.md$|^Scalable_App_Mastery\/\d{2}_Project_[^/]+\/README\.md$/

/* --------------------------------------------------------------- helpers */

const rel = (full) => path.relative(srcRoot, full).split(path.sep).join('/')

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '__pycache__', '.venv'].includes(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (/\.(md|py)$/i.test(e.name)) acc.push(full)
  }
  return acc
}

const ACR = /\b(Api|Apis|Sql|Nosql|Cdn|Dns|Http|Https|Tcp|Ip|Udp|Osi|Grpc|Jwt|Oauth|Sla|Slo|Sli|Cap|Acid|Lru|Lfu|Ttl|Dlq|Cqrs|Hdfs|Iaas|Paas|Saas|Csrf|Xss|Rpc|Url|Ml|Rag|Llm|Ai|Aws|Gcp|Sse|Tls|Ssl|Oidc|Gof|Solid)\b/g
const upAcr = (s) => s.replace(ACR, (w) => w.toUpperCase()).replace(/\bOauth\b/gi, 'OAuth').replace(/\bGrpc\b/gi, 'gRPC')

function fileTitle(file) {
  return upAcr(
    cleanTitle(
      path
        .basename(file)
        .replace(/\.(md|py)$/i, '')
        .replace(/^\d+[_.-]*/, '')
        .replace(/[_-]+/g, ' '),
    ).replace(/\b\w/g, (c) => c.toUpperCase()),
  )
}

/** "# Chapter 2.3: Caching Strategies" / "# ⚡ Module 4: Caching, …" → the topic itself. */
function niceTitle(md, file) {
  const h1 = headingsOf(md, 1).filter((h) => !h.banner)[0]?.title
  const t = cleanTitle(h1 || '')
    .replace(/^(chapter|module|topic|part|project|lesson)\s*\d+(\.\d+)*\s*[:—–.-]\s*/i, '')
    .replace(/\s*[-—–:]\s*(the\s+)?(comprehensive|complete) guide$/i, '')
    .trim()
  return t.length > 3 ? t : fileTitle(file)
}

/**
 * Curriculum topic files open with "## Topic" (a one-line definition) and a "> Phase X · Topic Y · read
 * time" banner. The banner is noise; the definition becomes a callout at the top of the first real section.
 */
function tidyCurriculum(md) {
  return md
    .replace(/^>\s*Phase\s+\d+\s*·.*$/m, '')
    .replace(/^## Topic\s*\n([\s\S]*?)\n(## [^\n]+)\n/m, (_, def, next) => {
      const d = def.trim().replace(/\n+/g, ' ')
      return d ? `${next}\n\n> **In one line:** ${d}\n` : `${next}\n`
    })
}

/**
 * Small syntax slips in the source diagrams that stop mermaid from rendering:
 *   sequence diagrams   ";" ends a statement → a message like "Set-Cookie: a=1; HttpOnly" breaks
 *   flowchart edges     |labels with (), {} or :| must be quoted
 *   "A -- x -- label --> B" (a "broken link" drawn with an x) → a quoted label
 *   subgraph titles     with () or : need an id plus a quoted title
 *   node labels         a stray " inside ["…"] closes the label early
 */
export function fixMermaid(src) {
  const lines = src.split('\n')
  const kind = (lines.find((l) => l.trim()) || '').trim()
  let sg = 0
  return lines
    .map((l, i) => {
      if (i === 0) return l
      if (/^sequenceDiagram/.test(kind)) return l.replace(/;/g, ',')
      if (!/^(flowchart|graph)\b/.test(kind)) return l
      let out = l
        .replace(/--\s*x\s*--\s*([^-|>]+?)\s*-->/g, (_, lab) => `-- "✗ ${lab.trim()}" -->`)
        .replace(/\|([^|"]*[(){}:][^|"]*)\|/g, (_, lab) => `|"${lab.replace(/"/g, '#quot;')}"|`)
        .replace(/\["((?:[^"]|"(?!\]))*)"\]/g, (_, inner) => `["${inner.replace(/"/g, '#quot;')}"]`)
      const s = out.match(/^(\s*)subgraph\s+([^\["\n]*[():][^\["\n]*)$/)
      if (s) out = `${s[1]}subgraph sg${++sg}["${s[2].trim()}"]`
      return out
    })
    .join('\n')
}
const fixDiagrams = (md) => md.replace(/```mermaid\n([\s\S]*?)```/g, (_, body) => '```mermaid\n' + fixMermaid(body) + '```')

/* ------------------------------------------------------------------ main */

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.log('VeeraSystem sources not found (.system/) — skipping, keeping the committed generated lessons.')
    process.exit(0)
  }
  // design_patterns_visual.py is part 1 of the pattern series
  const sortKey = (f) => f.replace(/design_patterns_visual/, 'design_patterns_part1')
  const files = walk(srcRoot).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const track = createTrack({
    trackId: 'veerasys',
    prefix: 'sd',
    companions: COMPANIONS,
    moduleFor: (topic, ctx) => M[ctx.defaultModule] || M['01'],
    seriesRank: (s) => SERIES_RANK[s] ?? 40,
  })

  const used = []
  const skipped = []
  const seen = new Set()
  const moduleOfSource = new Map() // source file → learn module (to group its exercises / interview Qs)
  const objectivesOf = new Map() // curriculum file → the questions its lesson answers

  const add = (r, opts) => {
    moduleOfSource.set(r, opts.defaultModule)
    track.addDoc({ rel: r, preferUnits: false, ...opts })
    used.push(r)
  }

  for (const full of files) {
    const r = rel(full)
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n?/g, '\n')
    if (raw.trim().length < 200) {
      skipped.push(`${r} (empty)`)
      continue
    }
    if (META.test(r) && !KEEP_README.test(r)) {
      skipped.push(`${r} (index / status page)`)
      continue
    }
    const h = hash(raw.replace(/\s+/g, ' '), 16)
    if (seen.has(h)) {
      skipped.push(`${r} (identical to another file)`)
      continue
    }
    seen.add(h)

    let m
    // ---- main curriculum
    if ((m = r.match(/^system-design\/phase-(\d{2})-[^/]+\/\d+-[^/]+\.md$/))) {
      const md = fixDiagrams(tidyCurriculum(raw))
      const mod = PHASE[m[1]]
      add(r, { md, series: SERIES.core, title: upAcr(niceTitle(md, r)), defaultModule: mod })
      // the topic's sections are always Explanation / Visual / Code, so its objectives are the first
      // conceptual questions it answers
      const concept = md.match(/^## Conceptual Interview Questions\s*\n([\s\S]*?)(?=^## )/m)?.[1] || ''
      const qs = [...concept.matchAll(/^### Q\d+\.\s*(.+)$/gm)].map((x) => x[1].replace(/\*\*/g, '').trim()).filter((q) => q.length <= 140)
      if (qs.length >= 2) objectivesOf.set(r, qs.slice(0, 4))
      continue
    }
    // ---- chapter deep dives
    if ((m = r.match(/^System_Design_Course\/(.+)$/))) {
      const sub = m[1]
      if (/^11_Projects\//.test(sub)) {
        // capstones share names with build projects ("ML Model Serving Platform"): label them
        const t = niceTitle(raw, r).replace(/\s+system design$/i, '')
        add(r, { md: raw, series: SERIES.capstone, title: `${t} (capstone design)`, defaultModule: '21', kindOverride: 'project', forceKind: true })
        continue
      }
      const route = CHAPTER.find(([re]) => re.test(sub))
      if (!route) {
        skipped.push(`${r} (no route)`)
        continue
      }
      const real = /^10_Real_World_Systems\//.test(sub)
      const t = niceTitle(raw, r)
      // real-world chapters sit next to the curriculum's own "Design X" lessons: name them as deep dives
      // chapter overviews that share a name with a curriculum topic ("Event-Driven Architecture") say what they are
      const title = real
        ? `${t.replace(/^design\s+/i, '').replace(/\s+-\s+/, ' — ')} (deep dive)`
        : /^(event-driven architecture|microservices architecture|load balancing)$/i.test(t)
          ? `${t} — chapter overview`
          : t
      add(r, { md: raw, series: real ? SERIES.realWorld : SERIES.chapters, title, defaultModule: route[1] })
      continue
    }
    // ---- essentials
    if ((m = r.match(/^systemdesign\/(.+)$/))) {
      const sub = m[1]
      if (sub.endsWith('.py')) {
        const md = unprintFences(pyToMd(raw, r))
        const mod = /cache/.test(sub) ? '04' : /load_balancer/.test(sub) ? '05' : /visual_guide/.test(sub) ? '01' : '14'
        const t = /visual_guide/.test(sub)
          ? 'Architecture patterns at a glance (visual guide)'
          : /cheatsheet/.test(sub)
            ? 'Design patterns cheat sheet — runnable code'
            : /design_patterns_visual/.test(sub)
              ? 'SOLID, Singleton & Factory — runnable code'
              : /part2/.test(sub)
                ? 'Builder, Prototype, Abstract Factory & Adapter — runnable code'
                : /part3/.test(sub)
                  ? 'Decorator, Facade, Proxy, Observer & Strategy — runnable code'
                  : /part4/.test(sub)
                    ? 'Command, Chain of Responsibility, State, Template & Iterator — runnable code'
                    : /cache/.test(sub)
                      ? 'LRU, LFU, TTL & write-through caches in Python'
                      : 'A load balancer in Python: round robin, least connections, weighted, health checks'
        add(r, { md, series: SERIES.code, title: t, defaultModule: mod })
        continue
      }
      if (/design_patterns_guide\.md$/.test(sub)) {
        add(r, { md: raw, series: SERIES.essentials, title: 'SOLID principles & design patterns — visual guide', defaultModule: '14' })
        continue
      }
      if (/^05_interview_prep\//.test(sub) || /^(HOW_TO_PREPARE|INTERVIEW_CHECKLIST|QUICK_REFERENCE)\.md$/.test(sub)) {
        const t = /HOW_TO/.test(sub)
          ? 'How to prepare for system design interviews'
          : /CHECKLIST/.test(sub)
            ? 'System design interview checklist'
            : /QUICK_REF/.test(sub)
              ? 'System design quick reference'
              : 'The interview framework (RESO), phrases & study plan'
        add(r, { md: raw, series: SERIES.playbook, title: t, defaultModule: '22', kindOverride: 'interview', forceKind: true })
        continue
      }
      const map = { '01_fundamentals': ['01', 'System design fundamentals: principles, estimation & CAP'], '02_core_components': ['01', 'The building blocks: load balancers, caches, databases, CDNs & queues'], '03_design_patterns': ['08', 'Architecture patterns: microservices, API gateway, CQRS, saga & more'], '04_real_world_examples': ['15', 'Worked designs: URL shortener & Twitter'] }
      const key = sub.split('/')[0]
      if (map[key]) {
        add(r, { md: raw, series: SERIES.essentials, title: map[key][1], defaultModule: map[key][0] })
        continue
      }
      skipped.push(`${r} (no route)`)
      continue
    }
    // ---- scaling playbook, build projects, case studies
    if ((m = r.match(/^Scalable_App_Mastery\/(.+)$/))) {
      const sub = m[1]
      let k
      if ((k = sub.match(/^00_Core_Concepts\/(\d{2})_/))) {
        const t = k[1] === '08' ? 'Million-User Systems — Implementation Guide' : niceTitle(raw, r)
        add(r, { md: raw, series: SERIES.scale, title: t, defaultModule: SCALE[k[1]] || '13' })
        continue
      }
      if (/^\d{2}_Project_/.test(sub)) {
        add(r, { md: raw, series: SERIES.builds, title: niceTitle(raw, r), defaultModule: '21', kindOverride: 'project', forceKind: true })
        continue
      }
      if (/^11_Case_Studies\//.test(sub)) {
        add(r, { md: raw, series: SERIES.realWorld, title: 'How real apps scale: Instagram, Discord, Netflix & more', defaultModule: '15' })
        continue
      }
    }
    skipped.push(`${r} (no route)`)
  }

  const { lessons, stats } = track.finalize({ diagrams: SD_DIAGRAMS })
  for (const l of lessons) {
    if (l.summary) l.summary = l.summary.replace(/^In one line:\s*/i, '')
    if (l.kind === 'learn' && objectivesOf.has(l.sourceFile)) l.objectives = objectivesOf.get(l.sourceFile)
  }

  // Exercises and interview questions pulled out of the topic files: group them by the learn module they
  // practise, so module 22 reads "Caching interview", "Databases interview" … instead of one 300-card list.
  for (const l of lessons) {
    const mod = Number(l.title.slice(0, 2))
    if (mod < 20 || l.series === SERIES.playbook || l.series === SERIES.builds || l.series === SERIES.capstone) continue
    const learn = moduleOfSource.get(l.sourceFile)
    if (learn && M[learn]) l.series = `${M[learn].name} ${mod === 22 ? 'interview' : 'practice'}`
  }
  // order: module → series (playbook first, then by learn module) → original order; part numbers per series
  const groupKey = (s) => {
    const hit = Object.values(M).find((x) => s === `${x.name} interview` || s === `${x.name} practice`)
    return hit ? `5${hit.id}` : String(SERIES_RANK[s] ?? 40).padStart(3, '0')
  }
  const sorted = [...lessons].sort((a, b) =>
    a.title.slice(0, 2) !== b.title.slice(0, 2)
      ? a.title.slice(0, 2).localeCompare(b.title.slice(0, 2))
      : a.series === b.series
        ? a.order - b.order
        : Number(a.title.slice(0, 2)) >= 20
          ? groupKey(a.series).localeCompare(groupKey(b.series)) || a.series.localeCompare(b.series)
          : a.order - b.order,
  )
  const totals = new Map()
  for (const l of sorted) totals.set(`${l.title.slice(0, 2)}|${l.series}`, (totals.get(`${l.title.slice(0, 2)}|${l.series}`) || 0) + 1)
  const counters = new Map()
  sorted.forEach((l, i) => {
    l.order = i + 1
    const k = `${l.title.slice(0, 2)}|${l.series}`
    const n = (counters.get(k) || 0) + 1
    counters.set(k, n)
    l.part = n
    l.partCount = totals.get(k)
  })
  writeTrack({ outDir, trackId: 'veerasys', track: TRACK, lessons: sorted })

  const byMod = {}
  for (const l of sorted) byMod[l.title.slice(0, 2)] = (byMod[l.title.slice(0, 2)] || 0) + 1
  console.log(`VeeraSystem track: ${sorted.length} lessons from ${used.length} sources (${stats.candidates} candidates)`)
  console.log('  by module:', JSON.stringify(byMod))
  console.log(`  duplicate sections removed: ${stats.droppedSections}`)
  console.log(`  curated diagrams placed: ${stats.diagramsPlaced}/${SD_DIAGRAMS.length}`)
  if (stats.diagramsMissed.length) console.log('  NOT placed:', stats.diagramsMissed.join(', '))
  if (process.argv.includes('--verbose')) {
    console.log('  used:\n   ', used.join('\n    '))
    console.log('  skipped:\n   ', skipped.join('\n    '))
  } else console.log(`  skipped ${skipped.length} files (run with --verbose to list)`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
