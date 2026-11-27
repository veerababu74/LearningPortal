import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  pickFlowTemplate,
  extractTeachingPoints,
  buildSectionFlow,
  enrichThinContent,
} from './flow-templates.mjs'
import { courseLessons, mergeCourses, region, segmentCourse } from './roadmap-structure.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK_META = [
  {
    id: 'llm-concepts',
    title: 'LLM Concepts',
    tagline: 'Reliability, prompting, drift, adaptation',
    description:
      'Core LLM fundamentals: hallucinations, grounded generation, production drift monitoring, prompt engineering, and fine-tuning.',
    accent: '#1a6b64',
  },
  {
    id: 'rag',
    title: 'RAG Engineering',
    tagline: 'Ingestion to production-grade retrieval',
    description:
      'Document loading, chunking, embeddings, vector indexes, hybrid retrieval, agentic RAG, evaluation, and governance.',
    accent: '#0b3d3a',
  },
  {
    id: 'agentic-ai',
    title: 'Agentic AI',
    tagline: 'Loops, tools, LangGraph, MCP & A2A',
    description:
      'Build agents from scratch and with frameworks: reasoning loops, tools, memory, MCP, A2A, HITL, and production ops.',
    accent: '#2a8f86',
  },
  {
    id: 'multi-agent',
    title: 'Multi-Agent Orchestration',
    tagline: 'Teams of agents that coordinate',
    description:
      'Orchestration patterns, shared state, consensus, scheduling, Google ADK and cross-framework multi-agent systems.',
    accent: '#c4841d',
  },
  {
    id: 'llm-security',
    title: 'LLM Security',
    tagline: 'OWASP, injection, guardrails, tenancy',
    description:
      'Attack surfaces, prompt injection, jailbreaks, PII, RAG leakage, vector DB security, and enterprise guardrails.',
    accent: '#d45d4a',
  },
  {
    id: 'llm-gateways',
    title: 'LLM Gateways',
    tagline: 'Routing, quotas, cache, reliability',
    description:
      'Provider abstraction, rate limits, virtual keys, cost control, semantic cache, streaming, and multi-tenant gateways.',
    accent: '#7cb8b0',
  },
  {
    id: 'production-failures',
    title: 'Production Failures',
    tagline: 'Detect, diagnose, and recover',
    description:
      'API, agent, state, database, reliability, cost, safety, and disaster-recovery failure catalogue with fix playbooks.',
    accent: '#c43c3c',
  },
]

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function stripExportNoise(md) {
  return md
    .replace(/\*\*You:\*\*[\s\S]*?\*\*ChatGPT:\*\*/g, '\n')
    .replace(/\* \* \*/g, '\n')
    .replace(/\\:/g, ':')
    .replace(/\\\./g, '.')
    .trim()
}

