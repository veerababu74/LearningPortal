import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { COURSES, continueLink, courseTrackIds } from '@/content/courses'
import { DOCKER_MODULES } from '@/content/docker/modules'
import { AGENT_GALLERY, PYTHON_GALLERY, getAnySim, simHref } from '@/content/sims/registry'
import { useProgress } from '@/store/progress'
import { useDockerProgress } from '@/store/dockerProgress'
import './Landing.css'

const FEATURED_SIMS = ['react-loop', 'langgraph-agent', 'hitl-interrupt', 'rag-query', 'supervisor', 'py-event-loop']

const PLAYGROUNDS = [
  { to: '/labs/agent-playground', icon: '🧪', title: 'Agent Loop Playground', text: 'Inject timeouts and loops, switch guards on and off, read the cost.' },
  { to: '/labs/guardrails', icon: '🛡️', title: 'Guardrail Tester', text: 'Fire prompt injections at layered defenses and see what stops them.' },
  { to: '/labs/concurrency-playground', icon: '⏱️', title: 'Concurrency Playground', text: 'Threads vs asyncio vs processes on your own task mix.' },
  { to: '/labs/context-budget', icon: '📏', title: 'Context Window Budget', text: 'Fit prompts, tools, history and RAG chunks into the window.' },
]

const STEPS = [
  { icon: '📖', title: 'Read', text: 'Short sections with curated diagrams, clear explanations and runnable code.' },
  { icon: '▶️', title: 'Watch', text: 'Animated simulations: the packet moves, state changes, the running line lights up.' },
  { icon: '🧪', title: 'Experiment', text: 'Playgrounds where you change settings and break things on purpose.' },
  { icon: '🎯', title: 'Practise', text: 'Exercises, projects and interview questions with model answers.' },
]

const PATHS = [
  {
    title: 'Python developer',
    blurb: 'Solid language skills, then concurrency and shipping.',
    steps: [
      { label: 'Python basics', to: '/python/path/getting-started' },
      { label: 'Functions & OOP', to: '/python/path/functions' },
      { label: 'Async & concurrency', to: '/async' },
      { label: 'Docker', to: '/docker' },
    ],
  },
  {
    title: 'AI agent engineer',
    blurb: 'From one LLM call to production multi-agent systems.',
    steps: [
      { label: 'What is an AI agent', to: '/agents/path/what-is-agent' },
      { label: 'Tool calling', to: '/agents/path/tool-calling' },
      { label: 'LangGraph', to: '/agents/path/langgraph' },
      { label: 'Multi-agent systems', to: '/agents/path/multi-agent' },
    ],
  },
  {
    title: 'RAG & GenAI engineer',
    blurb: 'Retrieval, evaluation, security and production operations.',
    steps: [
      { label: 'LLM concepts', to: '/tracks/llm-concepts' },
      { label: 'RAG masterclass', to: '/tracks/rag' },
      { label: 'LLM security', to: '/tracks/llm-security' },
      { label: 'Production failures', to: '/tracks/production-failures' },
    ],
  },
]

/** Small looping animation of an agent turn — pure SVG, no heavy components. */
function HeroDiagram() {
  const path = 'M 70 150 L 210 60 L 350 150 L 210 240 L 70 150'
  return (
    <svg viewBox="0 0 420 300" className="landing-diagram" role="img" aria-label="An agent loop: user, LLM, tool, observation">
      <path d={path} className="ld-path" />
      {[
        { x: 70, y: 150, label: 'User', icon: '👤' },
        { x: 210, y: 60, label: 'LLM', icon: '🧠' },
        { x: 350, y: 150, label: 'Tool', icon: '🔧' },
        { x: 210, y: 240, label: 'Memory', icon: '🗄️' },
      ].map((n) => (
        <g key={n.label} transform={`translate(${n.x - 48} ${n.y - 22})`} className="ld-node">
          <rect width="96" height="44" rx="12" />
          <text x="14" y="28" className="ld-icon">
            {n.icon}
          </text>
          <text x="38" y="28" className="ld-label">
            {n.label}
          </text>
        </g>
      ))}
      <g className="ld-packet">
        <circle r="8">
          <animateMotion dur="6s" repeatCount="indefinite" path={path} />
        </circle>
      </g>
    </svg>
  )
}

