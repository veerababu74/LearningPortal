export type DockerFlowStep = {
  id: string
  label: string
  detail: string
}

export type DockerCodeFile = {
  path: string
  language: 'dockerfile' | 'python' | 'yaml' | 'bash' | 'text' | 'toml'
  code: string
}

export type DockerPractice = {
  prediction: {
    question: string
    choices: string[]
    answerIndex: number
    explanation: string
  }
  exercise: {
    title: string
    prompt: string
    hints: string[]
    checkPrompt: string
    solution: string
  }
  handsOn: {
    title: string
    commands: string[]
    verify: string
    windowsNote?: string
  }
}

export type DockerLesson = {
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
  visual: {
    title: string
    before: string[]
    after: string[]
    flow: DockerFlowStep[]
  }
  concept: {
    definition: string
    internals: string[]
    terms: Array<{ term: string; meaning: string }>
    analogyLimit?: string
  }
  example: {
    title: string
    files: DockerCodeFile[]
    commands: string[]
    expected: string[]
    lineNotes: string[]
  }
  genai: {
    title: string
    fastapi: string
    flaskNote: string
    flow: DockerFlowStep[]
    code: DockerCodeFile[]
  }
  practice: DockerPractice
  labId?: string
}

export type DockerModule = {
  id: string
  number: number
  title: string
  goal: string
  lessons: DockerLesson[]
  mastery: {
    concept: { q: string; a: string }
    debugging: { q: string; a: string }
    interview: { q: string; a: string }
  }
}

export type DockerLabMeta = {
  id: string
  title: string
  blurb: string
  simulation: boolean
}
