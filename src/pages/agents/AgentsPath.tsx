import { AGENTS_PATH_COURSE } from '@/content/paths/courses'
import { InterviewHub } from '@/pages/path/InterviewHub'
import { TopicPage } from '@/pages/path/PathPages'

export function AgentsTopicPage() {
  return <TopicPage course={AGENTS_PATH_COURSE} />
}

export function AgentsInterviewHub() {
  return <InterviewHub course={AGENTS_PATH_COURSE} />
}
