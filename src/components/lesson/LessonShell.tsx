import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ConceptDiagram, FlowSpec, Lesson } from '@/types/curriculum'
import { FlowPlayer } from '@/components/visuals/FlowPlayer'
import { MermaidDiagram } from '@/components/visuals/MermaidDiagram'
import { ScenarioLab } from '@/components/scenario/ScenarioLab'
import { CodePanel } from '@/components/code/CodePanel'
import { KnowledgeCheck } from '@/components/quiz/KnowledgeCheck'
import { MarkdownBody } from '@/components/lesson/MarkdownBody'
import { PointCard } from '@/components/lesson/PointCard'
import { useProgress } from '@/store/progress'
import { phaseForModule as pyPhaseForModule } from '@/content/python/catalog'
import { phaseForModule as asyncPhaseForModule } from '@/content/asyncconcur/catalog'
import { phaseForModule as agentsPhaseForModule } from '@/content/agents/catalog'
import { simHref, simsForLesson } from '@/content/sims/registry'
import { AgentSimPlayer } from '@/components/agents/AgentSimPlayer'
import './LessonShell.css'

function cardBrowsePath(trackId: string, title: string) {
  const m = title.match(/^(\d{2})\./)
  if (trackId === 'python') {
    if (!m) return '/python'
    const phase = pyPhaseForModule(m[1])
    if (!phase) return '/python'
    return phase === 'learn' ? `/python/learn/${m[1]}` : `/python/${phase}`
  }
  if (trackId === 'asyncconcur') {
    if (!m) return '/async'
    const phase = asyncPhaseForModule(m[1])
    if (!phase) return '/async'
    return phase === 'learn' ? `/async/learn/${m[1]}` : `/async/${phase}`
  }
  if (trackId === 'agents') {
    if (!m) return '/agents'
    const phase = agentsPhaseForModule(m[1])
    if (!phase) return '/agents'
    return phase === 'learn' ? `/agents/learn/${m[1]}` : `/agents/${phase}`
  }
  return `/tracks/${trackId}`
}

function ConceptVisual({ diagram }: { diagram: ConceptDiagram }) {
  return (
    <figure className="concept-visual">
      <figcaption>
        <p className="panel-label">Visual explanation</p>
        <h3>{diagram.title}</h3>
      </figcaption>
      <MermaidDiagram chart={diagram.mermaid} />
      <div className="concept-visual-text">
        <p className="panel-label">How to read it</p>
        <MarkdownBody content={diagram.explain} />
      </div>
    </figure>
  )
}

function SectionFlowWithText({ diagram, label = 'Section flow diagram' }: { diagram: FlowSpec; label?: string }) {
  const [step, setStep] = useState(diagram.steps?.[0] || null)
  const onStepChange = useCallback((_i: number, s: FlowSpec['steps'][number]) => {
    setStep(s)
  }, [])

  return (
    <div className="section-diagram-pair">
      <div className="section-diagram">
        <p className="panel-label">{label}</p>
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
  'name-vs-object': { path: '/python/labs/name-vs-object', label: 'Name vs object lab' },
  'mutable-trap': { path: '/python/labs/mutable-trap', label: 'Mutable default trap' },
  'decorator-unwrap': { path: '/python/labs/decorator-unwrap', label: 'Decorator unwrap lab' },
  'generator-stepper': { path: '/python/labs/generator-stepper', label: 'Generator stepper' },
  'gil-vs-async': { path: '/python/labs/gil-vs-async', label: 'GIL vs asyncio lab' },
  'mro-tracer': { path: '/python/labs/mro-tracer', label: 'MRO tracer lab' },
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
  const totalDiagrams = useMemo(
    () =>
      lesson.sections.reduce(
        (n, s) =>
          n +
          (s.diagrams?.length || 0) +
          (s.diagram ? 1 : 0) +
          (String(s.body || '').match(/```mermaid/g)?.length || 0),
        0,
      ),
    [lesson.sections],
  )
  const isCourseTrack = lesson.trackId === 'python' || lesson.trackId === 'asyncconcur' || lesson.trackId === 'agents'
  const COURSE_HOME: Record<string, [string, string]> = { python: ['/python', 'Python'], asyncconcur: ['/async', 'Async'], agents: ['/agents', 'VeeraAgents'] }
  const agentVisuals = simsForLesson(lesson.trackId, lesson.title, lesson.sourceFile || '')
  const coverage = [
    `${lesson.sections.length} ${lesson.sections.length === 1 ? 'section' : 'sections'}`,
    totalDiagrams ? `${totalDiagrams} ${totalDiagrams === 1 ? 'diagram' : 'diagrams'}` : '',
    totalPoints ? `${totalPoints} explained points` : '',
    lesson.quiz?.length ? `${lesson.quiz.length}-question quiz` : '',
  ]
    .filter(Boolean)
    .join(' · ')

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
          {COURSE_HOME[lesson.trackId] ? (
            <p className="track-pill">
              <Link to={COURSE_HOME[lesson.trackId][0]}>{COURSE_HOME[lesson.trackId][1]}</Link>
              {' · '}
              <Link to={cardBrowsePath(lesson.trackId, lesson.title)}>Back to cards</Link>
            </p>
          ) : (
            <p className="track-pill">{lesson.trackId.replace(/-/g, ' ')}</p>
          )}
          <h1>{lesson.title}</h1>
          {lesson.series ? (
            <p className="series-line">
              {lesson.series}
              {lesson.part && lesson.partCount && lesson.partCount > 1
                ? ` · lesson ${lesson.part} of ${lesson.partCount}`
                : ''}
            </p>
          ) : null}
          <p className="summary">{lesson.summary}</p>
          <p className="coverage-note">{coverage}</p>
          {lesson.objectives.length ? (
            <>
              {isCourseTrack ? <p className="objectives-label">In this lesson</p> : null}
              <ul className="objectives">
                {lesson.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div className="lesson-actions">
            <button type="button" onClick={() => toggleBookmark(lesson.id)}>
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button type="button" onClick={() => markComplete(lesson.id)}>
              {completed ? 'Completed' : 'Mark complete'}
            </button>
          </div>
        </header>

        {agentVisuals.length ? (
          <section className="lesson-section-block agent-live-block">
            <div className="section-banner">
              <p className="section-kicker">Watch it run · animated simulation</p>
              <h2>{agentVisuals[0].title}</h2>
              <p className="section-visual-summary">
                Press play and follow the packet: each step lights up the component that is working, updates the
                live state and highlights the line of code that runs.
              </p>
            </div>
            <AgentSimPlayer sim={agentVisuals[0]} compact />
            {agentVisuals.length > 1 ? (
              <p className="agent-more-sims">
                More simulations for this lesson:{' '}
                {agentVisuals.slice(1).map((v) => (
                  <Link key={v.id} to={simHref(v)}>
                    {v.title}
                  </Link>
                ))}
              </p>
            ) : null}
          </section>
        ) : null}

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

            {section.diagrams?.map((d) => <ConceptVisual key={d.id} diagram={d} />)}

            {section.diagram ? (
              <SectionFlowWithText
                diagram={section.diagram}
                label={isCourseTrack ? 'Step-by-step walkthrough' : 'Section flow diagram'}
              />
            ) : null}

            <article className="lesson-article">
              <p className="panel-label">{isCourseTrack ? 'Explanation' : 'Full textual explanation'}</p>
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
