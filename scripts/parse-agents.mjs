/**
 * agents/ → VeeraAgents track (AI agents, agentic AI, LangChain, LangGraph, Google ADK, Pydantic AI).
 *
 * Sources (each used once — "copy", "copy 2", "(1)" and intrview/ mirrors are removed by content hash):
 *   NN-*.md                 Agentic AI curriculum (modules 1–13)
 *   NN_*.md                 Senior agent-engineering guide (01–12, 15)
 *   day-NN-*.md             21-day bootcamp (Pydantic AI → LangChain → LangGraph → capstone)
 *   day_NN_*.ipynb          Google ADK 15-day course (notebooks)
 *   *.ipynb (others)        LangGraph notebooks: reducers, tool nodes, memory, HITL, checkpointers…
 *   Copilot chat exports    deep dives (ReAct/reflection agents, agents without frameworks, interview banks)
 *
 * Learn modules 01–09, then Exercises (10), Projects (11), Interview (12).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanTitle, hash, headingsOf, isChatExport, parseChatExport, splitUnits } from './course-kit.mjs'
import { createTrack, writeTrack } from './track-builder.mjs'
import { AGENT_DIAGRAMS } from './diagrams-agents.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
// Source material lives in .bin/ (never pushed to GitHub); a root-level copy also works.
const srcRoot = [path.join(root, 'agents'), path.join(root, '.bin', 'agents')].find((d) => fs.existsSync(d)) || path.join(root, '.bin', 'agents')
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK = {
  id: 'agents',
  title: 'VeeraAgents',
  tagline: 'AI agents · LangChain · LangGraph · Google ADK — Learn → Visualize → Practice → Interview',
  description:
    'Agentic AI from first principles to production: tool calling, agents without frameworks, LangChain, LangGraph, memory and human-in-the-loop, Google ADK, multi-agent patterns, guardrails, evaluation and 400+ interview questions.',
  accent: '#7c3aed',
}

export const AGENT_MODULES = {
  '01': { id: '01', name: 'Foundations' },
  '02': { id: '02', name: 'Tool Calling & MCP' },
  '03': { id: '03', name: 'Agents from Scratch' },
  '04': { id: '04', name: 'LangChain & Frameworks' },
  '05': { id: '05', name: 'LangGraph' },
  '06': { id: '06', name: 'Memory, State & HITL' },
  '07': { id: '07', name: 'Google ADK' },
  '08': { id: '08', name: 'Multi-Agent & Patterns' },
  '09': { id: '09', name: 'Production & Safety' },
}
const M = AGENT_MODULES

const SERIES = {
  curriculum: 'Agentic AI Curriculum',
  senior: 'Senior Agent Engineering',
  adk: 'Google ADK 15-Day Course',
  langgraph: 'LangGraph Notebooks',
  bootcamp: '21-Day Agent Bootcamp',
  gemini: 'Gemini Enterprise Agent Platform',
  interview: 'Interview Banks',
  projects: 'Project Ideas',
}
const SERIES_RANK = {
  [SERIES.curriculum]: 10,
  [SERIES.senior]: 20,
  [SERIES.adk]: 12,
  [SERIES.langgraph]: 25,
  [SERIES.bootcamp]: 30,
  [SERIES.gemini]: 35,
  [SERIES.interview]: 10,
  [SERIES.projects]: 10,
}

/** Files that are not about agents (or are only indexes / prompts) — reported, not published. */
const SKIP = [
  [/^software_engineering_mastery_guide/, 'general software engineering, not agents'],
  [/^devops-mlops-master-guide/, 'DevOps / MLOps, not agents'],
  [/machine_learning_interview_preparation_guide/, 'classic ML interview prep, not agents'],
  [/^GCP_Complete_Production_Interview_Guide/, 'GCP platform interview guide, not agents'],
  [/^Krishnaik_Advanced_Route_Syllabus/, 'course syllabus / link list'],
  [/^Enterprise_AI_Engineering_Training/, 'SDLC / enterprise process training'],
  [/^AI_Agents_Agentic_AI_Interview_Prompt/, 'a prompt template, not content'],
  [/^CHECKPOINTERS_START_HERE/, 'pointer to the checkpointers notebook'],
  [/^00-master-index-and-roadmap/, 'index page'],
  [/^00_START_HERE_index\.ipynb/, 'index notebook'],
  [/^README\.md$/, 'index page'],
]

