export type PyFlowNode = {
  id: string
  label: string
  kind?: 'start' | 'process' | 'decision' | 'end' | 'danger' | 'success' | 'data'
}

export type PyFlowEdge = {
  id: string
  source: string
  target: string
  label?: string
}

export type PyFlowStep = {
  id: string
  label: string
  narration: string
  activeNodeIds: string[]
  activeEdgeIds: string[]
  codeHighlightLines?: number[]
}

export type PyFlow = {
  title: string
  nodes: PyFlowNode[]
  edges: PyFlowEdge[]
  steps: PyFlowStep[]
}

export type PyCodeSnippet = {
  id: string
  title: string
  language: 'python' | 'text' | 'bash'
  code: string
  notes?: string[]
}

export type PyInterviewItem = {
  id: string
  kind: 'concept' | 'scenario'
  question: string
  answer: {
    concept: string
    syntax: string
    example: string
    tradeoff: string
  }
}

export type PyScenarioChoice = {
  id: string
  label: string
  outcome: 'success' | 'warning' | 'failure'
  explanation: string
}

export type PyLesson = {
  id: string
  moduleId: string
  order: number
  title: string
  duration: string
  story: {
    title: string
    scene: string
    pain: string
  }
  flow: PyFlow
  concept: {
    definition: string
    internals: string[]
    terms: Array<{ term: string; meaning: string }>
    analogyLimit?: string
  }
  code: PyCodeSnippet[]
  scenario: {
    title: string
    situation: string
    choices: PyScenarioChoice[]
  }
  interview: PyInterviewItem[]
  labId?: string
  sourceHint?: string
}

export type PyModule = {
  id: string
  number: number
  title: string
  goal: string
  lessons: PyLesson[]
  mastery: {
    concept: { q: string; a: string }
    scenario: { q: string; a: string }
    interview: { q: string; a: string }
  }
}

export type PyLabMeta = {
  id: string
  title: string
  blurb: string
  simulation: boolean
}

export type PyGeneratedTopic = {
  id: string
  file: string
  title: string
  summary: string
  sections: Array<{ heading: string; body: string }>
  codeBlocks: Array<{ language: string; code: string }>
  conceptualQA: Array<{ q: string; a: string }>
  scenarioQA: Array<{ q: string; a: string }>
}
