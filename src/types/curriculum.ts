export type TrackId =
  | 'llm-concepts'
  | 'rag'
  | 'agentic-ai'
  | 'multi-agent'
  | 'llm-security'
  | 'llm-gateways'
  | 'production-failures'

export type FrameworkTag =
  | 'plain'
  | 'langchain'
  | 'langgraph'
  | 'adk'
  | 'pydantic'
  | 'sql'

export type FlowNode = {
  id: string
  label: string
  x: number
  y: number
  kind?: 'start' | 'process' | 'decision' | 'end' | 'danger' | 'success'
}

export type FlowEdge = {
  id: string
  source: string
  target: string
  label?: string
}

export type FlowSpec = {
  title?: string
  template?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  steps: Array<{
    id: string
    label: string
    activeNodeIds: string[]
    activeEdgeIds: string[]
    narration: string
  }>
}

export type ScenarioChoice = {
  id: string
  label: string
  outcome: 'success' | 'warning' | 'failure'
  explanation: string
}

export type ScenarioSpec = {
  title: string
  situation: string
  choices: ScenarioChoice[]
}

export type CodeSnippet = {
  id: string
  title: string
  language: 'python' | 'sql' | 'bash' | 'text'
  framework: FrameworkTag
  code: string
}

export type QuizItem = {
  id: string
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

export type TeachingPoint = {
  id: string
  title: string
  visualExplanation: string
  textExplanation: string
  body: string
  diagram: FlowSpec
}

export type LessonSection = {
  id: string
  title: string
  body: string
  visualSummary?: string
  diagram?: FlowSpec
  points?: TeachingPoint[]
  scenario?: ScenarioSpec
  code?: CodeSnippet[]
}

export type Lesson = {
  id: string
  trackId: TrackId
  title: string
  summary: string
  order: number
  objectives: string[]
  sections: LessonSection[]
  quiz?: QuizItem[]
  relatedIds?: string[]
  sourceFile?: string
  labIds?: string[]
}

export type TrackMeta = {
  id: TrackId
  title: string
  tagline: string
  description: string
  accent: string
  lessonCount: number
}

export type CurriculumIndex = {
  generatedAt: string
  tracks: TrackMeta[]
  lessonsByTrack: Record<TrackId, Array<Pick<Lesson, 'id' | 'title' | 'summary' | 'order'>>>
}
