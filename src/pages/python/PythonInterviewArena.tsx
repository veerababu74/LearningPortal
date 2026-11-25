import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBackendInterviewQuestions, getPythonGeneratedIndex } from '@/content/python/loadGenerated'
import '@/components/python/python.css'

export function PythonInterviewArena() {
  const backend = getBackendInterviewQuestions()
  const index = getPythonGeneratedIndex()
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [topicId, setTopicId] = useState(index.topics[0]?.id || '')

  const current = backend[i]
  const topicMeta = useMemo(
    () => index.topics.find((t) => t.id === topicId) || index.topics[0],
    [index.topics, topicId],
  )

  return (
    <div className="py-page">
      <p className="py-kicker">Interview arena</p>
      <h1>C-S-E-T drills from your Python pack</h1>
      <p>
        Practice backend scenario questions and jump into parsed topic packs. Answer out loud before
        revealing.
      </p>

      <section className="py-card" style={{ marginTop: '1rem' }}>
        <p className="py-kicker">Backend scenario drill</p>
        {current ? (
          <>
            <p className="py-muted">Question {current.number}</p>
            <h2 style={{ marginTop: 0 }}>{current.question}</h2>
            <div className="py-row">
              <button
                type="button"
                className="py-btn soft"
                onClick={() => {
                  setRevealed(false)
                  setI((x) => (x - 1 + backend.length) % backend.length)
                }}
              >
                Previous
              </button>
              <button type="button" className="py-btn" onClick={() => setRevealed((r) => !r)}>
                {revealed ? 'Hide answer' : 'Reveal answer'}
              </button>
              <button
                type="button"
                className="py-btn soft"
                onClick={() => {
                  setRevealed(false)
                  setI((x) => (x + 1) % backend.length)
                }}
              >
                Next
              </button>
            </div>
            {revealed ? (
              <div className="py-hint">
                <p>
                  <strong>Answer:</strong> {current.answer || 'See detail below.'}
                </p>
                {current.detail ? (
                  <p>
                    <strong>Detail:</strong> {current.detail}
                  </p>
                ) : null}
                {current.code ? <pre className="py-pre">{current.code}</pre> : null}
              </div>
            ) : (
              <p className="py-muted">Speak Concept → Syntax → Example → Tradeoff before revealing.</p>
            )}
          </>
        ) : (
          <p>No backend questions parsed yet. Re-run `npm run parse:python`.</p>
        )}
      </section>

      <section className="py-card" style={{ marginTop: '1rem' }}>
        <p className="py-kicker">Topic pack browser</p>
        <label>
          Topic
          <select
            value={topicMeta?.id || ''}
            onChange={(e) => setTopicId(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8 }}
          >
            {index.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.conceptualCount}Q / {t.scenarioCount}S)
              </option>
            ))}
          </select>
        </label>
        {topicMeta ? (
          <>
            <p style={{ marginTop: 12 }}>{topicMeta.summary}</p>
            <Link to={`/learn/python/${topicMeta.id}`} className="py-btn">
              Open GenAI-style lesson
            </Link>
          </>
        ) : null}
      </section>

      <div className="py-lesson-nav">
        <Link to="/python">Course home</Link>
        <Link to="/python/m10/cset-method">C-S-E-T lesson →</Link>
      </div>
    </div>
  )
}
