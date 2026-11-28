import { getCurriculumIndex } from '@/content/loadCurriculum'

export type Course = {
  id: 'python' | 'async' | 'agents' | 'rag' | 'project' | 'ml' | 'system' | 'docker' | 'genai'
  title: string
  kicker: string
  blurb: string
  to: string
  accent: string
  icon: string
  /** Curriculum track ids that belong to this course (Docker has its own static content). */
  trackIds: string[]
}

/** Tracks that have their own course home (everything else is a GenAI track). */
export const COURSE_TRACKS = new Set(['python', 'asyncconcur', 'agents', 'veerarag', 'veeraproject', 'veeraml', 'veerasys'])

export function genaiTrackIds() {
  return getCurriculumIndex()
    .tracks.map((t) => t.id)
    .filter((id) => !COURSE_TRACKS.has(id))
}

export const COURSES: Course[] = [
  {
    id: 'python',
    title: 'Python Mastery',
    kicker: 'Core language',
    blurb: 'Fundamentals to advanced Python: data structures, functions, OOP, decorators, typing, files and backend — with exercises, projects and interview answers.',
    to: '/python',
    accent: '#1f6feb',
    icon: '🐍',
    trackIds: ['python'],
  },
  {
    id: 'async',
    title: 'Async & Concurrency',
    kicker: 'Threads · processes · asyncio',
    blurb: 'Threading, multiprocessing, asyncio, CPython internals and production FastAPI, with a flow diagram for every core idea.',
    to: '/async',
    accent: '#0f766e',
    icon: '⚡',
    trackIds: ['asyncconcur'],
  },
  {
    id: 'agents',
    title: 'VeeraAgents',
    kicker: 'AI agents · LangChain · LangGraph · ADK',
    blurb: 'Tool calling, agents from scratch, LangChain, LangGraph, memory and human-in-the-loop, Google ADK, multi-agent patterns and guardrails.',
    to: '/agents',
    accent: '#7c3aed',
    icon: '🤖',
    trackIds: ['agents'],
  },
  {
    id: 'rag',
    title: 'VeeraRAG',
    kicker: 'RAG · BM25 · GraphRAG · evaluation',
    blurb: 'Retrieval-Augmented Generation end to end: chunking, embeddings, BM25 and hybrid search, reranking, GraphRAG, evaluation, observability and production — with labs and interview banks.',
    to: '/rag',
    accent: '#0d9488',
    icon: '🔎',
    trackIds: ['veerarag'],
  },
  {
    id: 'project',
    title: 'VeeraProject',
    kicker: 'JS · TS · Playwright · REST · FastAPI',
    blurb: 'Full-Stack AI & QA Engineering: JS event loop, TypeScript + Zod, Playwright Python & TS, BDD, Agentic MCP, JWT/OAuth2/BOLA, Redis/SSE, FastAPI ASGI & Pydantic V2.',
    to: '/project',
    accent: '#2563eb',
    icon: '🚀',
    trackIds: ['veeraproject'],
  },
  {
    id: 'ml',
    title: 'VeeraML',
    kicker: 'Machine learning · math · deep learning · MLOps',
    blurb: 'Machine learning from the math up: data prep, regression, classification, ensembles, clustering, evaluation and tuning, deep learning, NLP/LLMs and MLOps — with real plots, simulations, labs and projects.',
    to: '/ml',
    accent: '#ea580c',
    icon: '📊',
    trackIds: ['veeraml'],
  },
  {
    id: 'system',
    title: 'VeeraSystem',
    kicker: 'System design · distributed systems · case studies',
    blurb: 'System design from first principles: databases, caching, load balancing, distributed systems, messaging, microservices, security, observability, scaling to millions, low-level design and 25+ case studies — with simulations, labs and interview answers.',
    to: '/system-design',
    accent: '#0f766e',
    icon: '🏗️',
    trackIds: ['veerasys'],
  },
  {
    id: 'genai',
    title: 'Generative AI',
    kicker: 'LLMs · RAG · security · production',
    blurb: 'LLM concepts, RAG masterclass, agentic AI, multi-agent orchestration, LLM security, gateways and production failure modes.',
    to: '/tracks',
    accent: '#c026d3',
    icon: '✨',
    trackIds: [], // filled at runtime with genaiTrackIds()
  },
  {
    id: 'docker',
    title: 'Docker',
    kicker: 'Containers',
    blurb: 'Images, containers, volumes, networking, Compose and production deployment, with hands-on labs and a capstone.',
    to: '/docker',
    accent: '#0369a1',
    icon: '🐳',
    trackIds: [],
  },
]

export function courseTrackIds(c: Course) {
  return c.id === 'genai' ? genaiTrackIds() : c.trackIds
}

/** Where "back to the course" should go for a lesson's track. */
export function courseHomeFor(trackId: string): { to: string; label: string } {
  if (trackId === 'python') return { to: '/python', label: 'Python Mastery' }
  if (trackId === 'asyncconcur') return { to: '/async', label: 'Async & Concurrency' }
  if (trackId === 'agents') return { to: '/agents', label: 'VeeraAgents' }
  if (trackId === 'veerarag') return { to: '/rag', label: 'VeeraRAG' }
  if (trackId === 'veeraproject') return { to: '/project', label: 'VeeraProject' }
  if (trackId === 'veeraml') return { to: '/ml', label: 'VeeraML' }
  if (trackId === 'veerasys') return { to: '/system-design', label: 'VeeraSystem' }
  const t = getCurriculumIndex().tracks.find((x) => x.id === trackId)
  return t ? { to: `/tracks/${trackId}`, label: t.title } : { to: '/tracks', label: 'Generative AI tracks' }
}

/** The lesson the learner opened last, as a link. */
export function continueLink(lastLessonId: string | null | undefined) {
  if (!lastLessonId) return null
  for (const [trackId, list] of Object.entries(getCurriculumIndex().lessonsByTrack)) {
    const hit = list.find((l) => l.id === lastLessonId)
    if (hit) return { to: `/learn/${trackId}/${lastLessonId}`, title: hit.title.replace(/^\d{2}\.\s*[^:]+:\s*/, ''), trackId }
  }
  return null
}
