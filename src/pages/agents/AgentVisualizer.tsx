import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AGENT_MODULE_INFO } from '@/content/agents/catalog'
import type { AgentSim } from '@/content/agents/visualizer'
import { AGENT_GALLERY, ML_GALLERY, SD_GALLERY, PROJECT_GALLERY, PYTHON_GALLERY, RAG_GALLERY, simGroup, simLessonsHref } from '@/content/sims/registry'
import { AgentSimPlayer } from '@/components/agents/AgentSimPlayer'
import '@/components/python/python.css'
import '@/components/agents/agents.css'

type Kind = 'agents' | 'python' | 'rag' | 'project' | 'ml' | 'system'

const GALLERIES: Record<
  Kind,
  { sims: AgentSim[]; base: string; home: string; homeLabel: string; kicker: string; title: string; intro: string }
> = {
  agents: {
    sims: AGENT_GALLERY,
    base: '/agents/visualizer',
    home: '/agents',
    homeLabel: 'VeeraAgents',
    kicker: 'Agent Visualizer',
    title: 'Watch agents and multi-agent systems run, one step at a time',
    intro:
      'Each simulation animates a real scenario: a packet travels between components, the active part glows, the live state and event log update, and the matching line of code is highlighted. Predict mode pauses at key moments and asks what happens next.',
  },
  rag: {
    sims: RAG_GALLERY,
    base: '/rag/visualizer',
    home: '/rag',
    homeLabel: 'VeeraRAG',
    kicker: 'RAG Visualizer',
    title: 'Watch RAG pipelines run, one step at a time',
    intro:
      'Ingestion, BM25 scoring, hybrid search, multi-query, corrective RAG, GraphRAG, evaluation gates and a production incident — each animated step by step with live state, highlighted code and predict-the-next-step questions.',
  },
  python: {
    sims: PYTHON_GALLERY,
    base: '/python/visualizer',
    home: '/python',
    homeLabel: 'Python',
    kicker: 'Python Visualizer',
    title: 'See what the interpreter does, line by line',
    intro:
      'Frames being pushed and popped, names pointing at objects, generators pausing at yield, the event loop switching tasks, threads fighting over the GIL. Play each one, predict the next step, and watch the highlighted line run.',
  },
  ml: {
    sims: ML_GALLERY,
    base: '/ml/visualizer',
    home: '/ml',
    homeLabel: 'VeeraML',
    kicker: 'ML Visualizer',
    title: 'Watch machine-learning algorithms learn, one step at a time',
    intro:
      'A leak-free pipeline, gradient descent (and divergence), a decision-tree split, threshold tuning, random forests, gradient boosting, K-means, cross-validation, backpropagation and production drift — each with the real numbers at every step, highlighted code and predict-the-next-step questions.',
  },
  system: {
    sims: SD_GALLERY,
    base: '/system-design/visualizer',
    home: '/system-design',
    homeLabel: 'VeeraSystem',
    kicker: 'System Design Visualizer',
    title: 'Watch distributed systems work, one step at a time',
    intro:
      'A request through the whole stack, read replicas and lag, cache-aside races, consistent hashing, load balancing, Raft elections, sagas, Kafka consumer groups, circuit breakers, rate limiting and a URL shortener — each with live state, highlighted code and predict-the-next-step questions.',
  },
  project: {
    sims: PROJECT_GALLERY,
    base: '/project/visualizer',
    home: '/project',
    homeLabel: 'VeeraProject',
    kicker: 'Full-Stack & AI Visualizer',
    title: 'Watch JS, TypeScript, Playwright, REST & FastAPI execute step by step',
    intro:
      'Microtasks vs macrotasks, Zod runtime validation, Playwright auto-wait & page.route() 429 mocks, Playwright MCP + HITL, HTTP Keep-Alive, BOLA ownership checks, Token Bucket caching, SSE token streams, and FastAPI ASGI + Pydantic V2 — animated line by line with predict-the-next-step prompts.',
  },
}

function moduleLabel(sim: AgentSim, kind: Kind) {
  if (kind === 'python' || kind === 'project' || kind === 'ml' || kind === 'system') return `Module ${sim.module}`
  if (kind === 'rag') return `Module ${sim.ragModule || '—'}`
  const info = AGENT_MODULE_INFO[sim.module]
  return `${info?.icon || ''} Module ${sim.module}`
}