/** File → [module, series, options]. First match wins. */
const ROUTES = [
  // interview banks (whole file is Q&A)
  [/^12-interview-questions-100/, '12', SERIES.interview, { kind: 'interview', title: '100 Agentic AI Interview Questions' }],
  [/^Generative_AI_LLM_Agentic_AI_Interview_Playbook_300Q/, '12', SERIES.interview, { kind: 'interview', title: 'GenAI, LLM & Agentic AI Playbook — 300 Questions' }],
  [/^wed_mar_18_2026_e_commerce_multi_agent_system_design/, '12', SERIES.interview, { kind: 'interview', title: 'GenAI & Agentic Systems — Experienced Developer Questions' }],
  [/^fri_may_29_2026_security_risks_in_ai_agent_tool/, '12', SERIES.interview, { kind: 'interview', title: 'Tool Calling Interview Question Bank' }],
  // project idea collections
  [/^13-50-project-ideas/, '11', SERIES.projects, { kind: 'project', title: '50 Real-World Agentic AI Project Ideas' }],
  [/^15_Agentic_AI_Projects/, '11', SERIES.projects, { kind: 'project', title: '15 Production-Grade Agentic AI Projects' }],
  [/^day-21-capstone/, '11', SERIES.bootcamp, { kind: 'project' }],

  // curriculum NN-*.md
  [/^01-agentic-ai-fundamentals/, '01', SERIES.curriculum],
  [/^02-langchain-deep-dive/, '04', SERIES.curriculum],
  [/^03-langgraph-deep-dive/, '05', SERIES.curriculum],
  [/^04-huggingface-quantized-models/, '01', SERIES.curriculum],
  [/^05-building-agents-without-frameworks/, '03', SERIES.curriculum],
  [/^06-agent-evaluation-and-benchmarking/, '09', SERIES.curriculum],
  [/^07-tracing-monitoring-cost-observability/, '09', SERIES.curriculum],
  [/^08-guardrails-safety-infinite-loops/, '09', SERIES.curriculum],
  [/^09-context-engineering-and-loop-engineering/, '03', SERIES.curriculum],
  [/^10-tool-auth-authorization-evaluation/, '02', SERIES.curriculum],
  [/^11-advanced-patterns-mcp-rag-multiagent/, '08', SERIES.curriculum],

  // senior guide NN_*.md
  [/^01_agent_foundations/, '01', SERIES.senior],
  [/^02_tool_use_function_calling/, '02', SERIES.senior],
  [/^03_multi_agent_systems/, '08', SERIES.senior],
  [/^04_memory_systems/, '06', SERIES.senior],
  [/^05_prompt_engineering/, '01', SERIES.senior],
  [/^06_agent_frameworks/, '04', SERIES.senior],
  [/^07_cost_optimization/, '09', SERIES.senior],
  [/^08_performance_latency/, '09', SERIES.senior],
  [/^09_reliability_error_handling/, '09', SERIES.senior],
  [/^10_security/, '09', SERIES.senior],
  [/^11_observability_evaluation/, '09', SERIES.senior],
  [/^12_agentic_design_patterns/, '08', SERIES.senior],

  // 21-day bootcamp
  [/^day-01-/, '01', SERIES.bootcamp],
  [/^day-02-/, '01', SERIES.bootcamp],
  [/^day-03-/, '02', SERIES.bootcamp],
  [/^day-04-/, '09', SERIES.bootcamp],
  [/^day-05-/, '06', SERIES.bootcamp],
  [/^day-06-/, '02', SERIES.bootcamp],
  [/^day-07-/, '08', SERIES.bootcamp],
  [/^day-08-/, '04', SERIES.bootcamp],
  [/^day-09-/, '05', SERIES.bootcamp],
  [/^day-10-/, '03', SERIES.bootcamp],
  [/^day-11-/, '02', SERIES.bootcamp],
  [/^day-12-/, '06', SERIES.bootcamp],
  [/^day-13-/, '08', SERIES.bootcamp],
  [/^day-14-/, '06', SERIES.bootcamp],
  [/^day-15-/, '08', SERIES.bootcamp],
  [/^day-16-/, '06', SERIES.bootcamp],
  [/^day-17-/, '05', SERIES.bootcamp],
  [/^day-18-/, '02', SERIES.bootcamp],
  [/^day-19-/, '09', SERIES.bootcamp],
  [/^day-20-/, '09', SERIES.bootcamp],

  // Google ADK
  [/(^|\/)day_\d+_.*\.ipynb$/, '07', SERIES.adk],
  [/^(README copy\.md|intrview\/README\.md)$/, '07', SERIES.adk, { title: 'Google ADK course overview' }],
  [/^gemini-enterprise-agent-platform-guide/, '07', SERIES.gemini],

  // LangGraph / LangChain notebooks
  [/^0_tool_calling\.ipynb/, '02', SERIES.langgraph, { title: 'Tool calling with LangChain' }],
  [/^intro\.ipynb/, '04', SERIES.langgraph, { title: 'LangChain & LangGraph — first steps' }],
  [/^0_a_langgraph_reducsers\.ipynb/, '05', SERIES.langgraph, { title: 'Reducers — why state needs merge rules' }],
  [/^4_reducers_complete\.ipynb/, '05', SERIES.langgraph],
  [/^0_tool_nodes\.ipynb/, '05', SERIES.langgraph, { title: 'Tool nodes' }],
  [/^langgraph_tool_nodes\.ipynb/, '05', SERIES.langgraph, { title: 'Tool nodes — different tools, 4 examples' }],
  [/^conditional_edges\.ipynb/, '05', SERIES.langgraph, { title: 'Conditional edges' }],
  [/^loop_\.ipynb/, '05', SERIES.langgraph, { title: 'Loops in LangGraph' }],
  [/^langgraph_advanced\.ipynb/, '05', SERIES.langgraph],
  [/^5_missing_topics\.ipynb/, '05', SERIES.langgraph],
  [/^memory\.ipynb/, '06', SERIES.langgraph],
  [/^3_memory_complete\.ipynb/, '06', SERIES.langgraph],
  [/^1_humanin_loop\.ipynb/, '06', SERIES.langgraph, { title: 'Human-in-the-loop basics' }],
  [/^human_in_loop\.ipynb/, '06', SERIES.langgraph],
  [/^6_hitl_fastapi_sqlite\.ipynb/, '06', SERIES.langgraph],
  [/^7_checkpointers_complete\.ipynb/, '06', SERIES.langgraph],

  // chat exports (each may hold several courses → topic decides the module)
  [/^sun_apr_19_2026_re_act_agent_implementation_guide/, '03', null, { mixed: true }],
  [/^sun_may_31_2026_building_an_ai_agent_without_frameworks/, '03', null, { mixed: true }],
  [/^thu_may_28_2026_ai_agent_interview_preparation_guide/, '01', null, { mixed: true, series: 'Agentic AI Interview Prep Guide' }],
  [/^fri_may_29_2026_customer_support_bot_for_shop_co/, '08', null, { mixed: true }],
  [/^ggggg\.md$/, '01', null, { mixed: true, series: 'Generative AI Teaching Material' }],
]

