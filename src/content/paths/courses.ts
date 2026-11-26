import { getPythonPath } from '@/content/python/path'
import { getAgentsPath } from '@/content/agents/path'
import type { PathCourse } from '@/pages/path/PathPages'

const COMPANIONS = { '10': 'Exercises', '11': 'Project', '12': 'Interview' }

export const PYTHON_PATH_COURSE: PathCourse = {
  track: 'python',
  base: '/python',
  title: 'Python Mastery',
  getPath: getPythonPath,
  companions: COMPANIONS,
}

export const AGENTS_PATH_COURSE: PathCourse = {
  track: 'agents',
  base: '/agents',
  title: 'VeeraAgents',
  getPath: getAgentsPath,
  companions: COMPANIONS,
}

/** Which path (if any) a lesson belongs to — used for lesson navigation and the "Topic · step" link. */
export function pathForTrack(track: string) {
  if (track === 'python') return PYTHON_PATH_COURSE
  if (track === 'agents') return AGENTS_PATH_COURSE
  return null
}
