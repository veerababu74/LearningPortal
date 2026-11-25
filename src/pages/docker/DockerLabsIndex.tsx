import { Link } from 'react-router-dom'
import { DOCKER_LABS } from '@/content/docker/modules'
import '@/components/docker/docker.css'

export function DockerLabsIndex() {
  return (
    <div className="dk-page">
      <p className="dk-kicker">Lab workspace</p>
      <h1>Docker interactive labs</h1>
      <p>
        Browser simulations teach the mental model. Each lab also points back to the lesson with
        real Docker Desktop / WSL 2 commands you can verify locally.
      </p>
      <div className="dk-modules">
        {DOCKER_LABS.map((lab, i) => (
          <Link key={lab.id} to={`/docker/labs/${lab.id}`} className="dk-module-link">
            <span className="dk-kicker">
              Lab {String(i + 1).padStart(2, '0')} ·{' '}
              {lab.simulation ? 'Browser simulation' : 'Local Docker'}
            </span>
            <h2>{lab.title}</h2>
            <p>{lab.blurb}</p>
          </Link>
        ))}
      </div>
      <div className="dk-lesson-nav">
        <Link to="/docker">Course home</Link>
        <Link to="/docker/m1/works-on-my-laptop">Module 1 lesson →</Link>
      </div>
    </div>
  )
}