/** Keyword → module for mixed sources (chat exports covering several topics). */
function moduleByTopic(text) {
  const t = String(text || '').toLowerCase()
  if (/\badk\b|google agent|gemini|vertex/.test(t)) return '07'
  if (/quantiz|\blora\b|qlora|gguf|llama\.cpp|hugging ?face|fine-?tun|unsloth|tokeniz|embedding|transformer|what is (an? )?(llm|ai|generative)|large language model|genai applications|foundations/.test(t)) return '01'
  if (/\bmcp\b|model context protocol|tool call|function call|tool & skill|tools? (ecosystem|design|schema)/.test(t)) return '02'
  if (/human[- ]in[- ]the[- ]loop|\bhitl\b|interrupt|memory|checkpoint|persist|context engineering/.test(t)) return '06'
  if (/langgraph|stategraph|reducer|conditional edge/.test(t)) return '05'
  if (/multi[- ]agent|supervisor|orchestrat|swarm|\ba2a\b|agent-to-agent|design pattern|agent patterns|reflection|planner|\brag\b|retriev|chunking|rerank|query transform/.test(t)) return '08'
  if (/guardrail|safety|alignment|security|injection|evaluat|metric|benchmark|observab|tracing|monitor|cost|latency|performance|reliab|production|operations|deploy|\bauth/.test(t)) return '09'
  if (/langchain|\blcel\b|pydantic ai|framework/.test(t)) return '04'
  if (/react|from scratch|without framework|agent loop|loop engineering|agent architecture|decision flow|execution/.test(t)) return '03'
  return null
}