function detectFramework(code, lang) {
  const c = code.toLowerCase()
  if (lang === 'sql' || /select\s+.+\s+from/.test(c)) return 'sql'
  if (/from\s+pydantic|basemodel|field\(/.test(c)) return 'pydantic'
  if (/langgraph|stategraph|add_conditional_edges/.test(c)) return 'langgraph'
  if (/langchain|from langchain|chatprompttemplate|recursivecharactertextsplitter/.test(c))
    return 'langchain'
  if (/google\.adk|from adk|agent\(.*model=/.test(c) && /adk/.test(c)) return 'adk'
  return 'plain'
}

function extractCodeBlocks(text) {
  const blocks = []
  const re = /```(\w+)?\n([\s\S]*?)```/g
  let m
  let i = 0
  while ((m = re.exec(text))) {
    const language = (m[1] || 'text').toLowerCase()
    const code = m[2].trim()
    if (!code) continue
    // Mermaid stays inline in markdown body (rendered as diagrams)
    if (language === 'mermaid') continue
    if (/^(flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram)\b/.test(code)) continue
    const lang =
      language === 'py' || language === 'python'
        ? 'python'
        : language === 'sql'
          ? 'sql'
          : language === 'bash' || language === 'sh'
            ? 'bash'
            : 'text'
    blocks.push({
      id: `code-${i++}`,
      title: lang === 'python' ? 'Python example' : `${lang.toUpperCase()} example`,
      language: lang,
      framework: detectFramework(code, lang),
      code: code.slice(0, 12000),
    })
  }
  return blocks
}

function buildScenario(title, body) {
  const situationMatch =
    body.match(/(?:Real-world(?: production)?(?: scenario| example)|Real-time example|Example)[:\s]*([\s\S]{40,500}?)(?:\n##|\n###|\n\*\*|$)/i) ||
    body.match(/(?:What is[^\n]+\n)([\s\S]{40,350})/)
  const detect = body.match(/How (?:do you |to )?detect[\s\S]{0,40}?\n([\s\S]{20,400}?)(?:\n##|\n###|How to fix|$)/i)
  const fix = body.match(/How (?:do you |to )?fix[\s\S]{0,40}?\n([\s\S]{20,400}?)(?:\n##|\n###|Interview|$)/i)

  if (!situationMatch && !detect && !fix) return undefined

  const situation = (situationMatch?.[1] || body.slice(0, 280))
    .replace(/[#>*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420)

  return {
    title: `Scenario — ${title}`,
    situation: situation || `You encounter a production issue related to: ${title}`,
    choices: [
      {
        id: 'ignore',
        label: 'Ignore it and ship anyway',
        outcome: 'failure',
        explanation:
          'Skipping detection leaves users exposed and makes root-cause analysis harder later.',
      },
      {
        id: 'detect',
        label: 'Add detection signals first',
        outcome: 'warning',
        explanation: (detect?.[1] || 'Instrument logs, metrics, and traces that reveal this failure mode.')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 360),
      },
      {
        id: 'fix',
        label: 'Apply a production fix / mitigation',
        outcome: 'success',
        explanation: (fix?.[1] || 'Apply layered mitigations, validate with tests, and monitor recovery.')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 360),
      },
    ],
  }
}

function buildQuiz(title) {
  return [
    {
      id: 'q1',
      question: `What is the most production-ready mindset for "${title}"?`,
      options: [
        'Trust fluent model output without checks',
        'Define detect → mitigate → validate loops around the concept',
        'Only optimize prompts and ignore systems design',
        'Disable observability to reduce cost',
      ],
      answerIndex: 1,
      explanation:
        'Production GenAI systems need explicit detection, mitigation, and validation around every critical concept.',
    },
  ]
}

function splitSections(body) {
  // Split only on H2 so H3/H4 stay inside the section as rich teaching points.
  // This prevents thin visual stubs like "### Without RAG" from becoming empty lessons.
  const lines = body.split('\n')
  const sections = []
  let current = { title: 'Overview', lines: [] }

  for (const line of lines) {
    const h2 = line.match(/^##\s+\**(.+?)\**\s*$/)
    if (h2) {
      if (current.lines.some((l) => l.trim())) sections.push(current)
      current = { title: h2[1].replace(/\*\*/g, '').trim(), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.lines.some((l) => l.trim())) sections.push(current)

  if (sections.length === 0) {
    sections.push({ title: 'Overview', lines: body.split('\n') })
  }

  const max = 20
  if (sections.length > max) {
    const head = sections.slice(0, max - 1)
    const rest = sections.slice(max - 1)
    head.push({
      title: 'Additional points',
      lines: rest.flatMap((s) => [`## ${s.title}`, ...s.lines]),
    })
    return head
  }
  return sections
}

function cleanBody(text) {
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (block, lang, code) => {
      // Never strip mermaid — frontend renders these as diagrams
      if (String(lang || '').toLowerCase() === 'mermaid') return block
      // Keep substantial code in body so learners still see it inline
      if (block.length > 6000 && String(lang || '').toLowerCase() === 'python') {
        return `\n\n\`\`\`${lang || ''}\n${String(code || '').slice(0, 4500)}\n\`\`\`\n\n> Longer code continues in the Code panel when available.\n\n`
      }
      return block
    })
    .replace(/^\s*---\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 50000)
}

function isUsefulBody(text) {
  const t = String(text || '')
    .replace(/[#>*`_\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length >= 40
}

function makeLesson({ trackId, title, body, order, sourceFile, idHint }) {
  const id = `${trackId}-${idHint || slugify(title)}-${order}`
  const summaryRaw = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const summary =
    summaryRaw.length <= 320
      ? summaryRaw || title
      : `${summaryRaw.slice(0, 320).replace(/\s+\S*$/, '').trim()}…`

  const allCode = extractCodeBlocks(body)
  const sectionDefs = splitSections(body)
  const lessonDiagram = pickFlowTemplate(title, body)
  const scenario = buildScenario(title, body)


  const sections = sectionDefs
    .map((s, idx) => {
      const raw = s.lines.join('\n')
      // No padding: short sections stay short (the polish pass merges heading-only ones), and nothing is
      // borrowed from other sections or canned text — that produced repeated, off-topic bullets.
      const cleaned = cleanBody(raw)
      const code = extractCodeBlocks(raw).filter(
        (c) => c.framework !== 'plain' || c.language === 'python' || c.code.length > 40,
      )
      const codeForPanel = code.filter(
        (c) => c.language !== 'text' || !/flowchart|sequenceDiagram|stateDiagram/.test(c.code),
      )
      // No per-point cards: they repeated the section text next to template diagrams.
      const section = {
        id: `sec-${idx}`,
        title: s.title,
        body: cleaned,
        diagram: buildSectionFlow(s.title, cleaned),
      }
      if (idx === 0 && scenario) section.scenario = scenario
      if (codeForPanel.length) section.code = codeForPanel
      else if (idx === 0 && allCode.length) {
        section.code = allCode
          .filter((c) => !/flowchart|sequenceDiagram|stateDiagram/.test(c.code))
          .slice(0, 8)
      }
      return section
    })
    .filter((s) => isUsefulBody(s.body) || s.code?.length)

  if (allCode.length && !sections.some((s) => s.code?.length)) {
    sections[0].code = allCode.slice(0, 10)
  }

  // Lesson-level overview diagram on first section if missing
  if (sections[0] && !sections[0].diagram) {
    sections[0].diagram = lessonDiagram
  }

  // What the lesson actually covers (its own section titles), not a fixed template.
  const objectives = [
    ...new Set(
      sections
        .map((s) => String(s.title).replace(/^\d+(?:\.\d+)*[.)]?\s*/, '').trim())
        .filter((t) => t && !/^(overview|introduction|summary|interview questions?.*|knowledge (check|assessment)|quick revision|memory trick)$/i.test(t)),
    ),
  ].slice(0, 6)
  if (!objectives.length) objectives.push(title)

  const labIds = []
  const t = `${title} ${body}`.toLowerCase()
  if (/chunk|overlap/.test(t)) labIds.push('chunking')
  if (/cosine|embedding similarity|similarity metric/.test(t)) labIds.push('cosine')
  if (/hybrid|bm25|rerank|rrf|retriev/.test(t)) labIds.push('retrieval')
  if (/prompt injection|jailbreak|indirect prompt/.test(t)) labIds.push('injection')
  if (/rate limit|token bucket|rpm|tpm/.test(t)) labIds.push('rate-limit')
  if (/agent loop|react|tool calling|langgraph/.test(t) && !/multi-agent/.test(t))
    labIds.push('agent-loop')
  if (/multi-agent|handoff|deadlock|orchestrat/.test(t)) labIds.push('multi-agent')

  return {
    id,
    trackId,
    title: title.replace(/\*\*/g, '').trim(),
    summary,
    order,
    objectives,
    sections,
    quiz: buildQuiz(title),
    relatedIds: [],
    sourceFile,
    labIds: [...new Set(labIds)],
  }
}

function splitByHeading(md, pattern) {
  const matches = [...md.matchAll(pattern)]
  if (!matches.length) return []
  const chunks = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length
    const groups = matches[i].slice(1).filter((g) => g != null)
    // Prefer "full title" = join all capture groups (e.g. "6. Prompt Injection")
    const title = (groups.length ? groups.join('. ').replace(/^\d+\.\s*\d+\.\s*/, (m) => m) : matches[i][0])
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    // Better title: if first group is number and second is name → "N. Name"
    let niceTitle = title
    if (groups.length >= 2 && /^\d+/.test(groups[0]) && !/^\d+/.test(groups[1])) {
      niceTitle = `${groups[0]}. ${groups[1]}`.replace(/\*\*/g, '').trim()
    } else if (groups.length === 1) {
      niceTitle = groups[0].replace(/\*\*/g, '').trim()
    }
    const body = md.slice(start, end).replace(matches[i][0], '').trim()
    chunks.push({ title: niceTitle, body, rawTitle: title, groups })
  }
  return chunks
}

function parseLlmConcepts(md, sourceFile) {
  const clean = stripExportNoise(md)
  const chunks = splitByHeading(
    clean,
    /^##\s+\*\*Concept\s+\d+:\s*(.+?)\*\*\s*$/gm,
  )
  return chunks.map((c, i) =>
    makeLesson({
      trackId: 'llm-concepts',
      title: c.title,
      body: c.body,
      order: i + 1,
      sourceFile,
      idHint: slugify(c.title),
    }),
  )
}

function parseSecurityMain(md, sourceFile) {
  const clean = stripExportNoise(md)
  const lessons = []

  // Module 1 security concepts — headings are "## Concept N." or "# Concept N."
  // Use the real engineering section start (not the early TOC "Module 2 — LLM Gateways")
  const securityEnd = clean.search(/^# Module 2 — LLM Gateway Engineering\s*$/m)
  const securityPart = securityEnd >= 0 ? clean.slice(0, securityEnd) : clean

  const byNum = new Map()
  const conceptChunks = splitByHeading(
    securityPart,
    /^#{1,3}\s+Concept\s+(\d+)\.\s*(.+)$/gm,
  )
  for (const c of conceptChunks) {
    const num = Number(c.groups?.[0] || c.title.match(/^(\d+)/)?.[1] || 0)
    const title = (c.groups?.[1] || c.title.replace(/^\d+\.\s*/, '')).trim()
    if (!num) continue
    const prev = byNum.get(num)
    if (!prev || c.body.length > prev.body.length) {
      byNum.set(num, { num, title, body: c.body })
    }
  }

  let order = 1
  for (const c of [...byNum.values()].sort((a, b) => a.num - b.num)) {
    if (c.num >= 1 && c.num <= 30) {
      lessons.push(
        makeLesson({
          trackId: 'llm-security',
          title: `Concept ${c.num}. ${c.title}`,
          body: c.body,
          order: order++,
          sourceFile,
          idHint: `c${c.num}-${slugify(c.title)}`,
        }),
      )
    }
  }

  // Batches 4–6 use "## Batch N: Title" without per-concept # headings
  const lateBatches = splitByHeading(
    securityPart,
    /^#{1,3}\s+Batch\s+([4-6])\s*[:—\-]\s*(.+)$/gm,
  )
  for (const b of lateBatches) {
    if (/revision/i.test(b.title) && b.body.length < 1500) continue
    const topics = splitByHeading(b.body, /^#{2,3}\s+(\d+)\.\s+(.+)$/gm)
    if (topics.length >= 2) {
      for (const t of topics) {
        lessons.push(
          makeLesson({
            trackId: 'llm-security',
            title: t.title,
            body: t.body,
            order: order++,
            sourceFile,
            idHint: `sec-${slugify(t.title)}`,
          }),
        )
      }
    } else {
      lessons.push(
        makeLesson({
          trackId: 'llm-security',
          title: `Security — ${b.title}`,
          body: b.body,
          order: order++,
          sourceFile,
          idHint: `batch-${slugify(b.title)}`,
        }),
      )
    }
  }

  // Gateway section in main file — prefer file (1) when overlapping
  const gatewayPart = securityEnd >= 0 ? clean.slice(securityEnd) : ''
  const gwBatches = splitByHeading(
    gatewayPart,
    /^#{1,3}\s+Batch\s+(\d+)\s*[—\-]\s*(.+)$/gm,
  )
  for (const b of gwBatches) {
    if (/revision|interview/i.test(b.title) && b.body.length < 1200) continue
    lessons.push(
      makeLesson({
        trackId: 'llm-gateways',
        title: `Gateway — ${b.title}`,
        body: b.body,
        order: 1000 + order++,
        sourceFile,
        idHint: `gw-${slugify(b.title)}`,
      }),
    )
  }

  return lessons
}

function parseSecurity1(md, sourceFile) {
  const clean = stripExportNoise(md)
  const lessons = []
  let order = 1

  // Gateway batches with numbered topics
  const batches = splitByHeading(clean, /^## Batch\s+(\d+)\s*[—\-]\s*(.+)$/gm)
  for (const b of batches) {
    if (/revision/i.test(b.title) && b.body.length < 1200) continue
    // Prefer topic-level lessons inside batch
    const topics = splitByHeading(b.body, /^##\s+(\d+(?:\.\d+)?)\.\s+(.+)$/gm)
    if (topics.length >= 2) {
      for (const t of topics) {
        lessons.push(
          makeLesson({
            trackId: 'llm-gateways',
            title: t.title.replace(/^\d+(?:\.\d+)?\.\s*/, ''),
            body: t.body,
            order: order++,
            sourceFile,
            idHint: slugify(t.title),
          }),
        )
      }
    } else {
      lessons.push(
        makeLesson({
          trackId: 'llm-gateways',
          title: `Gateway — ${b.title}`,
          body: b.body,
          order: order++,
          sourceFile,
          idHint: `batch-${slugify(b.title)}`,
        }),
      )
    }
  }

  // Numbered failure concepts that look like production problems without "Concept N"
  // Capture "## 1. What is ..." groups under production-ish headings
  const failureBlocks = splitByHeading(
    clean,
    /^# Concept\s+(\d+)\.\s*(.+)$/gm,
  )
  for (const f of failureBlocks) {
    lessons.push(
      makeLesson({
        trackId: 'production-failures',
        title: f.title,
        body: f.body,
        order: 5000 + order++,
        sourceFile,
        idHint: slugify(f.title),
      }),
    )
  }

  // Also parse standalone problem titles like "# Concept 36" style already handled.
  // Parse sections titled as production problems via "# 1. ..." under known batches
  const problemish = splitByHeading(
    clean,
    /^##\s+\d+\.\s+(What is .+)$/gm,
  )
  // Only keep if body has detect/fix pattern and not already covered heavily
  for (const p of problemish) {
    if (!/how to detect|how to fix/i.test(p.body)) continue
    if (p.body.length < 400) continue
    lessons.push(
      makeLesson({
        trackId: 'production-failures',
        title: p.title,
        body: p.body,
        order: 6000 + order++,
        sourceFile,
        idHint: `prob-${slugify(p.title)}`,
      }),
    )
  }

  return lessons
}

function parseSecurity2(md, sourceFile) {
  const clean = stripExportNoise(md)
  const lessons = []
  let order = 1

  const concepts = splitByHeading(clean, /^# Concept\s+(\d+)\.\s*(.+)$/gm)
  for (const c of concepts) {
    const m = c.title.match(/^(\d+)\.\s*(.+)$/)
    const num = m ? Number(m[1]) : order
    const title = m ? m[2] : c.title
    const trackId = num >= 36 ? 'production-failures' : 'production-failures'
    lessons.push(
      makeLesson({
        trackId,
        title: `Concept ${num}. ${title}`,
        body: c.body,
        order: num,
        sourceFile,
        idHint: `c${num}-${slugify(title)}`,
      }),
    )
    order++
  }

  const batches = splitByHeading(clean, /^# Batch\s+(\d+)\s*[—\-]\s*(.+)$/gm)
  for (const b of batches) {
    if (/revision|knowledge check/i.test(b.title) && b.body.length < 1000) continue
    // Only add batch overview if it has substantial unique content beyond concepts
    if (b.body.length < 1500) continue
    lessons.push(
      makeLesson({
        trackId: 'production-failures',
        title: `Batch — ${b.title}`,
        body: b.body.slice(0, 15000),
        order: 8000 + order++,
        sourceFile,
        idHint: `batch-${slugify(b.title)}`,
      }),
    )
  }

  return lessons
}

/**
 * LLM Security, LLM Gateways and Production Failures, rebuilt from the three security roadmap files:
 * one whole lesson per concept / topic (never per sub-heading), each batch followed by its revision
 * lesson, duplicates across files resolved to the longest copy. See roadmap-structure.mjs.
 */
function buildSecurityTracks(mainMd, gw1Md, sec2Md) {
  const main = stripExportNoise(mainMd)
  const gw1 = stripExportNoise(gw1Md)
  const sec2 = stripExportNoise(sec2Md)
  const lessons = []
  const emit = (trackId, specs, file, start) =>
    specs.forEach((s, i) =>
      lessons.push(makeLesson({ trackId, title: s.title, body: s.body, order: start + i, sourceFile: file, idHint: s.idHint })),
    )
  const conceptWord = /^concept\s+(\d+)\.\s+(.+)$/i
  const MODULE2 = /^module 2\s*[—–-]\s*llm gateway engineering$/i

  // LLM Security — 30 concepts in 6 batches ("# Concept N." early, bare "# N. Title" from 16 on)
  const security = segmentCourse(region(main, null, MODULE2), {
    maxLevel: 1,
    conceptAt: (h) => {
      const m = h.title.match(/^(?:concept\s+)?(\d+)\.\s+(.+)$/i)
      if (!m) return null
      const num = Number(m[1])
      const word = /^concept/i.test(h.title)
      if (num < 1 || num > 30 || !(word || (h.level === 1 && num >= 16))) return null
      return { key: `s${num}`, num, title: m[2].trim() }
    },
    batchOfConcept: (n) => Math.ceil(n / 5),
  })
  emit(
    'llm-security',
    courseLessons(security, {
      idPrefix: 'sec',
      name: (c) => `Concept ${c.num}. ${c.title}`,
      reviewTitle: (b, t) => `Batch ${b} — revision & practice${t ? `: ${t}` : ''}`,
    }),
    'LLM Security Gateways Roadmap.md',
    1,
  )

  // LLM Gateways — 5 batches × 5 topics, spread over the main file and file (1)
  const gwOpts = {
    maxLevel: 2,
    conceptAt: (h) => {
      const c = h.title.match(conceptWord)
      if (c && h.level === 1) return { num: Number(c[1]), title: c[2].trim() }
      const m = h.level === 2 ? h.title.match(/^(\d+)\.\s+(.+)$/) : null
      return m ? { num: Number(m[1]), title: m[2].trim() } : null
    },
    keyOf: (c, batch) => `b${batch}-${c.num}`,
  }
  const gateways = mergeCourses(
    segmentCourse(region(main, MODULE2, /pdf masterclass/i), gwOpts),
    segmentCourse(region(gw1, null, /complete production problems masterclass/i), gwOpts),
  )
  emit(
    'llm-gateways',
    courseLessons(gateways, {
      idPrefix: 'gw',
      name: (c) => c.title,
      reviewTitle: (b, t) => `Batch ${b} — revision & practice${t ? `: ${t}` : ''}`,
    }),
    'LLM Security Gateways Roadmap (1).md',
    1,
  )

  // Production Failures — 75 concepts in 15 batches (1–40 in file (1), 36–75 in file (2))
  const prodOpts = {
    maxLevel: 1,
    conceptAt: (h) => {
      const m = h.title.match(conceptWord)
      return m ? { key: `p${m[1]}`, num: Number(m[1]), title: m[2].trim() } : null
    },
    batchOfConcept: (n) => Math.ceil(n / 5),
  }
  const production = mergeCourses(
    segmentCourse(region(gw1, /complete production problems masterclass/i, null), prodOpts),
    segmentCourse(region(sec2, null, /^production-grade genai/i), prodOpts),
  )
  const prodSpecs = courseLessons(production, {
    idPrefix: 'pf',
    name: (c) => `Concept ${c.num}. ${c.title}`,
    reviewTitle: (b, t) => `Batch ${b} — revision & practice${t ? `: ${t}` : ''}`,
  })
  emit('production-failures', prodSpecs, 'LLM Security Gateways Roadmap (1).md', 1)

  // Observability & logging course (file (2), its own concept numbering) — after the 75 problems
  const observability = segmentCourse(region(sec2, /^production-grade genai/i, /visual handbook/i), {
    ...prodOpts,
    conceptAt: (h) => {
      const m = h.title.match(conceptWord)
      return m ? { key: `o${m[1]}`, num: Number(m[1]), title: m[2].trim() } : null
    },
  })
  emit(
    'production-failures',
    courseLessons(observability, {
      idPrefix: 'obs',
      name: (c) => `Observability ${c.num}. ${c.title}`,
      reviewTitle: (b, t) => `Observability batch ${b} — revision & practice${t ? `: ${t}` : ''}`,
    }),
    'LLM Security Gateways Roadmap (2).md',
    prodSpecs.length + 1,
  )
  return lessons
}

function parseRagMega(md, sourceFile) {
  const clean = stripExportNoise(md)
  const lessons = []

  const agenticIdx = clean.search(/^# Part 1: Complete Agentic AI curriculum/m)
  const multiIdx = clean.search(/^# Part 1: Complete multi-agent orchestration curriculum/m)

  const ragMd = clean.slice(0, agenticIdx > 0 ? agenticIdx : clean.length)
  const agentMd =
    agenticIdx > 0
      ? clean.slice(agenticIdx, multiIdx > agenticIdx ? multiIdx : clean.length)
      : ''
  const multiMd = multiIdx > 0 ? clean.slice(multiIdx) : ''

  function parseParts(partMd, trackId, startOrder = 1) {
    const parts = splitByHeading(partMd, /^# Part\s+([\d.]+):\s*(.+)$/gm)
    const out = []
    let order = startOrder
    for (const p of parts) {
      const title = p.title.replace(/^[\d.]+:\s*/, '')
      // Prefer module-level lessons inside part when available
      const modules = splitByHeading(p.body, /^## Module\s+(\d+):\s*(.+)$/gm)
      if (modules.length >= 1 && p.body.length > 4000) {
        for (const mod of modules) {
          out.push(
            makeLesson({
              trackId,
              title: `Module — ${mod.title.replace(/^\d+:\s*/, '')}`,
              body: mod.body,
              order: order++,
              sourceFile,
              idHint: slugify(mod.title),
            }),
          )
        }
        // Also keep a part overview if remaining non-module content is large
        const withoutModules = p.body.replace(/^## Module[\s\S]*?(?=^## Module|^# Part|$)/gm, '')
        if (withoutModules.length > 2500) {
          out.push(
            makeLesson({
              trackId,
              title: `Part overview — ${title}`,
              body: withoutModules,
              order: order++,
              sourceFile,
              idHint: `part-${slugify(title)}`,
            }),
          )
        }
      } else {
        out.push(
          makeLesson({
            trackId,
            title: title.startsWith('Part') ? title : `Part — ${title}`,
            body: p.body,
            order: order++,
            sourceFile,
            idHint: slugify(title),
          }),
        )
      }
    }
    return out
  }

  lessons.push(...parseParts(ragMd, 'rag', 1))
  lessons.push(...parseParts(agentMd, 'agentic-ai', 1))
  lessons.push(...parseParts(multiMd, 'multi-agent', 1))
  return lessons
}

function dedupeLessons(lessons) {
  const byKey = new Map()
  for (const lesson of lessons) {
    const key = `${lesson.trackId}::${slugify(lesson.title)}`
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, lesson)
      continue
    }
    const prevLen = JSON.stringify(prev.sections).length
    const nextLen = JSON.stringify(lesson.sections).length
    // Prefer richer content; for gateways prefer non-1000+ order from file (1)
    if (nextLen > prevLen * 1.05) byKey.set(key, lesson)
    else if (
      lesson.trackId === 'llm-gateways' &&
      lesson.sourceFile.includes('(1)') &&
      !prev.sourceFile.includes('(1)')
    ) {
      byKey.set(key, lesson)
    }
  }

  const grouped = {}
  for (const lesson of byKey.values()) {
    if (!grouped[lesson.trackId]) grouped[lesson.trackId] = []
    grouped[lesson.trackId].push(lesson)
  }

  // Keep the id a lesson had before (matched by title) so learners' progress survives re-ordering.
  const previous = previousIds()
  const result = []
  for (const trackId of TRACK_META.map((t) => t.id)) {
    const list = (grouped[trackId] || []).sort((a, b) => a.order - b.order)
    const used = new Set()
    list.forEach((l, i) => {
      l.order = i + 1
      const old = previous.get(`${trackId}::${slugify(l.title)}`)
      l.id = old && !used.has(old) ? old : `${trackId}-${String(i + 1).padStart(3, '0')}-${slugify(l.title)}`
      used.add(l.id)
      result.push(l)
    })
  }
  return result
}

function previousIds() {
  const map = new Map()
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(outDir, 'index.json'), 'utf8'))
    for (const [trackId, list] of Object.entries(idx.lessonsByTrack || {})) {
      for (const l of list) {
        const key = `${trackId}::${slugify(l.title)}`
        if (!map.has(key)) map.set(key, l.id)
      }
    }
  } catch {
    /* first run */
  }
  return map
}

function main() {
  fs.mkdirSync(outDir, { recursive: true })

  const sourceDir = path.join(root, '.bin', 'roadmaps')
  const files = {
    llmConcepts: path.join(sourceDir, 'LLM Concepts Roadmap.md'),
    security: path.join(sourceDir, 'LLM Security Gateways Roadmap.md'),
    security1: path.join(sourceDir, 'LLM Security Gateways Roadmap (1).md'),
    security2: path.join(sourceDir, 'LLM Security Gateways Roadmap (2).md'),
    rag: path.join(sourceDir, 'RAG Masterclass Roadmap.md'),
  }

  for (const [k, p] of Object.entries(files)) {
    if (!fs.existsSync(p)) {
      console.log('Roadmap sources not found (.bin/roadmaps) — skipping, keeping the committed generated lessons.')
      process.exit(0)
    }
  }

  console.log('Parsing roadmaps…')
  const all = [
    ...parseLlmConcepts(fs.readFileSync(files.llmConcepts, 'utf8'), 'LLM Concepts Roadmap.md'),
    ...buildSecurityTracks(
      fs.readFileSync(files.security, 'utf8'),
      fs.readFileSync(files.security1, 'utf8'),
      fs.readFileSync(files.security2, 'utf8'),
    ),
    ...parseRagMega(fs.readFileSync(files.rag, 'utf8'), 'RAG Masterclass Roadmap.md'),
  ]

  const lessons = dedupeLessons(all)
  console.log(`Parsed ${all.length} raw → ${lessons.length} unique lessons`)

  const byTrack = {}
  for (const t of TRACK_META) byTrack[t.id] = []
  for (const lesson of lessons) byTrack[lesson.trackId].push(lesson)

  for (const [trackId, list] of Object.entries(byTrack)) {
    const file = path.join(outDir, `${trackId}.json`)
    fs.writeFileSync(file, JSON.stringify(list))
    console.log(`  ${trackId}: ${list.length} lessons → ${path.basename(file)}`)
  }

  const index = {
    generatedAt: new Date().toISOString(),
    tracks: TRACK_META.map((t) => ({
      ...t,
      lessonCount: byTrack[t.id].length,
    })),
    lessonsByTrack: Object.fromEntries(
      Object.entries(byTrack).map(([id, list]) => [
        id,
        list.map(({ id: lid, title, summary, order }) => ({
          id: lid,
          title,
          summary,
          order,
        })),
      ]),
    ),
  }

  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2))
  console.log('Wrote index.json')
}

main()
