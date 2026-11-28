/**
 * One place that knows every simulation and which lessons should embed which ones.
 */
import { AGENT_SIMS, type AgentSim } from '@/content/agents/visualizer'
import { PATTERN_SIMS } from './patterns'
import { RAG_SIMS } from './rag'
import { RAG_ADVANCED_SIMS } from './rag-advanced'
import { PYTHON_SIMS } from './python'
import { PROJECT_SIMS } from './project'
import { ML_SIMS } from './ml'
import { SD_SIMS } from './system'

/** Gallery at /agents/visualizer: agents and multi-agent patterns. */
export const AGENT_GALLERY: AgentSim[] = [...AGENT_SIMS, ...PATTERN_SIMS]
/** Gallery at /rag/visualizer: the VeeraRAG simulations, in learning order. */
export const RAG_GALLERY: AgentSim[] = [...RAG_SIMS, ...RAG_ADVANCED_SIMS].sort(
  (a, b) => (a.ragModule || '99').localeCompare(b.ragModule || '99'),
)
/** Gallery at /python/visualizer. */
export const PYTHON_GALLERY: AgentSim[] = PYTHON_SIMS
/** Gallery at /project/visualizer. */
export const PROJECT_GALLERY: AgentSim[] = PROJECT_SIMS
/** Gallery at /ml/visualizer. */
export const ML_GALLERY: AgentSim[] = ML_SIMS
/** Gallery at /system-design/visualizer. */
export const SD_GALLERY: AgentSim[] = SD_SIMS

const PY_IDS = new Set(PYTHON_SIMS.map((s) => s.id))
const RAG_IDS = new Set(RAG_GALLERY.map((s) => s.id))
const PROJ_IDS = new Set(PROJECT_GALLERY.map((s) => s.id))
const ML_IDS = new Set(ML_GALLERY.map((s) => s.id))
const SD_IDS = new Set(SD_GALLERY.map((s) => s.id))
const byId = (id: string) => [...AGENT_GALLERY, ...RAG_GALLERY, ...PYTHON_GALLERY, ...PROJECT_GALLERY, ...ML_GALLERY, ...SD_GALLERY].find((s) => s.id === id)

export function getAnySim(id: string) {
  return byId(id)
}

export function isPythonSim(sim: AgentSim) {
  return PY_IDS.has(sim.id)
}

export function simHref(sim: AgentSim) {
  if (isPythonSim(sim)) return `/python/visualizer/${sim.id}`
  if (RAG_IDS.has(sim.id)) return `/rag/visualizer/${sim.id}`
  if (PROJ_IDS.has(sim.id)) return `/project/visualizer/${sim.id}`
  if (ML_IDS.has(sim.id)) return `/ml/visualizer/${sim.id}`
  if (SD_IDS.has(sim.id)) return `/system-design/visualizer/${sim.id}`
  return `/agents/visualizer/${sim.id}`
}

export function simLessonsHref(sim: AgentSim) {
  return sim.home || `/agents/learn/${sim.module}`
}

export function simsForTrack(trackId: string): AgentSim[] {
  return poolFor(trackId)?.sims || []
}

export function simGroup(sim: AgentSim) {
  return sim.group || 'Agents'
}

type Pool = { sims: AgentSim[]; fallback?: string }

function poolFor(trackId: string): Pool | null {
  switch (trackId) {
    case 'agents':
      return { sims: [...AGENT_GALLERY, ...RAG_GALLERY] }
    case 'veerarag':
      return { sims: [...RAG_GALLERY, byId('agentic-rag')!, byId('mcp-session')!, byId('guardrails')!], fallback: 'rag-query' }
    case 'agentic-ai':
      return { sims: [...AGENT_SIMS, ...PATTERN_SIMS], fallback: 'react-loop' }
    case 'multi-agent':
      return { sims: [...PATTERN_SIMS, byId('supervisor')!, byId('hitl-interrupt')!, byId('guardrails')!], fallback: 'supervisor' }
    case 'rag':
      return { sims: [...RAG_GALLERY, byId('agentic-rag')!, byId('guardrails')!], fallback: 'rag-query' }
    case 'llm-security':
      return { sims: [byId('guardrails')!, byId('rag-multitenant')!, byId('tool-calling')!], fallback: 'guardrails' }
    case 'production-failures':
    case 'llm-gateways':
      return { sims: [byId('rag-semantic-cache')!, byId('durable-resume')!, byId('saga-compensation')!, byId('guardrails')!] }
    case 'python':
      return { sims: PYTHON_SIMS }
    case 'asyncconcur':
      return { sims: PYTHON_SIMS.filter((s) => s.group === 'Concurrency' || s.id === 'py-generator' || s.id === 'py-exceptions') }
    case 'veeraproject':
      return { sims: PROJECT_GALLERY, fallback: 'proj-capstone-e2e' }
    case 'veeraml':
      return { sims: ML_GALLERY }
    case 'veerasys':
      return { sims: SD_GALLERY }
    default:
      return null
  }
}

/** Simulations to embed in a lesson (best match first, max 3). */
export function simsForLesson(trackId: string, title: string, sourceFile = ''): AgentSim[] {
  const pool = poolFor(trackId)
  if (!pool) return []
  const mod = title.match(/^(\d{2})\./)?.[1]
  // course tracks: no simulations on exercise / project / interview lessons
  if (mod && Number(mod) >= 10 && ['agents', 'python', 'asyncconcur'].includes(trackId)) return []
  if (mod && Number(mod) >= 20 && ['veerarag', 'veeraproject', 'veeraml', 'veerasys'].includes(trackId)) return []
  const topic = title.replace(/^\d{2}\.\s*[^:]+:\s*/, '').replace(/^(Part|Module)( overview)?\s*—\s*/, '')
  const hits = pool.sims.filter((s) => s.match.test(topic) || (sourceFile && s.match.test(sourceFile)))
  if (hits.length) {
    // prefer sims from the lesson's own module, keep pool order otherwise
    const own = (s: AgentSim) => (trackId === 'veerarag' ? s.ragModule === mod : s.module === mod)
    return [...hits].sort((a, b) => Number(own(b)) - Number(own(a))).slice(0, 3)
  }
  if ((trackId === 'agents' || trackId === 'veeraproject' || trackId === 'veeraml' || trackId === 'veerasys') && mod) {
    const own = pool.sims.filter((s) => s.module === mod)
    if (own.length) return own.slice(0, 1)
  }
  if (trackId === 'veerarag' && mod) {
    const own = pool.sims.filter((s) => s.ragModule === mod)
    if (own.length) return own.slice(0, 1)
  }
  if (pool.fallback) {
    const f = byId(pool.fallback)
    return f ? [f] : []
  }
  return []
}