/** "LAYER 5: TOOL & SKILL ECOSYSTEM — Deep & Complete Explanation" → "Layer 5: Tool & Skill Ecosystem" */
function niceSeries(h1) {
  let t = cleanTitle(h1)
    .replace(/^copilot chat conversation export:\s*/i, '')
    .replace(/\s*[—–-]\s*(deep|crystal|complete|every single|end-to-end|clear|full)\b.*$/i, '')
    .replace(/\s*\((complete|full)[^)]*\)\s*$/i, '')
    .trim()
  if (t === t.toUpperCase()) t = t.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Ai|Llm|Rag|Mcp|Api|Gguf|Lora|Qlora|A2a)\b/g, (w) => w.toUpperCase())
  return t.slice(0, 64)
}

/* --------------------------------------------------------------- notebooks */

function htmlToMd(src) {
  let s = String(src)
  if (!/<(div|span|h[1-6]|p|table|br|b|strong|code)\b/i.test(s)) return s
  s = s
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n#### $1\n')
    .replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(div|p|li|tr|ul|ol|table)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' · ')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, ' $1 ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
  return s
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^✓\s*/gm, '- ')
}

function cellText(src) {
  return Array.isArray(src) ? src.join('') : String(src || '')
}

function outputText(outputs = []) {
  const parts = []
  for (const o of outputs) {
    if (o.output_type === 'stream') parts.push(cellText(o.text))
    else if (o.data?.['text/plain'] && !o.data['image/png']) parts.push(cellText(o.data['text/plain']))
    else if (o.output_type === 'error') parts.push(`${o.ename}: ${o.evalue}`)
  }
  let t = parts.join('\n').replace(/\x1b\[[0-9;]*m/g, '').trim()
  if (!t) return ''
  if (t.length > 1500) t = `${t.slice(0, 1500)}\n… (output truncated)`
  return t
}

/** Notebook → markdown. Returns { md, title } (title from the banner H1 when present). */
function notebookToMd(raw, file) {
  let nb
  try {
    nb = JSON.parse(raw)
  } catch {
    return null
  }
  const lang = nb.metadata?.kernelspec?.language || 'python'
  const out = []
  let title = ''
  for (const cell of nb.cells || []) {
    const src = cellText(cell.source)
    if (!src.trim()) continue
    if (cell.cell_type === 'markdown') {
      const md = htmlToMd(src)
      if (!title) {
        const h1 = headingsOf(md, 1)[0]
        if (h1) title = h1.title
      }
      out.push(md.trim())
    } else if (cell.cell_type === 'code') {
      const fence = /^\s*[!%]/.test(src) && !/\n\s*[^!%\s]/.test(src) ? 'bash' : lang
      out.push(`\`\`\`${fence}\n${src.replace(/^\s*[!%]+/gm, '').trimEnd()}\n\`\`\``)
      const o = outputText(cell.outputs)
      if (o) out.push(`**Output**\n\n\`\`\`text\n${o.replace(/```/g, "'''")}\n\`\`\``)
    }
  }
  return { md: out.join('\n\n'), title: title || path.basename(file, '.ipynb') }
}

function adkTitle(rel, bannerTitle) {
  const m = rel.match(/day_(\d+)_/)
  return m ? `Day ${+m[1]} — ${cleanTitle(bannerTitle)}` : bannerTitle
}

/* -------------------------------------------------------------------- main */

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '__pycache__', '.ipynb_checkpoints'].includes(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (/\.(md|ipynb|py)$/i.test(e.name)) acc.push(full)
  }
  return acc
}

