import { Link, useParams } from 'react-router-dom'
import { getDockerModule } from '@/content/docker/modules'
import { useDockerProgress } from '@/store/dockerProgress'
import '@/components/docker/docker.css'

export function DockerModulePage() {
  const { moduleId = '' } = useParams()
  const mod = getDockerModule(moduleId)
  const completed = useDockerProgress((s) => s.completedLessonIds)

  if (!mod) {
    return (
      <div className="dk-page">
        <h1>Module not found</h1>
        <Link to="/docker">Back to Docker course</Link>
      </div>
    )
  }

  return (
    <div className="dk-page">
      <p className="dk-kicker">Module {mod.number}</p>
      <h1>{mod.title}</h1>
      <p>{mod.goal}</p>

      <div className="dk-modules" style={{ marginTop: '1.1rem' }}>
        {mod.lessons.map((lesson, i) => {
          const key = `${mod.id}/${lesson.id}`
          const done = completed.includes(key)
          return (
            <Link key={lesson.id} to={`/docker/${mod.id}/${lesson.id}`} className="dk-module-link">
              <span className="dk-kicker">
                Lesson {i + 1} · {lesson.duration}
                {done ? ' · done' : ''}
              </span>
              <h2>{lesson.title}</h2>
              <p className="dk-muted">{lesson.story.title}</p>
            </Link>
          )
        })}
      </div>

      <section className="dk-card" style={{ marginTop: '1.25rem' }}>
        <p className="dk-kicker">Module mastery check</p>
        <p>
          <strong>Concept:</strong> {mod.mastery.concept.q}
        </p>
        <details>
          <summary>Reveal answer</summary>
          <p>{mod.mastery.concept.a}</p>
        </details>
        <p>
          <strong>Debugging:</strong> {mod.mastery.debugging.q}
        </p>
        <details>
          <summary>Reveal answer</summary>
          <p>{mod.mastery.debugging.a}</p>
        </details>
        <p>
          <strong>Interview:</strong> {mod.mastery.interview.q}
        </p>
        <details>
          <summary>Reveal answer</summary>
          <p>{mod.mastery.interview.a}</p>
        </details>
      </section>

      <div className="dk-lesson-nav">
        <Link to="/docker">All modules</Link>
        {mod.lessons[0] ? (
          <Link to={`/docker/${mod.id}/${mod.lessons[0].id}`}>Start first lesson →</Link>
        ) : null}
      </div>
    </div>
  )
}
