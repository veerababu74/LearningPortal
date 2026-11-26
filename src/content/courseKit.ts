/**
 * Reusable course model (phases → modules → lessons) for tracks built with scripts/track-builder.mjs.
 * Lesson titles look like "07. Module Name: Topic", so the module comes from the title prefix.
 */
import { getCurriculumIndex } from '@/content/loadCurriculum'
import type { AgentSim } from '@/content/agents/visualizer'

export type LessonRef = { id: string; title: string; summary: string; order: number; series?: string; part?: number; partCount?: number }
export type ModuleGroup = { id: string; name: string; lessons: LessonRef[] }
export type PhaseId = 'learn' | 'exercises' | 'projects' | 'interview'
export type Phase = { id: PhaseId; title: string; blurb: string; accent: string; moduleIds: string[] }
export type ModuleInfo = { blurb: string; color: string; icon: string }

export type CourseLab = { to: string; icon: string; title: string; text: string }

export type CourseConfig = {
  trackId: string
  base: string
  title: string
  accent: string
  kicker: string
  heroTitle: string
  heroText: string
  searchPlaceholder: string
  phases: Phase[]
  modules: Record<string, ModuleInfo>
  sims: AgentSim[]
  simModuleOf: (s: AgentSim) => string | undefined
  visualizerBase: string
  demoSimId: string
  labs: CourseLab[]
}

export function moduleFromTitle(title: string) {
  const m = title.match(/^(\d{2})\.\s*([^:]+):/)
  return m ? { id: m[1], name: m[2].trim() } : { id: '99', name: 'More' }
}

export function lessonTopic(title: string) {
  return String(title || '').replace(/^\d{2}\.\s*[^:]+:\s*/, '').trim()
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

export function courseLessons(cfg: CourseConfig): LessonRef[] {
  const idx = getCurriculumIndex().lessonsByTrack as Record<string, LessonRef[]>
  return idx[cfg.trackId] || []
}

export function courseModules(cfg: CourseConfig): ModuleGroup[] {
  const map = new Map<string, ModuleGroup>()
  for (const lesson of courseLessons(cfg)) {
    const mod = moduleFromTitle(lesson.title)
    if (!map.has(mod.id)) map.set(mod.id, { id: mod.id, name: mod.name, lessons: [] })
    map.get(mod.id)!.lessons.push(lesson)
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export function phaseOf(cfg: CourseConfig, phaseId: string) {
  return cfg.phases.find((p) => p.id === phaseId)
}

export function phaseForModule(cfg: CourseConfig, moduleId: string): PhaseId | undefined {
  return cfg.phases.find((p) => p.moduleIds.includes(moduleId))?.id
}

export function modulesForPhase(cfg: CourseConfig, phaseId: string) {
  const phase = phaseOf(cfg, phaseId)
  return phase ? courseModules(cfg).filter((m) => phase.moduleIds.includes(m.id)) : []
}

export function searchCourse(cfg: CourseConfig, query: string, scope?: { phaseId?: string; moduleId?: string }) {
  let lessons = courseLessons(cfg)
  if (scope?.moduleId) lessons = lessons.filter((l) => moduleFromTitle(l.title).id === scope.moduleId)
  else if (scope?.phaseId) {
    const ids = new Set(phaseOf(cfg, scope.phaseId)?.moduleIds || [])
    lessons = lessons.filter((l) => ids.has(moduleFromTitle(l.title).id))
  }
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return lessons
  return lessons.filter((l) => {
    const hay = `${l.title} ${l.summary} ${l.series || ''}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}
