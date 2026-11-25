import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FlowSpec, Lesson } from '@/types/curriculum'
import { FlowPlayer } from '@/components/visuals/FlowPlayer'
import { ScenarioLab } from '@/components/scenario/ScenarioLab'
import { CodePanel } from '@/components/code/CodePanel'
import { KnowledgeCheck } from '@/components/quiz/KnowledgeCheck'
import { MarkdownBody } from '@/components/lesson/MarkdownBody'
import { PointCard } from '@/components/lesson/PointCard'
import { useProgress } from '@/store/progress'
import './LessonShell.css'

function SectionFlowWithText({ diagram }: { diagram: FlowSpec }) {
  const [step, setStep] = useState(diagram.steps?.[0] || null)
  const onStepChange = useCallback((_i: number, s: FlowSpec['steps'][number]) => {
    setStep(s)
  }, [])

  return (
    <div className="section-diagram-pair">
      <div className="section-diagram">
        <p className="panel-label">Section flow diagram</p>
        <FlowPlayer diagram={diagram} onStepChange={onStepChange} />
      </div>
      <aside className="section-step-text">
        <p className="panel-label">Textual explanation</p>
        <p className="step-badge">{step ? `Step: ${step.label}` : 'Overview'}</p>
        <p className="text-lead" key={step?.id || 's0'}>
          {step?.narration || 'Select a step in the diagram to read what happens at that stage.'}
        </p>
      </aside>
    </div>
  )
}

function cleanNavTitle(title: string) {
  return title
    .replace(/^\d+(?:\.\d+)*[.)]\s+/, '')
    .replace(/^(?:section|part|module)\s+\d+[.:)\s-]*/i, '')
    .trim() || title
}

const LAB_LINKS: Record<string, { path: string; label: string }> = {
  chunking: { path: '/labs/chunking', label: 'Chunking simulator' },
  cosine: { path: '/labs/cosine', label: 'Cosine similarity lab' },
  retrieval: { path: '/labs/retrieval', label: 'Hybrid retrieval lab' },
  injection: { path: '/labs/injection', label: 'Prompt injection path' },
  'rate-limit': { path: '/labs/rate-limit', label: 'Token bucket lab' },
  'agent-loop': { path: '/labs/agent-loop', label: 'Agent loop animator' },
  'multi-agent': { path: '/labs/multi-agent', label: 'Multi-agent handoff lab' },
}

export function LessonShell({
  lesson,
  prevId,
  nextId,
}: {
  lesson: Lesson
  prevId?: string
  nextId?: string
}) {
  const [activeSection, setActiveSection] = useState(lesson.sections[0]?.id)
  const setLastLesson = useProgress((s) => s.setLastLesson)
  const markComplete = useProgress((s) => s.markComplete)
  const toggleBookmark = useProgress((s) => s.toggleBookmark)
  const bookmarked = useProgress((s) => s.bookmarks.includes(lesson.id))
  const completed = useProgress((s) => s.completedLessonIds.includes(lesson.id))

  useEffect(() => {
    setLastLesson(lesson.id)
    setActiveSection(lesson.sections[0]?.id)
  }, [lesson.id, lesson.sections, setLastLesson])

  const totalPoints = useMemo(
    () => lesson.sections.reduce((n, s) => n + (s.points?.length || 0), 0),
    [lesson.sections],
  )

  return (
    <div className="lesson-shell">
      <aside className="lesson-aside">
        <p className="aside-kicker">Lesson outline</p>
        <nav className="section-nav">
          {lesson.sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={s.id === activeSection ? 'sec active' : 'sec'}
              onClick={() => setActiveSection(s.id)}
            >
              <span>{i + 1}</span>
              {cleanNavTitle(s.title)}
            </a>
          ))}
        </nav>
        {lesson.labIds?.length ? (
          <div className="lab-links">
            <p className="aside-kicker">Practice labs</p>
            {lesson.labIds.map((id) =>
              LAB_LINKS[id] ? (
                <Link key={id} to={LAB_LINKS[id].path} className="lab-link">
                  {LAB_LINKS[id].label}
                </Link>
              ) : null,
            )}
          </div>
        ) : null}
      </aside>

      <div className="lesson-main">
        <header className="lesson-hero">
          <p className="track-pill">{lesson.trackId.replace(/-/g, ' ')}</p>
          <h1>{lesson.title}</h1>
          <p className="summary">{lesson.summary}</p>
          <p className="coverage-note">
            {lesson.sections.length} sections · {totalPoints} explained points · each point has a
            flow diagram + visual explanation + textual explanation
          </p>
          <ul className="objectives">
            {lesson.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <div className="lesson-actions">
            <button type="button" onClick={() => toggleBookmark(lesson.id)}>
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button type="button" onClick={() => markComplete(lesson.id)}>
              {completed ? 'Completed' : 'Mark complete'}
            </button>
          </div>
        </header>

        {lesson.sections.map((section, sIdx) => (
          <section key={section.id} id={section.id} className="lesson-section-block">
            <div className="section-banner">
              <p className="section-kicker">
                Section {sIdx + 1} of {lesson.sections.length}
              </p>
              <h2>{section.title}</h2>
              {section.visualSummary ? (
                <p className="section-visual-summary">{section.visualSummary}</p>
              ) : null}
            </div>

            {section.diagram ? (
              <SectionFlowWithText diagram={section.diagram} />
            ) : null}

            <article className="lesson-article">
              <p className="panel-label">Full textual explanation</p>
              <MarkdownBody content={section.body || ''} />
            </article>

            {section.points?.length ? (
              <div className="points-stack">
                <h3 className="points-heading">
                  Point-by-point visual breakdown ({section.points.length})
                </h3>
                <p className="points-help">
                  Each point below has its own flow diagram, a short visual explanation, and the
                  detailed text for that idea.
                </p>
                {section.points.map((point, pIdx) => (
                  <PointCard key={point.id} point={point} index={pIdx} />
                ))}
              </div>
            ) : null}

            {section.scenario ? <ScenarioLab scenario={section.scenario} /> : null}
            {section.code?.length ? <CodePanel snippets={section.code} /> : null}
          </section>
        ))}

        {lesson.quiz?.length ? <KnowledgeCheck lessonId={lesson.id} items={lesson.quiz} /> : null}

        <div className="lesson-pager">
          {prevId ? (
            <Link to={`/learn/${lesson.trackId}/${prevId}`} className="pager">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {nextId ? (
            <Link to={`/learn/${lesson.trackId}/${nextId}`} className="pager next">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}
