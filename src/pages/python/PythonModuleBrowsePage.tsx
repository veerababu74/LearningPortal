import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  cleanPreview,
  getModule,
  getPhase,
  lessonTopic,
  phaseForModule,
  searchPythonLessons,
} from '@/content/python/catalog'
import { useProgress } from '@/store/progress'
import { SeriesCards } from '@/components/python/SeriesCards'
import '@/components/python/python.css'

export function PythonModuleBrowsePage() {
  const { moduleId = '' } = useParams()
  const phase = getPhase('learn')
  const mod = getModule(moduleId)
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')

  const expectedPhase = phaseForModule(moduleId)
  const hits = useMemo(() => searchPythonLessons(q, { moduleId }), [q, moduleId])
  const searching = q.trim().length > 0

  if (!mod || expectedPhase !== 'learn') return <Navigate to="/python/learn" replace />

  const lessons = searching ? hits : mod.lessons

  return (
    <div className="py-page">
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to="/python">Python</Link>
        <span>/</span>
        <Link to="/python/learn">Learn</Link>
        <span>/</span>
        <span>
          {mod.id}. {mod.name}
        </span>
      </nav>

      <section className="py-hero" style={{ borderLeft: `5px solid ${phase?.accent || '#1f6feb'}` }}>
        <p className="py-kicker">Module {mod.id}</p>
        <h1>
          {mod.id}. {mod.name}
        </h1>
        <p>
          Lessons are grouped by the course they come from. Each lesson keeps the full source
          explanation and examples, with flow diagrams for the key ideas and a quiz built from the
          course’s own interview answers.
        </p>
      </section>

      <label className="py-search-wrap">
        <span className="py-kicker">Search in this module</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Filter ${mod.name} lessons…`}
          aria-label={`Search ${mod.name}`}
        />
      </label>

      <section className="py-section">
        <h2>
          Lessons <span className="py-count">{lessons.length}</span>
        </h2>
        <SeriesCards
          lessons={lessons}
          hrefBase="/learn/python"
          completed={completed}
          topicOf={lessonTopic}
          preview={cleanPreview}
        />
      </section>
    </div>
  )
}
