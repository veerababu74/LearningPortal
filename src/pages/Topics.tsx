import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { DOCKER_LABS, DOCKER_MODULES } from '@/content/docker/modules'
import { PYTHON_LABS } from '@/content/python/modules'
import { AGENT_GALLERY as AGENT_SIMS, PYTHON_GALLERY, RAG_GALLERY, PROJECT_GALLERY, ML_GALLERY, SD_GALLERY } from '@/content/sims/registry'
import { ML_LABS } from '@/content/ml/course'
import { SD_LABS } from '@/content/system/course'
import { RAG_LABS } from '@/content/rag/course'
import { PROJECT_LABS } from '@/content/project/course'
import { useProgress } from '@/store/progress'
import { useDockerProgress } from '@/store/dockerProgress'
import './Topics.css'

type TopicCard = {
  key: string
  title: string
  kicker: string
  blurb: string
  to: string
  accent: string
  stats: string[]
  pct: number
}

const COURSE_TRACKS = new Set(['python', 'asyncconcur', 'agents', 'veerarag', 'veeraproject', 'veeraml', 'veerasys'])

function pctOf(ids: string[], done: string[]) {
  if (!ids.length) return 0
  return Math.round((ids.filter((id) => done.includes(id)).length / ids.length) * 100)
}

