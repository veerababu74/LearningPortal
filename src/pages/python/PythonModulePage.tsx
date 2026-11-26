import { Link, useParams } from 'react-router-dom'
import { getPyModule } from '@/content/python/modules'
import { usePythonProgress } from '@/store/pythonProgress'
import '@/components/python/python.css'
import { tidyTitle } from '@/content/titles'

export function PythonModulePage() {
  const { moduleId = '' } = useParams()
  const mod = getPyModule(moduleId)
  const completed = usePythonProgress((s) => s.completedLessonIds)

  if (!mod) {
    return (
      <div className="py-page">
        <h1>Module not found</h1>
        <Link to="/python">Back to Python course</Link>
      </div>
    )
  }

  return (
    <div className="py-page">
      <p className="py-kicker">Module {mod.number}</p>
      <h1>{mod.title}</h1>
      <p>{mod.goal}</p>

      <div className="py-modules">
        {mod.lessons.map((lesson, i) => {
          const key = `${mod.id}/${lesson.id}`
          const done = completed.includes(key)
          return (
            <Link key={lesson.id} to={`/python/${mod.id}/${lesson.id}`} className="py-module-link">
              <span className="py-kicker">
                Lesson {i + 1} · {lesson.duration}
                {done ? ' · done' : ''}
              </span>
              <h2 style={{ margin: '0.25rem 0', fontSize: '1.15rem' }}>{tidyTitle(lesson.title)}</h2>
              <p className="py-muted">{lesson.story.title}</p>
            </Link>
          )
        })}
      </div>

      <section className="py-card" style={{ marginTop: '1.25rem' }}>
        <p className="py-kicker">Module mastery</p>
        <p>
          <strong>Concept:</strong> {mod.mastery.concept.q}
        </p>
        <details>
          <summary>Reveal</summary>
          <p>{mod.mastery.concept.a}</p>
        </details>
        <p>
          <strong>Scenario:</strong> {mod.mastery.scenario.q}
        </p>
        <details>
          <summary>Reveal</summary>
          <p>{mod.mastery.scenario.a}</p>
        </details>
        <p>
          <strong>Interview:</strong> {mod.mastery.interview.q}
        </p>
        <details>
          <summary>Reveal</summary>
          <p>{mod.mastery.interview.a}</p>
        </details>
      </section>

      <div className="py-lesson-nav">
        <Link to="/python">All modules</Link>
        {mod.lessons[0] ? (
          <Link to={`/python/${mod.id}/${mod.lessons[0].id}`}>Start first lesson →</Link>
        ) : null}
      </div>
    </div>
  )
}
