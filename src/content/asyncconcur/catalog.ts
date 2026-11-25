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

export type AcModuleGroup = {
  id: string
  name: string
  lessons: LessonRef[]
}

export type AcPhaseId = 'learn' | 'exercises' | 'projects' | 'interview'

export const ASYNC_PHASES: {
  id: AcPhaseId
  title: string
  blurb: string
  accent: string
  moduleIds: string[]
}[] = [
  {
    id: 'learn',
    title: 'Learn',
    blurb: 'Fundamentals → threading → multiprocessing → asyncio → patterns → production → CPython internals, with a flow diagram for every core idea.',
    accent: '#0f766e',
    moduleIds: ['01', '02', '03', '04', '05', '06', '07'],
  },
  {
    id: 'exercises',
    title: 'Exercises',
    blurb: 'Each chapter’s own exercises and hands-on tasks: races, locks, pools, async tasks.',
    accent: '#1d4ed8',
    moduleIds: ['10'],
  },
  {
    id: 'projects',
    title: 'Projects',
    blurb: 'Real-world concurrent scrapers, queues, chat, and pipelines.',
    accent: '#b45309',
    moduleIds: ['11'],
  },
  {
    id: 'interview',
    title: 'Interview',
    blurb: '20 FastAPI / asyncio interview questions with senior-level model answers.',
    accent: '#7c3aed',
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

export function getAsyncLessons(): LessonRef[] {
  return getCurriculumIndex().lessonsByTrack.asyncconcur || []
}

export function getAsyncModules(): AcModuleGroup[] {
  const map = new Map<string, AcModuleGroup>()
  for (const lesson of getAsyncLessons()) {
    const mod = moduleFromTitle(lesson.title)
    if (!map.has(mod.id)) map.set(mod.id, { id: mod.id, name: mod.name, lessons: [] })
    map.get(mod.id)!.lessons.push(lesson)
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export function getPhase(phaseId: string) {
  return ASYNC_PHASES.find((p) => p.id === phaseId)
}

export function getModulesForPhase(phaseId: string): AcModuleGroup[] {
  const phase = getPhase(phaseId)
  if (!phase) return []
  return getAsyncModules().filter((m) => phase.moduleIds.includes(m.id))
}

export function getModule(moduleId: string): AcModuleGroup | undefined {
  return getAsyncModules().find((m) => m.id === moduleId)
}

export function phaseForModule(moduleId: string): AcPhaseId | undefined {
  return ASYNC_PHASES.find((p) => p.moduleIds.includes(moduleId))?.id
}

export function searchAsyncLessons(query: string, scope?: { phaseId?: string; moduleId?: string }) {
  const q = query.trim().toLowerCase()
  let lessons = getAsyncLessons()
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
  return lessons.filter((l) => `${l.title} ${l.summary}`.toLowerCase().includes(q))
}

export function cleanPreview(text: string) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/`+/g, '')
    .replace(/[#*_>|]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}
