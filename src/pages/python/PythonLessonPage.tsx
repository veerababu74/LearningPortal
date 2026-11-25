import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PythonAnimatedFlow } from '@/components/python/PythonAnimatedFlow'
import { PythonCodePanel } from '@/components/python/PythonCodePanel'
import { InterviewDrill, ScenarioPractice } from '@/components/python/PythonPractice'
import { PYTHON_MODULES, getPyLesson } from '@/content/python/modules'
import { usePythonProgress } from '@/store/pythonProgress'
import '@/components/python/python.css'

const SECTIONS = ['Story', 'Visual', 'Concept', 'Code', 'Practice', 'Interview'] as const

export function PythonLessonPage() {
  const { moduleId = '', lessonId = '' } = useParams()
  const lesson = getPyLesson(moduleId, lessonId)
  const markComplete = usePythonProgress((s) => s.markComplete)
  const setLastPath = usePythonProgress((s) => s.setLastPath)
  const [section, setSection] = useState(0)
  const [flowStep, setFlowStep] = useState(0)

  useEffect(() => {
    setSection(0)
    setFlowStep(0)
    if (moduleId && lessonId) setLastPath(`/python/${moduleId}/${lessonId}`)
  }, [moduleId, lessonId, setLastPath])

  if (!lesson) {
    return (
      <div className="py-page">
        <h1>Lesson not found</h1>
        <Link to="/python">Back to Python course</Link>
      </div>
    )
  }

  const modIndex = PYTHON_MODULES.findIndex((m) => m.id === moduleId)
  const mod = PYTHON_MODULES[modIndex]
  const lessonIndex = mod?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  const prev =
    lessonIndex > 0
      ? `/python/${moduleId}/${mod.lessons[lessonIndex - 1].id}`
      : modIndex > 0
        ? `/python/${PYTHON_MODULES[modIndex - 1].id}/${PYTHON_MODULES[modIndex - 1].lessons.at(-1)?.id}`
        : null
  const next =
    mod && lessonIndex >= 0 && lessonIndex < mod.lessons.length - 1
      ? `/python/${moduleId}/${mod.lessons[lessonIndex + 1].id}`
      : modIndex >= 0 && modIndex < PYTHON_MODULES.length - 1
        ? `/python/${PYTHON_MODULES[modIndex + 1].id}/${PYTHON_MODULES[modIndex + 1].lessons[0]?.id}`
        : '/python/interview'

  const highlight = lesson.flow.steps[flowStep]?.codeHighlightLines || []

  return (
    <div className="py-page">
      <p className="py-kicker">
        Module {mod?.number} · {lesson.duration}
        {lesson.sourceHint ? ` · source: ${lesson.sourceHint}` : ''}
      </p>
      <h1>{lesson.title}</h1>

      <div className="py-row">
        {SECTIONS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={section === i ? 'py-btn' : 'py-btn soft'}
            onClick={() => setSection(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {section === 0 ? (
        <section className="py-card" style={{ marginTop: '1rem' }}>
          <p className="py-kicker">1. Story</p>
          <h2 style={{ marginTop: 0 }}>{lesson.story.title}</h2>
          <p>{lesson.story.scene}</p>
          <p className="py-strong">{lesson.story.pain}</p>
        </section>
      ) : null}

      {section === 1 ? (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.85rem' }}>
          <PythonAnimatedFlow flow={lesson.flow} onStepChange={setFlowStep} />
          <p className="py-muted">
            Narration updates with each animated step. Pause anytime and scrub the timeline.
          </p>
        </div>
      ) : null}

      {section === 2 ? (
        <section className="py-card" style={{ marginTop: '1rem' }}>
          <p className="py-kicker">3. Concept</p>
          <p className="py-strong">{lesson.concept.definition}</p>
          <h3>What happens internally</h3>
          <ul>
            {lesson.concept.internals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {lesson.concept.terms.length ? (
            <>
              <h3>Terms</h3>
              <div className="py-terms">
                {lesson.concept.terms.map((t) => (
                  <div key={t.term} className="py-term">
                    <strong>{t.term}</strong>
                    <span>{t.meaning}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {lesson.concept.analogyLimit ? (
            <p className="py-hint" style={{ marginTop: '0.85rem' }}>
              Analogy limit: {lesson.concept.analogyLimit}
            </p>
          ) : null}
        </section>
      ) : null}

      {section === 3 ? (
        <div style={{ marginTop: '1rem' }}>
          <p className="py-kicker">4. Code</p>
          <PythonCodePanel snippets={lesson.code} highlightLines={section === 3 ? highlight : []} />
          <p className="py-muted" style={{ marginTop: 8 }}>
            Tip: open Visual, pause on a step, then return here — highlighted lines track the flow when
            available.
          </p>
        </div>
      ) : null}

      {section === 4 ? (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.85rem' }}>
          <ScenarioPractice scenario={lesson.scenario} />
          {lesson.labId ? (
            <div className="py-card">
              <p className="py-kicker">Interactive lab</p>
              <p>Practice this concept with a browser simulation.</p>
              <Link to={`/python/labs/${lesson.labId}`} className="py-btn">
                Open {lesson.labId}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {section === 5 ? (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.85rem' }}>
          <InterviewDrill items={lesson.interview} />
          <button
            type="button"
            className="py-btn"
            onClick={() => markComplete(`${moduleId}/${lessonId}`)}
          >
            Mark lesson complete
          </button>
        </div>
      ) : null}

      <div className="py-lesson-nav">
        {prev ? <Link to={prev}>← Previous</Link> : <Link to="/python">Course home</Link>}
        <button
          type="button"
          className="py-btn soft"
          onClick={() => setSection((s) => Math.min(SECTIONS.length - 1, s + 1))}
        >
          Next section
        </button>
        <Link to={next}>Next lesson →</Link>
      </div>
    </div>
  )
}