export function SimGallery({ kind }: { kind: Kind }) {
  const g = GALLERIES[kind]
  const groups = useMemo(() => ['All', ...Array.from(new Set(g.sims.map(simGroup)))], [g])
  const [group, setGroup] = useState('All')
  const sims = useMemo(() => g.sims.filter((s) => group === 'All' || simGroup(s) === group), [g, group])

  return (
    <div className="py-page">
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to={g.home}>{g.homeLabel}</Link>
        <span>/</span>
        <span>{g.kicker}</span>
      </nav>
      <section className="ag-hero">
        <p className="py-kicker" style={{ color: '#7c3aed' }}>
          {g.kicker} · {g.sims.length} simulations
        </p>
        <h1>{g.title}</h1>
        <p>{g.intro}</p>
      </section>

      <div className="ag-filter" role="group" aria-label="Filter simulations">
        {groups.map((x) => (
          <button key={x} type="button" className={x === group ? 'on' : ''} onClick={() => setGroup(x)}>
            {x}
            {x !== 'All' ? ` (${g.sims.filter((s) => simGroup(s) === x).length})` : ''}
          </button>
        ))}
      </div>

      <div className="ag-sim-grid">
        {sims.map((s) => (
          <Link key={s.id} to={`${g.base}/${s.id}`} className="ag-sim-card">
            <div className="ag-tags">
              <span className="ag-tag">▶ {s.framework}</span>
              <span className="ag-tag lvl">{simGroup(s)}</span>
              <span className="ag-tag lvl">{s.level}</span>
            </div>
            <h3>
              {g.sims.indexOf(s) + 1}. {s.title}
            </h3>
            <p>{s.summary}</p>
            <p className="py-muted">
              {s.steps.length} steps · {s.steps.filter((x) => x.predict).length} predictions · {moduleLabel(s, kind)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function SimPage({ kind }: { kind: Kind }) {
  const g = GALLERIES[kind]
  const { simId = '' } = useParams()
  const sim = g.sims.find((s) => s.id === simId)
  if (!sim) return <Navigate to={g.base} replace />
  const idx = g.sims.indexOf(sim)
  const prev = g.sims[idx - 1]
  const next = g.sims[idx + 1]

  return (
    <div className="py-page" style={{ maxWidth: 1280 }}>
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to={g.home}>{g.homeLabel}</Link>
        <span>/</span>
        <Link to={g.base}>{g.kicker}</Link>
        <span>/</span>
        <span>{sim.title}</span>
      </nav>

      <div className="ag-sim-head">
        <div>
          <div className="ag-tags">
            <span className="ag-tag">▶ {sim.framework}</span>
            <span className="ag-tag lvl">{simGroup(sim)}</span>
            <span className="ag-tag lvl">{sim.level}</span>
          </div>
          <h1 style={{ margin: '0.3rem 0' }}>{sim.title}</h1>
          <p className="py-muted" style={{ margin: 0, maxWidth: '70ch' }}>
            {sim.summary}
          </p>
        </div>
        <div className="ag-sim-nav">
          {prev ? (
            <Link className="ag-cta soft" to={`${g.base}/${prev.id}`}>
              ← Previous
            </Link>
          ) : null}
          {next ? (
            <Link className="ag-cta soft" to={`${g.base}/${next.id}`}>
              Next: {next.title.split(':')[0]} →
            </Link>
          ) : null}
        </div>
      </div>

      <AgentSimPlayer sim={sim} />

      <section className="py-card">
        <p className="py-kicker">Key takeaways</p>
        <ul className="ag-takeaways">
          {sim.takeaways.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p style={{ marginTop: '0.8rem' }}>
          <Link className="ag-cta soft" to={simLessonsHref(sim)}>
            Read the lessons for this topic →
          </Link>
        </p>
      </section>
    </div>
  )
}

export function AgentVisualizerIndex() {
  return <SimGallery kind="agents" />
}

export function AgentVisualizerPage() {
  return <SimPage kind="agents" />
}

export function PythonVisualizerIndex() {
  return <SimGallery kind="python" />
}

export function PythonVisualizerPage() {
  return <SimPage kind="python" />
}

export function RagVisualizerIndex() {
  return <SimGallery kind="rag" />
}

export function RagVisualizerPage() {
  return <SimPage kind="rag" />
}

export function ProjectVisualizerIndex() {
  return <SimGallery kind="project" />
}

export function ProjectVisualizerPage() {
  return <SimPage kind="project" />
}

export function MlVisualizerIndex() {
  return <SimGallery kind="ml" />
}

export function MlVisualizerPage() {
  return <SimPage kind="ml" />
}

export function SystemVisualizerIndex() {
  return <SimGallery kind="system" />
}

export function SystemVisualizerPage() {
  return <SimPage kind="system" />
}
