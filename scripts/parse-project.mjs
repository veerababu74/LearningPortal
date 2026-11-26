/**
 * Interview preparation plan.md + project-supplement.mjs → VeeraProject track.
 *
 * Modules:
 *   01  JavaScript Core & Objects
 *   02  Async JS & Event Loop
 *   03  TypeScript Core & Functions
 *   04  TypeScript Types, Generics & OOP
 *   05  Production TypeScript & Resilience
 *   06  Playwright Basics, Locators & Waiting
 *   07  Playwright Ops & Test Architecture
 *   08  Playwright API Mocking, BDD & CI/CD
 *   09  Agentic AI Browser Automation (MCP)
 *   10  REST APIs, Design & Security
 *   11  Scalable APIs & GenAI Streaming
 *   12  FastAPI, Pydantic V2 & Capstone
 *   20  Exercises
 *   21  Projects & Labs
 *   22  Interview
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  annotate,
  classifyHeading,
  cleanTitle,
  extractQA,
  firstSentences,
  hash,
  headingsOf,
  makeSection,
  plain,
  proseLength,
  quizFromQA,
  repairFences,
  repairMermaidBlocks,
  slugify,
  splitAtHeadings,
  tidy,
} from './course-kit.mjs'
import { writeTrack } from './track-builder.mjs'
import { PROJECT_SUPPLEMENTS } from './project-supplement.mjs'
import { PROJECT_DIAGRAMS } from './diagrams-project.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcCandidates = [
  path.join(root, 'Interview preparation plan.md'),
  path.join(root, '.bin', 'Interview preparation plan.md'),
]
const srcFile = srcCandidates.find((p) => fs.existsSync(p))
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK = {
  id: 'veeraproject',
  title: 'VeeraProject',
  tagline: 'Full-Stack AI Engineering — JS, TS, Playwright, REST APIs, FastAPI & Capstone',
  description:
    'Production-grade JavaScript, TypeScript, Playwright (Python & TS), BDD, Agentic Browser MCP, REST APIs, Security, SSE Streaming, FastAPI & Pydantic V2 — with SVG & Mermaid diagrams, interactive labs, step-by-step simulations, worked exercises, and 500+ interview questions.',
  accent: '#2563eb',
}

const MODULES = {
  '01': { id: '01', name: 'JavaScript Core & Objects' },
  '02': { id: '02', name: 'Async JS & Event Loop' },
  '03': { id: '03', name: 'TypeScript Core & Functions' },
  '04': { id: '04', name: 'TypeScript Types, Generics & OOP' },
  '05': { id: '05', name: 'Production TypeScript & Resilience' },
  '06': { id: '06', name: 'Playwright Basics, Locators & Waiting' },
  '07': { id: '07', name: 'Playwright Ops & Test Architecture' },
  '08': { id: '08', name: 'Playwright API Mocking, BDD & CI/CD' },
  '09': { id: '09', name: 'Agentic AI Browser Automation (MCP)' },
  '10': { id: '10', name: 'REST APIs, Design & Security' },
  '11': { id: '11', name: 'Scalable APIs & GenAI Streaming' },
  '12': { id: '12', name: 'FastAPI, Pydantic V2 & Capstone' },
}

const COMPANIONS = {
  exercise: { id: '20', name: 'Exercises' },
  project: { id: '21', name: 'Projects & Labs' },
  interview: { id: '22', name: 'Interview' },
}

const TURN_ROUTES = [
  { match: /^3-Day AI Engineer Interview Preparation/i, mod: '01', series: '00. Roadmap & Platform Overview', title: '48-Hour Full-Stack AI Engineering Roadmap & Capstone Overview' },
  { match: /^JS-1:/i, mod: '01', series: 'JS-1: JavaScript Fundamentals' },
  { match: /^JS-2:.*Advanced Revision/i, mod: '02', series: 'JS-2: Asynchronous JavaScript', titlePrefix: 'JS-2 Revision' },
  { match: /^JS-2:/i, mod: '02', series: 'JS-2: Asynchronous JavaScript' },
  { match: /^TS-1:/i, mod: '03', series: 'TS-1: TypeScript Fundamentals' },
  { match: /^TS-2:/i, mod: '03', series: 'TS-2: TypeScript Functions' },
  { match: /^TS-3:/i, mod: '04', series: 'TS-3: Interfaces & Type Contracts' },
  { match: /^TS-4:/i, mod: '04', series: 'TS-4: Generics & Type-Level Programming' },
  { match: /^TS-5:/i, mod: '04', series: 'TS-5: OOP, SOLID & Architecture' },
  { match: /^TS-6:.*Advanced Revision/i, mod: '05', series: 'TS-6: Production TypeScript & Resilience', titlePrefix: 'TS-6 Revision' },
  { match: /^TS-6:/i, mod: '05', series: 'TS-6: Production TypeScript & Resilience' },
  { match: /^PW-1:/i, mod: '06', series: 'PW-1: Playwright Fundamentals' },
  { match: /^PW-2:/i, mod: '06', series: 'PW-2: DOM, Locators & Interactions' },
  { match: /^PW-3:/i, mod: '06', series: 'PW-3: Auto-Waiting & Assertions' },
  { match: /^PW-4:/i, mod: '07', series: 'PW-4: Advanced Browser Operations' },
  { match: /^PW-5:/i, mod: '07', series: 'PW-5: Test Framework Architecture' },
  { match: /^PW-6:/i, mod: '08', series: 'PW-6: API Testing & Network Mocking' },
  { match: /^PW-7:/i, mod: '08', series: 'PW-7: BDD, Cucumber & Gherkin' },
  { match: /^PW-8:/i, mod: '08', series: 'PW-8: Docker, CI/CD & Observability' },
  { match: /^PW-9:/i, mod: '09', series: 'PW-9: Agentic AI Browser Automation' },
  { match: /^PW-10:/i, mod: '22', series: 'PW-10: Playwright Final Mock Interview', forceKind: 'interview' },
  { match: /^REST-1:/i, mod: '10', series: 'REST-1: HTTP & REST Fundamentals' },
  { match: /^REST-2:/i, mod: '10', series: 'REST-2: Enterprise REST Design' },
  { match: /^REST-3:/i, mod: '10', series: 'REST-3: Production API Security' },
  { match: /^REST-4:/i, mod: '11', series: 'REST-4: Scalable API Architecture' },
  { match: /^REST-5:/i, mod: '11', series: 'REST-5: Generative AI API Architecture' },
  { match: /^REST-6:/i, mod: '22', series: 'REST-6: REST API Final Interview Masterclass', forceKind: 'interview' },
  { match: /^FA-1:/i, mod: '12', series: 'FA-1: FastAPI Fundamentals & Internals' },
  { match: /^FA-2:/i, mod: '12', series: 'FA-2: Pydantic V2 & Structured LLM Outputs' },
]

const STRAY_WIDGET_H1 = new Set([
  's', 'min', 'h', 'ms', '%', '/4', '/5', '24h', 'seconds', 'minutes', 'test cases',
  '×', '3', '2', '5', '1', 'gib', '/min', 'v', 'tokens', 'jobs/hour', '100%',
  'ai chatbot', 'configure ai agent', 'knowledge base chatbot', '4 scenarios',
])

const LAB_REDIRECTS = [
  { match: /event loop|call stack|closure|agent configuration|concurrency|backoff|retry simulator|deadline|race condition/i, modRe: /^(01|02)$/, link: '[JS Event Loop & Closure Lab](/labs/js-event-loop) · [Event Loop Simulation](/project/visualizer/proj-js-event-loop)' },
  { match: /validation|zod|contract|optional|enum|excess property|tool execution|conditional type|supervisor|circuit breaker|production ai request/i, modRe: /^(03|04|05)$/, link: '[TypeScript & Zod Contract Lab](/labs/ts-contract) · [Resilient TS Client Sim](/project/visualizer/proj-ts-resilient-client)' },
  { match: /locator|strictness|synchronization|flaky|browser|dialog|upload|authentication|permission|dependency|parallel|resilience|retry policy|circuit|isolation|capacity|roi|chatbot/i, modRe: /^(06|07|08|09)$/, link: '[Playwright Locator & Route Mock Lab](/labs/playwright-lab) · [Auto-Wait Simulation](/project/visualizer/proj-pw-auto-wait)' },
  { match: /http|lost-update|token bucket|leaky bucket|streaming|message-delivery/i, modRe: /^(10|11)$/, link: '[HTTP Lifecycle & Rate-Limit Lab](/labs/http-lifecycle) · [GenAI SSE & Jobs Sim](/project/visualizer/proj-genai-sse-jobs)' },
  { match: /required-field|pydantic|fastapi|resume|capstone/i, modRe: /^12$/, link: '[FastAPI & Pydantic V2 Lab](/labs/fastapi-pydantic) · [Capstone Evaluator Lab](/labs/capstone-evaluator)' },
]

function labCalloutFor(heading, modId) {
  for (const r of LAB_REDIRECTS) {
    if (r.modRe.test(modId) && r.match.test(heading)) {
      return `> **Interactive Lab:** Experiment with these settings live in ${r.link}.`
    }
  }
  const fallback =
    modId <= '02'
      ? '[JS Event Loop & Closure Lab](/labs/js-event-loop)'
      : modId <= '05'
        ? '[TypeScript & Zod Contract Lab](/labs/ts-contract)'
        : modId <= '09'
          ? '[Playwright Locator & Route Mock Lab](/labs/playwright-lab)'
          : modId <= '11'
            ? '[HTTP Lifecycle & Rate-Limit Lab](/labs/http-lifecycle)'
            : '[FastAPI & Pydantic V2 Lab](/labs/fastapi-pydantic)'
  return `> **Interactive Lab:** Try this concept hands-on in ${fallback}.`
}

function labIdsForModule(modId) {
  if (modId === '01' || modId === '02') return ['js-event-loop']
  if (modId >= '03' && modId <= '05') return ['ts-contract']
  if (modId >= '06' && modId <= '09') return ['playwright-lab']
  if (modId === '10' || modId === '11') return ['http-lifecycle']
  if (modId === '12') return ['fastapi-pydantic', 'capstone-evaluator']
  return []
}

function cleanChatTurn(raw, modId) {
  // 1) Replace ChatGPT URL & cite artifacts
  let text = String(raw || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\uE200url\uE202([^\uE202\uE201]+)\uE202([^\uE201]+)\uE201/g, '[$1]($2)')
    .replace(/\uE200[^\uE201]*\uE201/g, '')
    .replace(/&#124;/g, '|')

  // 2) Drop incomplete EOF code fragment if FA-2 was truncated mid-regex
  text = text.replace(/YearMonth = Annotated\[\s*\n\s*str,\s*\n\s*StringConstraints\(\s*\n\s*pattern=r"\^\\d\{4\}-\(0\[1-9\s*$/m, '')

  text = repairFences(text, { aggressive: true })

  // 3) Clean lines outside code fences
  const ann = annotate(text)
  const out = []
  let activeSimHeading = ''

  for (let i = 0; i < ann.length; i++) {
    const { line, code } = ann[i]
    if (code) {
      out.push(line)
      continue
    }

    // Remove stray UI widget H1 badges (# s, # min, # %, # 4 / 48 hours, etc.)
    const h1 = line.match(/^#\s+(.+)$/)
    if (h1) {
      const norm = h1[1].trim().toLowerCase()
      if (STRAY_WIDGET_H1.has(norm) || /^\d+\s*\/\s*\d+\s*h(?:ours?)?$/i.test(norm)) {
        continue
      }
    }

    // Track current simulator heading to replace dead widget controls with live Lab links
    if (/^#{1,4}\s+.*simulator/i.test(line)) {
      activeSimHeading = line
    } else if (/^#{1,4}\s+/.test(line)) {
      activeSimHeading = ''
    }

    // Strip hollow ChatGPT interactive UI chrome
    if (
      /^\s*>\s*\*\*Slider\*\*/i.test(line) ||
      /^\s*>\s*Current value unavailable/i.test(line) ||
      /^\s*>\s*Range:\s/i.test(line) ||
      /^\s*Current selection unavailable\.?\s*$/i.test(line) ||
      /^\s*Question\s+of\s+Score:\s*\//i.test(line) ||
      /^\s*Exercise\s+of\s+\d+\s*(completed)?/i.test(line) ||
      /^\s*\[Previous\]\s+\[Next\s+\w+\]\s*$/i.test(line) ||
      /^\s*\[Apply recommended [^\]]+\]\s*$/i.test(line) ||
      /^\s*- \[ \].*\(Current selection unavailable\.\)\s*$/i.test(line) ||
      /^\s*Difficulty:\s*$/i.test(line) ||
      /^\s*\*\*(Input|Expected output)\*\*\s*$/i.test(line)
    ) {
      if (activeSimHeading) {
        out.push(labCalloutFor(activeSimHeading, modId))
        activeSimHeading = ''
      }
      continue
    }

    // Unescape markdown backslash artifacts (never touch \( \) \[ \] math delimiters)
    let cleanLine = line
      .replace(/\\([.:_\-*#<>|])/g, '$1')
      .replace(/\\\[(?![\s\S]*\\\])/g, '[')

    out.push(cleanLine)
  }

  return repairMermaidBlocks(repairFences(out.join('\n'), { aggressive: true }))
}

/**
 * Turn Q&A tables (`| 1. What is X? | Answer |`) inside interview sections into
 * structured `### Q1: What is X?\n\nAnswer` blocks so the InterviewHub flashcard drill
 * extracts every single question cleanly!
 */
function expandInterviewTables(md) {
  const ann = annotate(md)
  const out = []
  let qCounter = 1
  for (let i = 0; i < ann.length; i++) {
    const { line, code } = ann[i]
    if (code) {
      out.push(line)
      continue
    }
    if (/^\s*\|\s*(?:#?\s*)?(?:Question|Q)\s*\|\s*(?:Expected\s+)?Answer/i.test(line)) {
      // skip header & separator row, convert consecutive data rows
      let j = i + 1
      if (j < ann.length && /^\s*\|[-\s|:]+\|\s*$/.test(ann[j].line)) j++
      const rows = []
      while (j < ann.length && !ann[j].code && /^\s*\|.+\|.+\|\s*$/.test(ann[j].line)) {
        const parts = ann[j].line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/\s*\|\s*/)
        if (parts.length >= 2) {
          const rawQ = parts[0].replace(/^\d+\.\s*/, '').trim()
          const ans = parts.slice(1).join(' | ').trim()
          if (rawQ.length >= 8 && ans.length >= 6) {
            rows.push(`### Q${qCounter++}: ${rawQ}\n\n${ans}`)
          }
        }
        j++
      }
      if (rows.length >= 3) {
        out.push('', ...rows, '')
        i = j - 1
        continue
      }
    }
    out.push(line)
  }
  return out.join('\n')
}

function splitTurns(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n')
  const turns = []
  let cur = null
  for (const line of lines) {
    const t = line.trim()
    if (t === '**You:**') {
      cur = { role: 'user', lines: [] }
      turns.push(cur)
      continue
    }
    if (t === '**ChatGPT:**') {
      cur = { role: 'bot', lines: [] }
      turns.push(cur)
      continue
    }
    if (cur) cur.lines.push(line)
  }
  return turns.map((t) => ({ role: t.role, md: t.lines.join('\n').trim() }))
}

function classifyProjectChapter(title) {
  const t = cleanTitle(title).toLowerCase()
  if (/mass assignment/i.test(t)) return 'learn'
  if (/types of interview questions/i.test(t)) return 'learn'
  if (/^(overall preparation progress|remaining masterclasses|remaining topic priorities|next:|overall interview preparation progress|next step in your interview)/.test(t)) return 'meta'
  if (/five hands-on coding exercises|coding challenges|hands-on exercises|production debugging interview exercises/.test(t)) return 'exercise'
  if (/integrated (?:lab|production-grade lab)|practical lab:|practical project|capstone/.test(t)) return 'project'
  if (/interview questions|scenario-based|output-based|output prediction|interactive .*assessment|mock interview|interview masterclass|rapid revision.*qa|coding problems|debugging.*laboratory|seven-round|round \d+:|live mock interview/i.test(t)) return 'interview'
  return classifyHeading(title)
}

function isHollowStub(body, title = '') {
  if (/live mock interview format/i.test(title) && proseLength(body) < 1200) return true
  const hasCode = /```/.test(body)
  const hasTable = /^\s*\|.+\|.+\|/m.test(body)
  const hasQ = /^#{2,4}\s+(?:Q\d+|Scenario \d+|Question \d+)/m.test(body)
  if (hasCode || hasTable || hasQ) return false
  if (/complete these exercises|exercise fixture|attempt these independently/i.test(body) && proseLength(body) < 800) return true
  return proseLength(body) < 260
}

function groupIntoLessons(chapters, maxChars = 24_000, maxChapters = 5) {
  const groups = []
  let buf = []
  let len = 0
  for (const ch of chapters) {
    if (buf.length && (len + ch.body.length > maxChars || buf.length >= maxChapters)) {
      groups.push(buf)
      buf = []
      len = 0
    }
    buf.push(ch)
    len += ch.body.length
  }
  if (buf.length) groups.push(buf)
  return groups
}

function niceChapterTopic(ch) {
  return cleanTitle(ch.title)
    .replace(/^\d+(?:\.\d+)*[.)]?\s*/, '')
    .replace(/^(Storytelling|Core Concept|Visual Explanation):\s*/i, '')
    .trim()
}

function createManualLesson({ prefix, mod, series, topic, kind, sections, qaPool = [], part, partCount, sourceFile = 'Interview preparation plan.md', uid = '' }) {
  const used = new Set()
  const builtSections = sections.map((s) =>
    makeSection(s.title, s.body, { usedIds: used, walk: kind === 'learn' }),
  )
  const allQA = extractQA(builtSections.map((s) => s.body).join('\n\n'))
  const quiz = kind === 'learn' || kind === 'interview' ? quizFromQA(allQA, qaPool.length >= 4 ? qaPool : allQA, 5) : []
  const id = `${prefix}-${mod.id}-${slugify(topic).slice(0, 44)}-${hash(`${series}|${kind}|${topic}|${part}|${uid}`, 6)}`
  const firstProse = builtSections.map((s) => plain(s.body, 220)).find((p) => p.length > 40) || topic

  return {
    id,
    trackId: 'veeraproject',
    title: `${mod.id}. ${mod.name}: ${topic}`.slice(0, 140),
    summary: firstSentences(firstProse, 2, 220) || `${topic}.`,
    order: 0,
    objectives: builtSections
      .map((s) => cleanTitle(s.title).replace(/^\d+(?:\.\d+)*[.)]?\s*/, ''))
      .filter((t) => t && !/^(overview|introduction|summary)$/i.test(t))
      .slice(0, 6),
    sections: builtSections,
    quiz: quiz.length ? quiz : undefined,
    sourceFile,
    labIds: kind === 'learn' ? labIdsForModule(mod.id) : [],
    series,
    part,
    partCount,
    kind,
  }
}

function placeDiagrams(lessons, diagrams) {
  const missed = []
  let placed = 0
  const learn = lessons.filter((l) => l.kind === 'learn')
  for (const d of diagrams) {
    const w = d.where || {}
    const candidates = learn.filter(
      (l) =>
        (!w.module || l.title.startsWith(`${w.module}.`)) &&
        (!w.topic || w.topic.test(l.title)),
    )
    let target = candidates[0]
    let section = target ? (w.section ? target.sections.find((s) => w.section.test(s.title)) : target.sections[0]) : null
    if (!section && target && w.fallbackFirst) section = target.sections[0]
    if (!section) {
      missed.push(d.id)
      continue
    }
    section.diagrams = section.diagrams || []
    section.diagrams.push({ id: d.id, title: d.title, mermaid: d.mermaid.trim(), explain: d.explain.trim() })
    placed++
  }
  return { placed, missed }
}

function main() {
  if (!srcFile) {
    console.log('Interview preparation plan.md not found — skipping parse-project, keeping committed generated lessons.')
    process.exit(0)
  }

  const raw = fs.readFileSync(srcFile, 'utf8')
  const turns = splitTurns(raw)
  const lessons = []
  const qaPoolsByMod = new Map()

  const botTurns = turns.filter((t) => t.role === 'bot' && t.md.length > 300)

  // First pass: collect clean chapters per bot turn
  const parsedTurns = []
  for (const t of botTurns) {
    const firstH1 = headingsOf(t.md, 1)[0]?.title || ''
    if (/^Overall preparation progress/i.test(firstH1)) continue
    if (/^We have covered \*\*JavaScript, TypeScript and Playwright/i.test(t.md)) continue

    const route = TURN_ROUTES.find((r) => r.match.test(firstH1))
    if (!route) continue

    const cleaned = cleanChatTurn(t.md, route.mod)
    // Top-level split: numbered H1s (# 1. Title) or major H1s
    const h1s = headingsOf(cleaned, 1).filter((h) => !h.banner && h.idx > 0)
    const pieces = splitAtHeadings(cleaned, h1s)
    const chapters = []

    for (const p of pieces) {
      if (!p.head) {
        if (proseLength(p.body) > 160 || /```/.test(p.body)) {
          chapters.push({ title: route.title || niceChapterTopic({ title: firstH1 }), body: p.body, kind: route.forceKind || 'learn' })
        }
        continue
      }
      const chTitle = p.head.title
      const kind = route.forceKind || classifyProjectChapter(chTitle)
      if (kind === 'meta') continue
      if (isHollowStub(p.body, chTitle)) continue
      const body = kind === 'interview' ? expandInterviewTables(p.body) : p.body
      chapters.push({ title: chTitle, body, kind })
    }

    if (chapters.length) {
      const turnQA = extractQA(
        chapters
          .filter((c) => c.kind === 'interview')
          .map((c) => `## ${c.title}\n${c.body}`)
          .join('\n\n'),
      )
      qaPoolsByMod.set(route.mod, [...(qaPoolsByMod.get(route.mod) || []), ...turnQA])
      parsedTurns.push({ route, firstH1, chapters, turnIdx: parsedTurns.length + 1 })
    }
  }

  // Second pass: emit lessons (Supplements placed cleanly alongside source turns)
  const modLessonsCount = new Map()

  for (const sup of PROJECT_SUPPLEMENTS) {
    const mod = sup.kind === 'exercise' ? COMPANIONS.exercise : sup.kind === 'project' ? COMPANIONS.project : sup.kind === 'interview' ? COMPANIONS.interview : MODULES[sup.mod]
    const l = createManualLesson({
      prefix: 'vp',
      mod,
      series: sup.series,
      topic: sup.topic,
      kind: sup.kind,
      sections: sup.sections,
      qaPool: qaPoolsByMod.get(sup.mod) || [],
      part: sup.part || 1,
      partCount: 1,
      sourceFile: 'scripts/project-supplement.mjs',
    })
    if (sup.objectives?.length) l.objectives = sup.objectives
    lessons.push(l)
  }

  for (const { route, chapters, turnIdx } of parsedTurns) {
    const learnCh = chapters.filter((c) => c.kind === 'learn')
    const exCh = chapters.filter((c) => c.kind === 'exercise')
    const projCh = chapters.filter((c) => c.kind === 'project')
    const ivCh = chapters.filter((c) => c.kind === 'interview')
    const qaPool = qaPoolsByMod.get(route.mod) || []
    const tag = route.titlePrefix ? `${route.titlePrefix}: ` : ''

    if (learnCh.length) {
      const groups = groupIntoLessons(learnCh)
      groups.forEach((grp, idx) => {
        const lead = niceChapterTopic(grp[0])
        const tail = grp.length > 1 ? ` & ${niceChapterTopic(grp[grp.length - 1])}` : ''
        const topic =
          route.title && groups.length === 1
            ? route.title
            : `${tag}${lead}${tail}`.slice(0, 92)
        const mod = MODULES[route.mod]
        lessons.push(
          createManualLesson({
            prefix: 'vp',
            mod,
            series: route.series,
            topic,
            kind: 'learn',
            sections: grp.map((c) => ({ title: niceChapterTopic(c) || c.title, body: c.body })),
            qaPool,
            part: idx + 1,
            partCount: groups.length,
            uid: `t${turnIdx}`,
          }),
        )
      })
    }

    if (exCh.length) {
      lessons.push(
        createManualLesson({
          prefix: 'vp',
          mod: COMPANIONS.exercise,
          series: route.series,
          topic: `${tag}${route.series} — Practice Exercises`,
          kind: 'exercise',
          sections: exCh.map((c) => ({ title: niceChapterTopic(c), body: c.body })),
          part: 1,
          partCount: 1,
          uid: `t${turnIdx}`,
        }),
      )
    }

    if (projCh.length) {
      lessons.push(
        createManualLesson({
          prefix: 'vp',
          mod: COMPANIONS.project,
          series: route.series,
          topic: `${tag}${route.series} — Integrated Lab`,
          kind: 'project',
          sections: projCh.map((c) => ({ title: niceChapterTopic(c), body: c.body })),
          part: 1,
          partCount: 1,
          uid: `t${turnIdx}`,
        }),
      )
    }

    if (ivCh.length) {
      const groups = groupIntoLessons(ivCh, 42_000, 4)
      groups.forEach((grp, idx) => {
        const partSuffix = groups.length > 1 ? ` (Part ${idx + 1} of ${groups.length})` : ''
        lessons.push(
          createManualLesson({
            prefix: 'vp',
            mod: COMPANIONS.interview,
            series: route.series,
            topic: `${tag}${route.series} — Interview Q&A${partSuffix}`,
            kind: 'interview',
            sections: grp.map((c) => ({ title: niceChapterTopic(c), body: c.body })),
            qaPool,
            part: idx + 1,
            partCount: groups.length,
            uid: `t${turnIdx}`,
          }),
        )
      })
    }
  }

  // Sort cleanly by module id (01..12, 20, 21, 22), preserving supplement part-1 ordering
  lessons.sort((a, b) => {
    const ma = a.title.slice(0, 2)
    const mb = b.title.slice(0, 2)
    if (ma !== mb) return ma.localeCompare(mb)
    if (a.series !== b.series) return (a.series || '').localeCompare(b.series || '')
    return (a.part || 1) - (b.part || 1)
  })
  lessons.forEach((l, i) => {
    l.order = i + 1
  })

  // Recompute series part / partCount per module + series
  const totals = new Map()
  const counts = new Map()
  for (const l of lessons) {
    const k = `${l.title.slice(0, 2)}|${l.series}`
    totals.set(k, (totals.get(k) || 0) + 1)
  }
  for (const l of lessons) {
    const k = `${l.title.slice(0, 2)}|${l.series}`
    const n = (counts.get(k) || 0) + 1
    counts.set(k, n)
    l.part = n
    l.partCount = totals.get(k)
  }

  const diag = placeDiagrams(lessons, PROJECT_DIAGRAMS)
  writeTrack({ outDir, trackId: 'veeraproject', track: TRACK, lessons })

  const byMod = {}
  for (const l of lessons) byMod[l.title.slice(0, 2)] = (byMod[l.title.slice(0, 2)] || 0) + 1
  console.log(`VeeraProject track: ${lessons.length} lessons`)
  console.log('  by module:', JSON.stringify(byMod))
  console.log(`  curated diagrams placed: ${diag.placed}/${PROJECT_DIAGRAMS.length}`)
  if (diag.missed.length) console.log('  NOT placed:', diag.missed.join(', '))
}

main()
