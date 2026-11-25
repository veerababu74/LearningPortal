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

export type PyModuleGroup = {
  id: string
  name: string
  lessons: LessonRef[]
}

export type PyPhaseId = 'learn' | 'exercises' | 'projects' | 'interview'

export const PYTHON_PHASES: {
  id: PyPhaseId
  title: string
  blurb: string
  accent: string
  moduleIds: string[]
}[] = [
  {
    id: 'learn',
    title: 'Learn',
    blurb: 'Nine concept modules — one lesson per concept with full explanations, runnable examples and flow diagrams.',
    accent: '#1f6feb',
    moduleIds: ['01', '02', '03', '04', '05', '06', '07', '08', '09'],
  },
  {
    id: 'exercises',
    title: 'Exercises',
    blurb: 'Coding challenges and exercise sets from every course and workshop.',
    accent: '#0f766e',
    moduleIds: ['10'],
  },
  {
    id: 'projects',
    title: 'Projects',
    blurb: 'Mini-projects that apply each concept end-to-end.',
    accent: '#b45309',
    moduleIds: ['11'],
  },
  {
    id: 'interview',
    title: 'Interview',
    blurb: 'Conceptual and scenario questions with 5-year-experience model answers, plus quizzes.',
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

export function getPythonLessons(): LessonRef[] {
  return getCurriculumIndex().lessonsByTrack.python || []
}

export function getPythonModules(): PyModuleGroup[] {
  const map = new Map<string, PyModuleGroup>()
  for (const lesson of getPythonLessons()) {
    const mod = moduleFromTitle(lesson.title)
    if (!map.has(mod.id)) map.set(mod.id, { id: mod.id, name: mod.name, lessons: [] })
    map.get(mod.id)!.lessons.push(lesson)
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export function getPhase(phaseId: string) {
  return PYTHON_PHASES.find((p) => p.id === phaseId)
}

export function getModulesForPhase(phaseId: string): PyModuleGroup[] {
  const phase = getPhase(phaseId)
  if (!phase) return []
  return getPythonModules().filter((m) => phase.moduleIds.includes(m.id))
}

export function getModule(moduleId: string): PyModuleGroup | undefined {
  return getPythonModules().find((m) => m.id === moduleId)
}

export function phaseForModule(moduleId: string): PyPhaseId | undefined {
  return PYTHON_PHASES.find((p) => p.moduleIds.includes(moduleId))?.id
}

export function searchPythonLessons(query: string, scope?: { phaseId?: string; moduleId?: string }) {
  const q = query.trim().toLowerCase()
  let lessons = getPythonLessons()

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
  return lessons.filter((l) => {
    const hay = `${l.title} ${l.summary}`.toLowerCase()
    return hay.includes(q)
  })
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