export function Landing() {
  const index = getCurriculumIndex()
  const completed = useProgress((s) => s.completedLessonIds)
  const last = useProgress((s) => s.lastLessonId)
  const dockerDone = useDockerProgress((s) => s.completedLessonIds)
  const cont = continueLink(last)

  const lessonIds = (ids: string[]) => ids.flatMap((id) => (index.lessonsByTrack[id as keyof typeof index.lessonsByTrack] || []).map((l) => l.id))
  const dockerIds = DOCKER_MODULES.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`))
  const totalLessons = index.tracks.reduce((n, t) => n + t.lessonCount, 0) + dockerIds.length
  const sims = AGENT_GALLERY.length + PYTHON_GALLERY.length
  const doneTotal = completed.length + dockerDone.length

  const courseStats = (id: string, trackIds: string[]) => {
    if (id === 'docker') {
      const done = dockerIds.filter((x) => dockerDone.includes(x)).length
      return { lessons: dockerIds.length, pct: dockerIds.length ? Math.round((done / dockerIds.length) * 100) : 0 }
    }
    const ids = lessonIds(trackIds)
    const done = ids.filter((x) => completed.includes(x)).length
    return { lessons: ids.length, pct: ids.length ? Math.round((done / ids.length) * 100) : 0 }
  }

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Visual, hands-on learning</p>
          <h1>
            Learn Python, AI agents and GenAI <span>by watching them run.</span>
          </h1>
          <p className="landing-lede">
            Every concept comes with a diagram, a step-by-step animation of what happens inside, real code, a lab to
            experiment in, and interview questions to check yourself.
          </p>
          <div className="landing-cta">
            <a href="#courses" className="lbtn primary">
              Explore courses
            </a>
            <Link to="/agents/visualizer/react-loop" className="lbtn">
              ▶ Watch an agent run
            </Link>
            <Link to="/labs" className="lbtn">
              Open the labs
            </Link>
          </div>
          {cont ? (
            <Link to={cont.to} className="landing-continue">
              <span className="landing-continue-k">Continue where you left off</span>
              <strong>{cont.title}</strong>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
          <ul className="landing-stats" aria-label="Site statistics">
            <li>
              <strong>{totalLessons.toLocaleString()}</strong> lessons
            </li>
            <li>
              <strong>{COURSES.length}</strong> courses
            </li>
            <li>
              <strong>{sims}</strong> simulations
            </li>
            <li>
              <strong>{doneTotal}</strong> completed by you
            </li>
          </ul>
        </div>
        <div className="landing-hero-visual" aria-hidden="false">
          <HeroDiagram />
          <p className="landing-visual-cap">An agent turn: the model reasons, calls a tool, stores what it learned, and answers.</p>
        </div>
      </section>

      <section id="courses" className="landing-section">
        <div className="landing-section-head">
          <h2>Courses</h2>
          <p>Pick one to start. Each has a learning path, labs and interview practice.</p>
        </div>
        <div className="landing-courses">
          {COURSES.map((c) => {
            const st = courseStats(c.id, courseTrackIds(c))
            return (
              <Link key={c.id} to={c.to} className="landing-course" style={{ ['--accent' as string]: c.accent }}>
                <span className="landing-course-icon" aria-hidden>
                  {c.icon}
                </span>
                <p className="landing-course-k">{c.kicker}</p>
                <h3>{c.title}</h3>
                <p className="landing-course-b">{c.blurb}</p>
                <div className="landing-course-foot">
                  <span>{st.lessons} lessons</span>
                  {st.pct ? <span>{st.pct}% done</span> : null}
                </div>
                <div className="landing-progress" aria-label={`${st.pct}% complete`}>
                  <i style={{ width: `${st.pct}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>How you’ll learn</h2>
          <p>Four ways into every idea — use them in any order.</p>
        </div>
        <ol className="landing-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="landing-step-n">{i + 1}</span>
              <span className="landing-step-icon" aria-hidden>
                {s.icon}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Popular simulations</h2>
          <Link to="/agents/visualizer">All {AGENT_GALLERY.length} agent simulations →</Link>
        </div>
        <div className="landing-cards">
          {FEATURED_SIMS.map((id) => getAnySim(id))
            .filter((s): s is NonNullable<typeof s> => Boolean(s))
            .map((s) => (
              <Link key={s.id} to={simHref(s)} className="landing-card">
                <span className="landing-tag">▶ {s.framework}</span>
                <h3>{s.title}</h3>
                <p>{s.summary}</p>
                <span className="landing-card-meta">
                  {s.steps.length} steps · {s.level}
                </span>
              </Link>
            ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Hands-on playgrounds</h2>
          <Link to="/labs">All labs →</Link>
        </div>
        <div className="landing-cards four">
          {PLAYGROUNDS.map((p) => (
            <Link key={p.to} to={p.to} className="landing-card">
              <span className="landing-play-icon" aria-hidden>
                {p.icon}
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Suggested learning paths</h2>
          <p>Not sure where to begin? Follow one of these in order.</p>
        </div>
        <div className="landing-paths">
          {PATHS.map((p) => (
            <article key={p.title} className="landing-path">
              <h3>{p.title}</h3>
              <p>{p.blurb}</p>
              <ol>
                {p.steps.map((s) => (
                  <li key={s.label}>
                    <Link to={s.to}>{s.label}</Link>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-band">
        <h2>Ready to start?</h2>
        <p>Open a course, or jump straight into a simulation and learn by watching.</p>
        <div className="landing-cta">
          <Link to="/topics" className="lbtn primary">
            Browse all topics
          </Link>
          <Link to="/search" className="lbtn">
            Search lessons
          </Link>
        </div>
      </section>
    </div>
  )
}
