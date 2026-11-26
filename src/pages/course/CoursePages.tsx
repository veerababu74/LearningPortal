import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  cleanPreview,
  courseLessons,
  lessonTopic,
  modulesForPhase,
  phaseForModule,
  phaseOf,
  searchCourse,
  courseModules,
  type CourseConfig,
} from '@/content/courseKit'
import { getAnySim, simHref } from '@/content/sims/registry'
import { AgentSimPlayer } from '@/components/agents/AgentSimPlayer'
import { SeriesCards } from '@/components/python/SeriesCards'
import { useProgress } from '@/store/progress'
import '@/components/python/python.css'
import '@/components/agents/agents.css'
import { tidyTitle } from '@/content/titles'

const href = (cfg: CourseConfig, id: string) => `/learn/${cfg.trackId}/${id}`

function SearchResults({ cfg, hits, completed }: { cfg: CourseConfig; hits: ReturnType<typeof searchCourse>; completed: string[] }) {
  return (
    <section className="py-section">
      <h2>
        Results <span className="py-count">{hits.length}</span>
      </h2>
      <div className="py-card-grid">
        {hits.slice(0, 30).map((lesson) => (
          <Link key={lesson.id} to={href(cfg, lesson.id)} className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}>
            <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || cfg.title}</p>
            <h3>{tidyTitle(cleanPreview(lessonTopic(lesson.title)))}</h3>
            <p>{cleanPreview(lesson.summary)}</p>
          </Link>
        ))}
        {!hits.length ? <p className="py-muted">No lessons match.</p> : null}
      </div>
      {hits.length > 30 ? <p className="py-muted">Showing 30 of {hits.length} — refine your search.</p> : null}
    </section>
  )
}

