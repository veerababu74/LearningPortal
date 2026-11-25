import { useState } from 'react'
import type { DockerPractice } from '@/content/docker/types'
import './docker.css'

export function PracticePanel({ practice }: { practice: DockerPractice }) {
  const [choice, setChoice] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [hintIdx, setHintIdx] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  const correct = choice === practice.prediction.answerIndex

  return (
    <div className="dk-practice">
      <h3>Practice</h3>

      <section className="dk-card">
        <p className="dk-kicker">Prediction question</p>
        <p className="dk-strong">{practice.prediction.question}</p>
        <div className="dk-choices">
          {practice.prediction.choices.map((c, idx) => (
            <button
              key={c}
              type="button"
              className={choice === idx ? 'dk-choice selected' : 'dk-choice'}
              onClick={() => {
                setChoice(idx)
                setSubmitted(false)
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="dk-btn"
          disabled={choice == null}
          onClick={() => setSubmitted(true)}
        >
          Check answer
        </button>
        {submitted ? (
          <p className={correct ? 'dk-ok' : 'dk-bad'}>
            {correct ? 'Correct. ' : 'Not quite. '}
            {practice.prediction.explanation}
          </p>
        ) : null}
      </section>

      <section className="dk-card">
        <p className="dk-kicker">Interactive exercise</p>
        <h4>{practice.exercise.title}</h4>
        <p>{practice.exercise.prompt}</p>
        <p className="dk-muted">Completion check: {practice.exercise.checkPrompt}</p>
        <div className="dk-row">
          <button
            type="button"
            className="dk-btn soft"
            onClick={() => setHintIdx((h) => Math.min(h + 1, practice.exercise.hints.length))}
          >
            Show hint ({hintIdx}/{practice.exercise.hints.length})
          </button>
          <button type="button" className="dk-btn soft" onClick={() => setShowSolution((s) => !s)}>
            {showSolution ? 'Hide solution' : 'Reveal solution'}
          </button>
        </div>
        {practice.exercise.hints.slice(0, hintIdx).map((h) => (
          <p key={h} className="dk-hint">
            Hint: {h}
          </p>
        ))}
        {showSolution ? <pre className="dk-pre">{practice.exercise.solution}</pre> : null}
      </section>

      <section className="dk-card">
        <p className="dk-kicker">Hands-on (real Docker)</p>
        <h4>{practice.handsOn.title}</h4>
        <pre className="dk-pre">{practice.handsOn.commands.join('\n')}</pre>
        <p>
          <strong>Verify:</strong> {practice.handsOn.verify}
        </p>
        {practice.handsOn.windowsNote ? (
          <p className="dk-muted">Windows/macOS/Linux note: {practice.handsOn.windowsNote}</p>
        ) : null}
      </section>
    </div>
  )
}
