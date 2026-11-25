import { Link } from 'react-router-dom'
import { DOCKER_CAPSTONE } from '@/content/docker/modules'
import '@/components/docker/docker.css'

export function DockerCapstone() {
  const c = DOCKER_CAPSTONE
  return (
    <div className="dk-page">
      <p className="dk-kicker">Capstone project</p>
      <h1>{c.title}</h1>
      <p>{c.subtitle}</p>

      <div className="dk-modules">
        {c.stages.map((stage, i) => (
          <section key={stage.id} className="dk-card">
            <p className="dk-kicker">Stage {i + 1}</p>
            <h2 style={{ marginTop: 0 }}>{stage.title}</h2>
            <ul>
              {stage.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="dk-card" style={{ marginTop: '1rem' }}>
        <p className="dk-kicker">Final challenge</p>
        <h2 style={{ marginTop: 0 }}>{c.finalChallenge.title}</h2>
        <p>You inherit a broken deployment with these realistic faults:</p>
        <ul>
          {c.finalChallenge.faults.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p>For each fault, document:</p>
        <ul>
          {c.finalChallenge.require.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <pre className="dk-pre">{`# Suggested verification loop
docker compose ps
docker compose logs api --tail=100
docker inspect api --format '{{.State.Health.Status}} {{.State.ExitCode}}'
curl -v http://localhost:8000/health
# Fix one fault → re-verify → move to the next`}</pre>
      </section>

      <div className="dk-lesson-nav">
        <Link to="/docker">Course home</Link>
        <Link to="/docker/labs/debug-lab">Practice in debug lab →</Link>
      </div>
    </div>
  )
}
