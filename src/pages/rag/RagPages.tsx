import { RAG_COURSE } from '@/content/rag/course'
import { CourseHome, CourseModulePage, CoursePhasePage } from '@/pages/course/CoursePages'

export function RagHome() {
  return <CourseHome cfg={RAG_COURSE} />
}

export function RagPhasePage() {
  return <CoursePhasePage cfg={RAG_COURSE} />
}

export function RagModulePage() {
  return <CourseModulePage cfg={RAG_COURSE} />
}