const rel = (full) => path.relative(srcRoot, full).split(path.sep).join('/')
const isCopyName = (r) => / copy( \d+)?\.(md|ipynb)$| \(\d+\)( copy)?\.(md|ipynb)$/.test(r) || r.startsWith('intrview/')

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.log('agents sources not found (.bin/agents) — skipping, keeping the committed generated lessons.')
    process.exit(0)
  }
  // originals first so the kept copy has the clean file name
  const files = walk(srcRoot).sort((a, b) => Number(isCopyName(rel(a))) - Number(isCopyName(rel(b))) || a.localeCompare(b))

  const track = createTrack({
    trackId: 'agents',
    prefix: 'ag',
    moduleFor: (topic, ctx) => {
      if (ctx.mixed) return M[moduleByTopic(topic) || moduleByTopic(ctx.series) || ctx.defaultModule] || M['01']
      return M[ctx.defaultModule] || M['01']
    },
    seriesRank: (s) => SERIES_RANK[s] ?? 40,
  })

  const used = []
  const skipped = []
  const seen = new Set()
  for (const full of files) {
    const r = rel(full)
    const base = path.basename(r)
    const raw = fs.readFileSync(full, 'utf8')
    if (raw.trim().length < 80) {
      skipped.push(`${r} (empty)`)
      continue
    }
    const h = hash(raw.replace(/\s+/g, ' '), 16)
    if (seen.has(h)) {
      skipped.push(`${r} (duplicate copy)`)
      continue
    }
    seen.add(h)
    const skip = SKIP.find(([re]) => re.test(r))
    if (skip) {
      skipped.push(`${r} (${skip[1]})`)
      continue
    }
    const route = ROUTES.find(([re]) => re.test(r) || re.test(base))
    if (!route) {
      skipped.push(`${r} (no route)`)
      continue
    }
    const [, mod, series, opt = {}] = route

    let md = raw
    let title = opt.title
    if (r.endsWith('.ipynb')) {
      const nb = notebookToMd(raw, r)
      if (!nb) {
        skipped.push(`${r} (invalid notebook)`)
        continue
      }
      md = nb.md
      title = title || (series === SERIES.adk ? adkTitle(r, nb.title) : cleanTitle(nb.title))
    }

    if (r.endsWith('.py')) {
      track.addPython({ rel: r, code: raw, series: series || 'Code', defaultModule: mod })
      used.push(r)
      continue
    }

    // companions: whole file is interview / project material
    if (opt.kind === 'interview' || opt.kind === 'project') {
      const body = isChatExport(md) ? parseChatExport(md).map((c) => c.md).join('\n\n') : md
      track.addDoc({ rel: r, md: body, series, title, defaultModule: mod, kindOverride: opt.kind, forceKind: true, preferUnits: false })
      used.push(r)
      continue
    }

    if (isChatExport(md)) {
      let n = 0
      for (const c of parseChatExport(md)) {
        const h1 = headingsOf(c.md, 1).filter((x) => !x.banner)[0]?.title || base
        const ser = opt.series || niceSeries(h1)
        const units = splitUnits(c.md)
        if (units && units.units.length >= 2) {
          track.addCourse({ rel: r, md: c.md, series: ser, courseTitle: h1, defaultModule: mod, units, mixed: !!opt.mixed })
        } else {
          track.addDoc({ rel: r, md: c.md, series: ser, title: niceSeries(h1), defaultModule: moduleByTopic(h1) || mod, preferUnits: false })
        }
        n++
      }
      used.push(`${r} (${n} conversations)`)
      continue
    }

    track.addDoc({ rel: r, md, series: series || opt.series, title, defaultModule: mod, kindOverride: opt.kind || null, preferUnits: true })
    used.push(r)
  }

  const { lessons, stats } = track.finalize({ diagrams: AGENT_DIAGRAMS })
  writeTrack({ outDir, trackId: 'agents', track: TRACK, lessons })

  const byMod = {}
  for (const l of lessons) {
    const k = l.title.slice(0, 2)
    byMod[k] = (byMod[k] || 0) + 1
  }
  console.log(`Agents track: ${lessons.length} lessons from ${used.length} sources (${stats.candidates} candidates)`)
  console.log('  by module:', byMod)
  console.log(`  duplicate sections removed: ${stats.droppedSections}`)
  console.log(`  curated diagrams placed: ${stats.diagramsPlaced}/${AGENT_DIAGRAMS.length}`)
  if (stats.diagramsMissed.length) console.log('  NOT placed:', stats.diagramsMissed.join(', '))
  if (process.argv.includes('--verbose')) {
    console.log('  used:\n   ', used.join('\n    '))
    console.log('  skipped:\n   ', skipped.join('\n    '))
  } else {
    console.log(`  skipped ${skipped.length} files (run with --verbose to list)`)
  }
}

main()
