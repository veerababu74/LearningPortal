import { PYTHON_PATH_COURSE } from '@/content/paths/courses'
import { InterviewHub } from '@/pages/path/InterviewHub'
import { PathMap, TopicPage } from '@/pages/path/PathPages'

export function PythonPathMap() {
  return <PathMap course={PYTHON_PATH_COURSE} />
}

export function PythonTopicPage() {
  return <TopicPage course={PYTHON_PATH_COURSE} />
}

export function PythonInterviewHub() {
  return <InterviewHub course={PYTHON_PATH_COURSE} />
}
