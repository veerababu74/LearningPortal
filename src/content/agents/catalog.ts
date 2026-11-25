import { getCurriculumIndex } from '@/content/loadCurriculum'

export type LessonRef = {
  id: string
  title: string
  summary: string
  order: number
  series?: string
  part?: number
  partCount?: number
}

export type AgModuleGroup = { id: string; name: string; lessons: LessonRef[] }

export type AgPhaseId = 'learn' | 'exercises' | 'projects' | 'interview'

/** Learning roadmap: what each module teaches and which colour it wears. */
export const AGENT_MODULE_INFO: Record<string, { blurb: string; color: string; icon: string }> = {
  '01': { blurb: 'What an agent is, the ReAct loop, planning, memory types, prompting and the LLM basics underneath.', color: '#7c3aed', icon: '🧭' },
  '02': { blurb: 'Tool schemas, function calling, parallel calls, tool errors, MCP and tool auth.', color: '#ea580c', icon: '🔧' },
  '03': { blurb: 'Build the loop yourself in plain Python: ReAct, plan-and-execute, context and loop engineering.', color: '#1d4ed8', icon: '🛠️' },
  '04': { blurb: 'LangChain, LCEL Runnables, structured output, Pydantic AI and how frameworks compare.', color: '#0891b2', icon: '⛓️' },
  '05': { blurb: 'StateGraph, nodes, reducers, conditional edges, tool nodes, loops, fan-out / fan-in.', color: '#db2777', icon: '🕸️' },
  '06': { blurb: 'Short- and long-term memory, checkpointers, threads, time travel, interrupts and approvals.', color: '#0f766e', icon: '🗄️' },
  '07': { blurb: 'Google ADK 15-day course: Runner, sessions, events, tools, state scopes, workflow agents, callbacks, A2A, deployment.', color: '#16a34a', icon: '🟢' },
  '08': { blurb: 'Supervisor and swarm systems, A2A, agentic RAG, reflection, plan-and-execute and other design patterns.', color: '#9333ea', icon: '🤝' },
  '09': { blurb: 'Guardrails, prompt injection, infinite loops, evaluation, tracing, cost, latency, reliability and deployment.', color: '#dc2626', icon: '🛡️' },
}

export const AGENT_PHASES: { id: AgPhaseId; title: string; blurb: string; accent: string; moduleIds: string[] }[] = [
  {
    id: 'learn',
    title: 'Learn',
    blurb: 'Nine modules from “what is an agent” to production safety — each lesson with curated diagrams and an animated simulation.',
    accent: '#7c3aed',
    moduleIds: ['01', '02', '03', '04', '05', '06', '07', '08', '09'],
  },
  {
    id: 'exercises',
    title: 'Exercises',
    blurb: 'Hands-on tasks from the ADK course and the 21-day bootcamp, with solutions.',
    accent: '#1d4ed8',
    moduleIds: ['10'],
  },
  {
    id: 'projects',
    title: 'Projects',
    blurb: '65+ project ideas and capstones: portfolio-grade agents with architecture and stack.',
    accent: '#b45309',
    moduleIds: ['11'],
  },
  {
    id: 'interview',
    title: 'Interview',
    blurb: '400+ questions with model answers: 100 core agent questions, the 300-question playbook, tool-calling and system-design banks.',
    accent: '#db2777',
    moduleIds: ['12'],
  },
]

function moduleFromTitle(title: string) {
  const m = title.match(/^(\d{2})\.\s*([^:]+):/)
  if (m) return { id: m[1], name: m[2].trim() }
  return { id: '99', name: 'More' }
}

export function lessonTopic(title: string) {
  return String(title || '')
    .replace(/^\d{2}\.\s*[^:]+:\s*/, '')
    .trim()
}

export function getAgentLessons(): LessonRef[] {
  return getCurriculumIndex().lessonsByTrack.agents || []
}

export function getAgentModules(): AgModuleGroup[] {
  const map = new Map<string, AgModuleGroup>()
  for (const lesson of getAgentLessons()) {
    const mod = moduleFromTitle(lesson.title)
    if (!map.has(mod.id)) map.set(mod.id, { id: mod.id, name: mod.name, lessons: [] })
    map.get(mod.id)!.lessons.push(lesson)
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export function getPhase(phaseId: string) {
  return AGENT_PHASES.find((p) => p.id === phaseId)
}

export function getModulesForPhase(phaseId: string): AgModuleGroup[] {
  const phase = getPhase(phaseId)
  if (!phase) return []
  return getAgentModules().filter((m) => phase.moduleIds.includes(m.id))
}

export function getModule(moduleId: string): AgModuleGroup | undefined {
  return getAgentModules().find((m) => m.id === moduleId)
}

export function phaseForModule(moduleId: string): AgPhaseId | undefined {
  return AGENT_PHASES.find((p) => p.moduleIds.includes(moduleId))?.id
}

export function searchAgentLessons(query: string, scope?: { phaseId?: string; moduleId?: string }) {
  const q = query.trim().toLowerCase()
  let lessons = getAgentLessons()
  if (scope?.moduleId) {
    lessons = lessons.filter((l) => moduleFromTitle(l.title).id === scope.moduleId)
  } else if (scope?.phaseId) {
    const phase = getPhase(scope.phaseId)
    if (phase) {
      const ids = new Set(phase.moduleIds)
      lessons = lessons.filter((l) => ids.has(moduleFromTitle(l.title).id))
    }
  }
  if (!q) return lessons
  const words = q.split(/\s+/).filter(Boolean)
  return lessons.filter((l) => {
    const hay = `${l.title} ${l.summary} ${l.series || ''}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

export function cleanPreview(text: string) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/`+/g, '')
    .replace(/[#*_>|]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}