/** One page for every subject on the site — the navbar links here instead of one item per subject. */
export function Topics() {
  const index = getCurriculumIndex()
  const completed = useProgress((s) => s.completedLessonIds)
  const last = useProgress((s) => s.lastLessonId)
  const dockerDone = useDockerProgress((s) => s.completedLessonIds)

  const track = (id: string) => index.tracks.find((t) => t.id === id)
  const lessonIds = (id: string) => (index.lessonsByTrack[id as keyof typeof index.lessonsByTrack] || []).map((l) => l.id)
  const seriesCount = (id: string) =>
    new Set((index.lessonsByTrack[id as keyof typeof index.lessonsByTrack] || []).map((l) => l.series).filter(Boolean)).size

  const dockerLessonIds = DOCKER_MODULES.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`))
  const dockerLessons = dockerLessonIds.length

  const core: TopicCard[] = [
    {
      key: 'python',
      title: 'Python Mastery',
      kicker: 'Core language',
      blurb:
        'Fundamentals to advanced Python: data structures, functions, OOP, decorators, typing, files, concurrency and backend — with exercises, projects and interview answers.',
      to: '/python',
      accent: track('python')?.accent || '#1f6feb',
      stats: [`${track('python')?.lessonCount ?? 0} lessons`, `${seriesCount('python')} courses`, `${PYTHON_LABS.length} labs`, `${PYTHON_GALLERY.length} simulations`],
      pct: pctOf(lessonIds('python'), completed),
    },
    {
      key: 'async',
      title: 'Async & Concurrency',
      kicker: 'Threads · processes · asyncio',
      blurb:
        'Threading, multiprocessing, asyncio, CPython internals and production FastAPI, with a flow diagram for every core idea.',
      to: '/async',
      accent: track('asyncconcur')?.accent || '#0f766e',
      stats: [`${track('asyncconcur')?.lessonCount ?? 0} lessons`, `${seriesCount('asyncconcur')} courses`],
      pct: pctOf(lessonIds('asyncconcur'), completed),
    },
    {
      key: 'agents',
      title: 'VeeraAgents',
      kicker: 'AI agents · LangChain · LangGraph · Google ADK',
      blurb:
        'Agentic AI end to end: tool calling, agents from scratch, LangChain, LangGraph, memory and human-in-the-loop, Google ADK, multi-agent patterns and guardrails — with animated simulations and 400+ interview questions.',
      to: '/agents',
      accent: track('agents')?.accent || '#7c3aed',
      stats: [`${track('agents')?.lessonCount ?? 0} lessons`, `${AGENT_SIMS.length} simulations`, `${seriesCount('agents')} courses`],
      pct: pctOf(lessonIds('agents'), completed),
    },
    {
      key: 'rag',
      title: 'VeeraRAG',
      kicker: 'RAG · BM25 · GraphRAG · evaluation',
      blurb:
        'Retrieval-Augmented Generation end to end: chunking, embeddings, BM25 and hybrid search, reranking, GraphRAG, evaluation, observability and production — with simulations, hands-on labs and interview banks.',
      to: '/rag',
      accent: track('veerarag')?.accent || '#0d9488',
      stats: [`${track('veerarag')?.lessonCount ?? 0} lessons`, `${RAG_GALLERY.length} simulations`, `${RAG_LABS.length} labs`],
      pct: pctOf(lessonIds('veerarag'), completed),
    },
    {
      key: 'project',
      title: 'VeeraProject',
      kicker: 'JS · TS · Playwright · REST · FastAPI',
      blurb:
        'Full-Stack AI & QA Engineering: JS event loop, TypeScript + Zod, Playwright Python & TS, BDD, Agentic MCP, JWT/OAuth2/BOLA, Redis/SSE, FastAPI ASGI, Pydantic V2 and 600+ interview answers.',
      to: '/project',
      accent: track('veeraproject')?.accent || '#2563eb',
      stats: [`${track('veeraproject')?.lessonCount ?? 0} lessons`, `${PROJECT_GALLERY.length} simulations`, `${PROJECT_LABS.length} labs`],
      pct: pctOf(lessonIds('veeraproject'), completed),
    },
    {
      key: 'ml',
      title: 'VeeraML',
      kicker: 'Machine learning · math · deep learning · MLOps',
      blurb:
        'Machine learning from the math up: data preparation, regression, classification, ensembles, clustering and PCA, evaluation and tuning, deep learning, NLP and LLMs, and MLOps — with real plots, simulations, labs, projects and interview answers.',
      to: '/ml',
      accent: track('veeraml')?.accent || '#ea580c',
      stats: [`${track('veeraml')?.lessonCount ?? 0} lessons`, `${ML_GALLERY.length} simulations`, `${ML_LABS.length} labs`],
      pct: pctOf(lessonIds('veeraml'), completed),
    },
    {
      key: 'system',
      title: 'VeeraSystem',
      kicker: 'System design · distributed systems · case studies',
      blurb:
        'System design from first principles: databases, caching, load balancing, distributed systems, messaging, microservices, security, observability, scaling to millions, low-level design and 25+ case studies — with simulations, labs, projects and interview answers.',
      to: '/system-design',
      accent: track('veerasys')?.accent || '#0f766e',
      stats: [`${track('veerasys')?.lessonCount ?? 0} lessons`, `${SD_GALLERY.length} simulations`, `${SD_LABS.length} labs`],
      pct: pctOf(lessonIds('veerasys'), completed),
    },
    {
      key: 'docker',
      title: 'Docker',
      kicker: 'Containers',
      blurb: 'Images, containers, volumes, networking, Compose and production deployment, with hands-on labs and a capstone.',
      to: '/docker',
      accent: '#0369a1',
      stats: [`${DOCKER_MODULES.length} modules`, `${dockerLessons} lessons`, `${DOCKER_LABS.length} labs`],
      pct: pctOf(dockerLessonIds, dockerDone),
    },
    {
      key: 'genai',
      title: 'Generative AI',
      kicker: 'LLMs · RAG · agents',
      blurb: 'LLM concepts, RAG, agentic AI, multi-agent systems, security, gateways and production failure modes.',
      to: '/tracks',
      accent: '#7c3aed',
      stats: [
        `${index.tracks.filter((t) => !COURSE_TRACKS.has(t.id)).length} tracks`,
        `${index.tracks
          .filter((t) => !COURSE_TRACKS.has(t.id))
          .reduce((n, t) => n + t.lessonCount, 0)} lessons`,
      ],
      pct: pctOf(
        index.tracks.filter((t) => !COURSE_TRACKS.has(t.id)).flatMap((t) => lessonIds(t.id)),
        completed,
      ),
    },
  ]

  const genai = index.tracks.filter((t) => !COURSE_TRACKS.has(t.id))

  // "How Python works internally" lives in the Async track as Learn module 07 (asyncconcur/async/topic1-6).
  const internals = (index.lessonsByTrack.asyncconcur || []).filter((l) => l.title.startsWith('07.'))
  const internalsPct = pctOf(
    internals.map((l) => l.id),
    completed,
  )

  let continueTo: string | null = null
  if (last) {
    for (const [trackId, list] of Object.entries(index.lessonsByTrack)) {
      const hit = list.find((l) => l.id === last)
      if (hit) {
        continueTo = `/learn/${trackId}/${last}`
        break
      }
    }
  }

  return (
    <div className="topics-page">
      <header className="topics-head">
        <p className="topics-kicker">All topics</p>
        <h1>What do you want to learn?</h1>
        <p>Pick a subject. Each one has its own learning path, labs, exercises and interview practice.</p>
        {continueTo ? (
          <Link to={continueTo} className="topics-continue">
            Continue where you left off →
          </Link>
        ) : null}
      </header>

      <section className="topics-section">
        <h2>Courses</h2>
        <div className="topics-grid">
          {core.map((c) => (
            <Link key={c.key} to={c.to} className="topic-card" style={{ ['--accent' as string]: c.accent }}>
              <p className="topic-kicker">{c.kicker}</p>
              <h3>{c.title}</h3>
              <p className="topic-blurb">{c.blurb}</p>
              <div className="topic-stats">
                {c.stats.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className="topic-progress" aria-label={`${c.pct}% complete`}>
                <i style={{ width: `${c.pct}%` }} />
              </div>
              <span className="topic-open">
                {c.pct ? `${c.pct}% complete · ` : ''}Open {c.title} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {internals.length ? (
        <section className="topics-section">
          <h2>Deep dive</h2>
          <Link to="/async/learn/07" className="topic-card topic-wide" style={{ ['--accent' as string]: '#b45309' }}>
            <p className="topic-kicker">CPython under the hood</p>
            <h3>How Python Works Internally</h3>
            <p className="topic-blurb">
              What really happens when you run a .py file — from source to bytecode to the eval loop, and
              how objects, dicts, sets, memory and the GIL are implemented in CPython.
            </p>
            <ol className="topic-list">
              {internals.map((l) => (
                <li key={l.id}>{l.title.replace(/^\d{2}\.\s*[^:]+:\s*Topic \d+\s*—\s*/, '')}</li>
              ))}
            </ol>
            <div className="topic-stats">
              <span>{internals.length} lessons</span>
              <span>{internals.length} exercise sets</span>
              {internalsPct ? <span>{internalsPct}% done</span> : null}
            </div>
            <div className="topic-progress">
              <i style={{ width: `${internalsPct}%` }} />
            </div>
            <span className="topic-open">Open Python Internals →</span>
          </Link>
        </section>
      ) : null}

      <section className="topics-section">
        <h2>Generative AI tracks</h2>
        <div className="topics-grid topics-grid-small">
          {genai.map((t) => {
            const pct = pctOf(lessonIds(t.id), completed)
            return (
              <Link key={t.id} to={`/tracks/${t.id}`} className="topic-card small" style={{ ['--accent' as string]: t.accent }}>
                <h3>{t.title}</h3>
                <p className="topic-blurb">{t.tagline}</p>
                <div className="topic-stats">
                  <span>{t.lessonCount} lessons</span>
                  {pct ? <span>{pct}% done</span> : null}
                </div>
                <div className="topic-progress">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
