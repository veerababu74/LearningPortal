import { getPythonPath } from '@/content/python/path'
import { getAgentsPath } from '@/content/agents/path'
import { getRagPath } from '@/content/rag/path'
import { getProjectPath } from '@/content/project/path'
import type { PathCourse } from '@/pages/path/PathPages'

const PY_COMPANIONS = { '10': 'Exercises', '11': 'Project', '12': 'Interview' }
const VP_COMPANIONS = { '20': 'Exercises', '21': 'Projects & Labs', '22': 'Interview' }

export const PYTHON_PATH_COURSE: PathCourse = {
  track: 'python',
  base: '/python',
  title: 'Python Mastery',
  getPath: getPythonPath,
  companions: PY_COMPANIONS,
}

export const AGENTS_PATH_COURSE: PathCourse = {
  track: 'agents',
  base: '/agents',
  title: 'VeeraAgents',
  getPath: getAgentsPath,
  companions: PY_COMPANIONS,
}

export const RAG_PATH_COURSE: PathCourse = {
  track: 'veerarag',
  base: '/rag',
  title: 'VeeraRAG',
  getPath: getRagPath,
  companions: VP_COMPANIONS,
}

export const PROJECT_PATH_COURSE: PathCourse = {
  track: 'veeraproject',
  base: '/project',
  title: 'VeeraProject',
  getPath: getProjectPath,
  companions: VP_COMPANIONS,
}

/** Which path (if any) a lesson belongs to — used for lesson navigation and the "Topic · step" link. */
export function pathForTrack(track: string) {
  if (track === 'python') return PYTHON_PATH_COURSE
  if (track === 'agents') return AGENTS_PATH_COURSE
  if (track === 'veerarag') return RAG_PATH_COURSE
  if (track === 'veeraproject') return PROJECT_PATH_COURSE
  return null
}
