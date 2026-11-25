/**
 * One place that knows every simulation and which lessons should embed which ones.
 */
import { AGENT_SIMS, type AgentSim } from '@/content/agents/visualizer'
import { PATTERN_SIMS } from './patterns'
import { RAG_SIMS } from './rag'
import { PYTHON_SIMS } from './python'

/** Gallery at /agents/visualizer: agents, multi-agent patterns and RAG. */
export const AGENT_GALLERY: AgentSim[] = [...AGENT_SIMS, ...PATTERN_SIMS, ...RAG_SIMS]
/** Gallery at /python/visualizer. */
export const PYTHON_GALLERY: AgentSim[] = PYTHON_SIMS

const PY_IDS = new Set(PYTHON_SIMS.map((s) => s.id))
const byId = (id: string) => [...AGENT_GALLERY, ...PYTHON_GALLERY].find((s) => s.id === id)

export function getAnySim(id: string) {
  return byId(id)
}

export function isPythonSim(sim: AgentSim) {
  return PY_IDS.has(sim.id)
}

export function simHref(sim: AgentSim) {
  return isPythonSim(sim) ? `/python/visualizer/${sim.id}` : `/agents/visualizer/${sim.id}`
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
      return { sims: AGENT_GALLERY }
    case 'agentic-ai':
      return { sims: [...AGENT_SIMS, ...PATTERN_SIMS], fallback: 'react-loop' }
    case 'multi-agent':
      return { sims: [...PATTERN_SIMS, byId('supervisor')!, byId('hitl-interrupt')!, byId('guardrails')!], fallback: 'supervisor' }
    case 'rag':
      return { sims: [...RAG_SIMS, byId('agentic-rag')!, byId('guardrails')!], fallback: 'rag-query' }
    case 'llm-security':
      return { sims: [byId('guardrails')!, byId('rag-multitenant')!, byId('tool-calling')!], fallback: 'guardrails' }
    case 'production-failures':
    case 'llm-gateways':
      return { sims: [byId('rag-semantic-cache')!, byId('durable-resume')!, byId('saga-compensation')!, byId('guardrails')!] }
    case 'python':
      return { sims: PYTHON_SIMS }
    case 'asyncconcur':
      return { sims: PYTHON_SIMS.filter((s) => s.group === 'Concurrency' || s.id === 'py-generator' || s.id === 'py-exceptions') }
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
  const topic = title.replace(/^\d{2}\.\s*[^:]+:\s*/, '').replace(/^(Part|Module)( overview)?\s*—\s*/, '')
  const hits = pool.sims.filter((s) => s.match.test(topic) || (sourceFile && s.match.test(sourceFile)))
  if (hits.length) {
    // prefer sims from the lesson's own module, keep pool order otherwise
    return [...hits].sort((a, b) => Number(b.module === mod) - Number(a.module === mod)).slice(0, 3)
  }
  if (trackId === 'agents' && mod) return pool.sims.filter((s) => s.module === mod && !s.home).slice(0, 1)
  if (pool.fallback) {
    const f = byId(pool.fallback)
    return f ? [f] : []
  }
  return []
}
