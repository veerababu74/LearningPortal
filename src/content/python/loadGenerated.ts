import index from '@/content/generated/python/index.json'
import backend from '@/content/generated/python/backend-interview.json'

type IndexShape = {
  generatedAt: string
  topicCount: number
  oopSubtopicCount: number
  backendQuestionCount: number
  topics: Array<{
    id: string
    title: string
    file?: string
    summary: string
    conceptualCount: number
    scenarioCount: number
    codeCount: number
  }>
  oopSubtopics: Array<{ id: string; title: string; file?: string; summary: string }>
}

export function getPythonGeneratedIndex(): IndexShape {
  return index as IndexShape
}

export function getGeneratedTopic(id: string) {
  const meta =
    getPythonGeneratedIndex().topics.find((t) => t.id === id) ||
    getPythonGeneratedIndex().oopSubtopics.find((t) => t.id === id)
  if (!meta) return null
  return {
    id: meta.id,
    file: meta.file || '',
    title: meta.title,
    summary: meta.summary,
    sections: [
      {
        heading: 'Open the GenAI-style lesson',
        body: `This topic is taught with LessonShell (same as GenAI tracks). Open /learn/python/${meta.id} for flows, points, scenarios, Python snippets, and exercises.`,
      },
    ],
    codeBlocks: [] as Array<{ language: string; code: string }>,
    conceptualQA: [] as Array<{ q: string; a: string }>,
    scenarioQA: [] as Array<{ q: string; a: string }>,
  }
}

export function getBackendInterviewQuestions() {
  return (
    (backend as {
      questions: Array<{
        id: string
        number: number
        question: string
        answer: string
        detail: string
        code: string
      }>
    }).questions || []
  )
}
