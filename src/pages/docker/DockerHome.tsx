import { Link } from 'react-router-dom'
import { DOCKER_CAPSTONE, DOCKER_LABS, DOCKER_MODULES, getFirstDockerLesson } from '@/content/docker/modules'
import { useDockerProgress } from '@/store/dockerProgress'
import '@/components/docker/docker.css'

export function DockerHome() {
  const completed = useDockerProgress((s) => s.completedLessonIds.length)
  const first = getFirstDockerLesson()
  const startPath = first ? `/docker/${first.moduleId}/${first.id}` : '/docker/m1'

  const totalLessons = DOCKER_MODULES.reduce((n, m) => n + m.lessons.length, 0)

  return (
    <div className="dk-page">
      <section className="dk-hero">
        <p className="dk-kicker">Interactive Docker Masterclass</p>
        <h1>Docker for Python & GenAI backends</h1>
        <p>
          You already ship FastAPI, RAG, and agents. This course teaches the Docker skills to build,
          run, debug, and deploy those services — story first, then visuals, then the real concept,
          then labs you can run locally.
        </p>
        <div className="dk-row">
          <Link to={startPath} className="dk-btn">
            Start Module 1
          </Link>
          <Link to="/docker/capstone" className="dk-btn soft">
            Capstone overview
          </Link>
          <Link to="/docker/labs" className="dk-btn soft">
            Lab workspace
          </Link>
        </div>
        <p className="dk-muted">
          {totalLessons} lessons · {DOCKER_MODULES.length} modules · {completed} completed
        </p>
      </section>

      <h2 style={{ marginTop: '1.5rem' }}>Modules</h2>
      <div className="dk-modules">
        {DOCKER_MODULES.map((m) => (
          <Link key={m.id} to={`/docker/${m.id}`} className="dk-module-link">
            <p className="dk-kicker">Module {m.number}</p>
            <h2>{m.title}</h2>
            <p>{m.goal}</p>
            <p className="dk-muted">{m.lessons.length} lessons</p>
          </Link>
        ))}
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Interactive labs</h2>
      <div className="dk-grid">
        {DOCKER_LABS.map((lab) => (
          <Link key={lab.id} to={`/docker/labs/${lab.id}`} className="dk-card">
            <span className="dk-sim-tag">{lab.simulation ? 'Browser simulation' : 'Local Docker'}</span>
            <h3 style={{ margin: '0.45rem 0 0.25rem' }}>{lab.title}</h3>
            <p className="dk-muted">{lab.blurb}</p>
          </Link>
        ))}
      </div>

      <section className="dk-card" style={{ marginTop: '1.25rem' }}>
        <p className="dk-kicker">Capstone</p>
        <h3 style={{ marginTop: 0 }}>{DOCKER_CAPSTONE.title}</h3>
        <p>{DOCKER_CAPSTONE.subtitle}</p>
        <Link to="/docker/capstone" className="dk-btn soft">
          Open capstone
        </Link>
      </section>
    </div>
  )
}