function ModuleCards({ cfg, moduleIds, completed }: { cfg: CourseConfig; moduleIds?: string[]; completed: string[] }) {
  const mods = modulesForPhase(cfg, 'learn').filter((m) => !moduleIds || moduleIds.includes(m.id))
  return (
    <div className="ag-roadmap">
      {mods.map((mod) => {
        const info = cfg.modules[mod.id]
        const done = mod.lessons.filter((l) => completed.includes(l.id)).length
        const pct = mod.lessons.length ? Math.round((done / mod.lessons.length) * 100) : 0
        const sims = cfg.sims.filter((s) => cfg.simModuleOf(s) === mod.id).length
        return (
          <Link key={mod.id} to={`${cfg.base}/learn/${mod.id}`} className="ag-mod-card" style={{ ['--mod' as string]: info?.color || cfg.accent }}>
            <span className="ag-mod-num">
              {info?.icon} Module {mod.id}
            </span>
            <h3>{mod.name}</h3>
            <p>{info?.blurb}</p>
            <div className="ag-mod-meta">
              <span>{mod.lessons.length} lessons</span>
              {sims ? <span>{sims} simulations</span> : null}
              {pct ? <span>{pct}% done</span> : null}
            </div>
            <div className="ag-mod-progress" aria-label={`${pct}% complete`}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function CourseHome({ cfg }: { cfg: CourseConfig }) {
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchCourse(cfg, q), [cfg, q])
  const lessons = courseLessons(cfg)
  const learnMods = modulesForPhase(cfg, 'learn')
  const interviewCount = modulesForPhase(cfg, 'interview').reduce((n, m) => n + m.lessons.length, 0)
  const demo = getAnySim(cfg.demoSimId)
  const done = lessons.filter((l) => completed.includes(l.id)).length

  return (
    <div className="py-page">
      <section className="ag-hero" style={{ borderColor: `${cfg.accent}55` }}>
        <p className="py-kicker" style={{ color: cfg.accent }}>
          {cfg.kicker}
        </p>
        <h1 style={{ color: 'var(--ink)' }}>{cfg.heroTitle}</h1>
        <p>{cfg.heroText}</p>
        <div className="ag-hero-stats">
          <span>{lessons.length} lessons</span>
          <span>{learnMods.length} modules</span>
          <span>{cfg.sims.length} simulations</span>
          <span>{cfg.labs.length} hands-on labs</span>
          <span>{interviewCount} interview sets</span>
          {done ? <span>{done} completed</span> : null}
        </div>
        <div className="ag-hero-cta">
          <Link className="ag-cta" to={`${cfg.base}/learn/01`} style={{ background: cfg.accent }}>
            Start with module 01 →
          </Link>
          <Link className="ag-cta soft" to={cfg.visualizerBase}>
            ▶ Simulations
          </Link>
          <Link className="ag-cta soft" to={`${cfg.base}/interview`}>
            🎯 Interview prep
          </Link>
        </div>
      </section>

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input className="py-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={cfg.searchPlaceholder} aria-label={`Search ${cfg.title} lessons`} />
      </label>

      {q.trim() ? (
        <SearchResults cfg={cfg} hits={hits} completed={completed} />
      ) : (
        <>
          {demo ? (
            <section className="py-section">
              <div className="ag-sim-head">
                <div>
                  <h2>Watch a RAG request run</h2>
                  <p className="py-muted">Press play: follow the question through retrieval, reranking and generation, with live state and the code that runs.</p>
                </div>
                <Link className="ag-cta soft" to={cfg.visualizerBase}>
                  All {cfg.sims.length} simulations →
                </Link>
              </div>
              <AgentSimPlayer sim={demo} />
            </section>
          ) : null}

          <section className="py-section">
            <h2>
              Learning roadmap <span className="py-count">{learnMods.length}</span>
            </h2>
            <ModuleCards cfg={cfg} completed={completed} />
          </section>

          <section className="py-section">
            <h2>Hands-on labs</h2>
            <div className="ag-sim-grid">
              {cfg.labs.map((lab) => (
                <Link key={lab.to} to={lab.to} className="ag-sim-card">
                  <span style={{ fontSize: '1.5rem' }} aria-hidden>
                    {lab.icon}
                  </span>
                  <h3>{lab.title}</h3>
                  <p>{lab.text}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="py-section">
            <h2>Practice paths</h2>
            <div className="py-phase-grid">
              {cfg.phases
                .filter((p) => p.id !== 'learn')
                .map((phase) => {
                  const count = modulesForPhase(cfg, phase.id).reduce((n, m) => n + m.lessons.length, 0)
                  return (
                    <Link key={phase.id} to={`${cfg.base}/${phase.id}`} className="py-phase-card" style={{ ['--phase-accent' as string]: phase.accent }}>
                      <p className="py-kicker">{count} topics</p>
                      <h2>{phase.title}</h2>
                      <p>{phase.blurb}</p>
                      <span className="py-phase-meta">{count} lessons</span>
                    </Link>
                  )
                })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export function CoursePhasePage({ cfg }: { cfg: CourseConfig }) {
  const { phaseId = '' } = useParams()
  const phase = phaseOf(cfg, phaseId)
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchCourse(cfg, q, { phaseId }), [cfg, q, phaseId])
  if (!phase) return <Navigate to={cfg.base} replace />
  const mods = modulesForPhase(cfg, phaseId)
  const isLearn = phaseId === 'learn'

  return (
    <div className="py-page">
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to={cfg.base}>{cfg.title}</Link>
        <span>/</span>
        <span>{phase.title}</span>
      </nav>
      <section className="py-hero" style={{ borderLeft: `5px solid ${phase.accent}` }}>
        <p className="py-kicker" style={{ color: phase.accent }}>
          {phase.title}
        </p>
        <h1>{isLearn ? 'Concept modules' : `${phase.title} by topic`}</h1>
        <p>{phase.blurb}</p>
        {phaseId === 'interview' ? <p className="py-muted">Answer out loud first — concept, a small example, then the trade-off — before reading the model answer.</p> : null}
      </section>
      <label className="py-search-wrap">
        <span className="py-kicker">Search in {phase.title}</span>
        <input className="py-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${phase.title.toLowerCase()}…`} aria-label={`Search ${phase.title}`} />
      </label>
      {q.trim() ? (
        <SearchResults cfg={cfg} hits={hits} completed={completed} />
      ) : isLearn ? (
        <section className="py-section">
          <h2>
            Modules <span className="py-count">{mods.length}</span>
          </h2>
          <ModuleCards cfg={cfg} completed={completed} />
        </section>
      ) : (
        <section className="py-section">
          <h2>
            Topics <span className="py-count">{mods[0]?.lessons.length || 0}</span>
          </h2>
          <SeriesCards lessons={mods[0]?.lessons || []} hrefBase={`/learn/${cfg.trackId}`} completed={completed} topicOf={lessonTopic} preview={cleanPreview} />
        </section>
      )}
    </div>
  )
}

export function CourseModulePage({ cfg }: { cfg: CourseConfig }) {
  const { moduleId = '' } = useParams()
  const mod = courseModules(cfg).find((m) => m.id === moduleId)
  const info = cfg.modules[moduleId]
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchCourse(cfg, q, { moduleId }), [cfg, q, moduleId])
  if (!mod || phaseForModule(cfg, moduleId) !== 'learn') return <Navigate to={`${cfg.base}/learn`} replace />
  const sims = cfg.sims.filter((s) => cfg.simModuleOf(s) === moduleId)
  const learnIds = phaseOf(cfg, 'learn')!.moduleIds
  const next = learnIds[learnIds.indexOf(moduleId) + 1]
  const prev = learnIds[learnIds.indexOf(moduleId) - 1]
  const lessons = q.trim() ? hits : mod.lessons

  return (
    <div className="py-page">
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to={cfg.base}>{cfg.title}</Link>
        <span>/</span>
        <Link to={`${cfg.base}/learn`}>Learn</Link>
        <span>/</span>
        <span>
          {mod.id}. {mod.name}
        </span>
      </nav>
      <section className="py-hero" style={{ borderLeft: `5px solid ${info?.color || cfg.accent}` }}>
        <p className="py-kicker" style={{ color: info?.color }}>
          {info?.icon} Module {mod.id}
        </p>
        <h1>{mod.name}</h1>
        <p>{info?.blurb}</p>
        <p className="py-muted">Suggested order: watch the simulation, read the core-course lessons, then go deeper with the series below and finish in a lab.</p>
      </section>

      {sims.length ? (
        <section className="py-section">
          <h2>
            Watch first <span className="py-count">{sims.length}</span>
          </h2>
          <div className="ag-sim-grid">
            {sims.map((s) => (
              <Link key={s.id} to={simHref(s)} className="ag-sim-card">
                <div className="ag-tags">
                  <span className="ag-tag">▶ {s.framework}</span>
                  <span className="ag-tag lvl">{s.level}</span>
                  <span className="ag-tag lvl">{s.steps.length} steps</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <label className="py-search-wrap">
        <span className="py-kicker">Search in this module</span>
        <input className="py-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${mod.name} lessons…`} aria-label={`Search ${mod.name}`} />
      </label>

      <section className="py-section">
        <h2>
          Lessons <span className="py-count">{lessons.length}</span>
        </h2>
        <SeriesCards lessons={lessons} hrefBase={`/learn/${cfg.trackId}`} completed={completed} topicOf={lessonTopic} preview={cleanPreview} />
      </section>

      <div className="ag-sim-nav" style={{ justifyContent: 'space-between' }}>
        {prev ? (
          <Link className="ag-cta soft" to={`${cfg.base}/learn/${prev}`}>
            ← Module {prev}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="ag-cta soft" to={`${cfg.base}/learn/${next}`}>
            Module {next} →
          </Link>
        ) : null}
      </div>
    </div>
  )
}
