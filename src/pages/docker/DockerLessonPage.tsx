import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DockerFlow } from '@/components/docker/DockerFlow'
import { PracticePanel } from '@/components/docker/PracticePanel'
import { DOCKER_MODULES, getDockerLesson } from '@/content/docker/modules'
import { useDockerProgress } from '@/store/dockerProgress'
import '@/components/docker/docker.css'

const SECTIONS = [
  'Story',
  'Visual',
  'Concept',
  'Example',
  'Python & GenAI',
  'Practice',
] as const

export function DockerLessonPage() {
  const { moduleId = '', lessonId = '' } = useParams()
  const lesson = getDockerLesson(moduleId, lessonId)
  const markComplete = useDockerProgress((s) => s.markComplete)
  const setLastPath = useDockerProgress((s) => s.setLastPath)
  const [section, setSection] = useState(0)

  useEffect(() => {
    setSection(0)
    if (moduleId && lessonId) setLastPath(`/docker/${moduleId}/${lessonId}`)
  }, [moduleId, lessonId, setLastPath])

  if (!lesson) {
    return (
      <div className="dk-page">
        <h1>Lesson not found</h1>
        <Link to="/docker">Back to Docker course</Link>
      </div>
    )
  }

  const modIndex = DOCKER_MODULES.findIndex((m) => m.id === moduleId)
  const mod = DOCKER_MODULES[modIndex]
  const lessonIndex = mod?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  const prev =
    lessonIndex > 0
      ? `/docker/${moduleId}/${mod.lessons[lessonIndex - 1].id}`
      : modIndex > 0
        ? `/docker/${DOCKER_MODULES[modIndex - 1].id}/${DOCKER_MODULES[modIndex - 1].lessons.at(-1)?.id}`
        : null
  const next =
    mod && lessonIndex >= 0 && lessonIndex < mod.lessons.length - 1
      ? `/docker/${moduleId}/${mod.lessons[lessonIndex + 1].id}`
      : modIndex >= 0 && modIndex < DOCKER_MODULES.length - 1
        ? `/docker/${DOCKER_MODULES[modIndex + 1].id}/${DOCKER_MODULES[modIndex + 1].lessons[0]?.id}`
        : '/docker/capstone'

  return (
    <div className="dk-page">
      <p className="dk-kicker">
        Module {mod?.number} · {lesson.duration}
      </p>
      <h1>{lesson.title}</h1>

      <div className="dk-row">
        {SECTIONS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={section === i ? 'dk-btn' : 'dk-btn soft'}
            onClick={() => setSection(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {section === 0 ? (
        <section className="dk-card" style={{ marginTop: '1rem' }}>
          <p className="dk-kicker">1. Story</p>
          <h2 style={{ marginTop: 0 }}>{lesson.story.title}</h2>
          <p>{lesson.story.scene}</p>
          <p className="dk-strong">{lesson.story.pain}</p>
        </section>
      ) : null}

      {section === 1 ? (
        <section style={{ marginTop: '1rem' }} className="dk-grid">
          <div className="dk-card">
            <p className="dk-kicker">2. Visual</p>
            <h2 style={{ marginTop: 0 }}>{lesson.visual.title}</h2>
            <div className="dk-side">
              <div className="dk-pane">
                <h4>Before Docker</h4>
                <ul>
                  {lesson.visual.before.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="dk-pane">
                <h4>With Docker</h4>
                <ul>
                  {lesson.visual.after.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <DockerFlow title="What changes" steps={lesson.visual.flow} />
        </section>
      ) : null}

      {section === 2 ? (
        <section className="dk-card" style={{ marginTop: '1rem' }}>
          <p className="dk-kicker">3. Concept</p>
          <p className="dk-strong">{lesson.concept.definition}</p>
          <h3>What happens internally</h3>
          <ul>
            {lesson.concept.internals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {lesson.concept.terms.length ? (
            <>
              <h3>Terms</h3>
              <div className="dk-terms">
                {lesson.concept.terms.map((t) => (
                  <div key={t.term} className="dk-term">
                    <strong>{t.term}</strong>
                    <span>{t.meaning}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {lesson.concept.analogyLimit ? (
            <p className="dk-hint" style={{ marginTop: '0.85rem' }}>
              Analogy limit: {lesson.concept.analogyLimit}
            </p>
          ) : null}
        </section>
      ) : null}

      {section === 3 ? (
        <section className="dk-grid" style={{ marginTop: '1rem' }}>
          <div className="dk-card">
            <p className="dk-kicker">4. Minimal example</p>
            <h2 style={{ marginTop: 0 }}>{lesson.example.title}</h2>
            <div className="dk-files">
              {lesson.example.files.map((f) => (
                <div key={f.path} className="dk-file">
                  <h4>{f.path}</h4>
                  <pre className="dk-pre">{f.code}</pre>
                </div>
              ))}
            </div>
            {lesson.example.commands.length ? (
              <>
                <h3>Commands</h3>
                <pre className="dk-pre">{lesson.example.commands.join('\n')}</pre>
              </>
            ) : null}
            {lesson.example.expected.length ? (
              <>
                <h3>Expected</h3>
                <ul>
                  {lesson.example.expected.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {lesson.example.lineNotes.length ? (
              <>
                <h3>Why these lines matter</h3>
                <ul>
                  {lesson.example.lineNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {section === 4 ? (
        <section className="dk-grid" style={{ marginTop: '1rem' }}>
          <div className="dk-card">
            <p className="dk-kicker">5. Python & GenAI</p>
            <h2 style={{ marginTop: 0 }}>{lesson.genai.title}</h2>
            <p>{lesson.genai.fastapi}</p>
            <p className="dk-muted">
              <strong>Flask note:</strong> {lesson.genai.flaskNote}
            </p>
            {lesson.genai.code.map((f) => (
              <div key={f.path} className="dk-file">
                <h4>{f.path}</h4>
                <pre className="dk-pre">{f.code}</pre>
              </div>
            ))}
          </div>
          <DockerFlow title="Application flow" steps={lesson.genai.flow} />
        </section>
      ) : null}

      {section === 5 ? (
        <div style={{ marginTop: '1rem' }}>
          <PracticePanel practice={lesson.practice} />
          {lesson.labId ? (
            <div className="dk-card" style={{ marginTop: '0.85rem' }}>
              <p className="dk-kicker">Interactive lab</p>
              <p>Open the linked simulator to practice this concept visually.</p>
              <Link to={`/docker/labs/${lesson.labId}`} className="dk-btn">
                Open {lesson.labId}
              </Link>
            </div>
          ) : null}
          <div className="dk-row" style={{ marginTop: '0.85rem' }}>
            <button
              type="button"
              className="dk-btn"
              onClick={() => markComplete(`${moduleId}/${lessonId}`)}
            >
              Mark lesson complete
            </button>
          </div>
        </div>
      ) : null}

      <div className="dk-lesson-nav">
        {prev ? <Link to={prev}>← Previous</Link> : <Link to="/docker">Course home</Link>}
        <button
          type="button"
          className="dk-btn soft"
          onClick={() => setSection((s) => Math.min(SECTIONS.length - 1, s + 1))}
        >
          Next section
        </button>
        <Link to={next}>Next lesson →</Link>
      </div>
    </div>
  )
}
