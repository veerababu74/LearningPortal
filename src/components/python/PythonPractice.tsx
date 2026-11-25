import { useState } from 'react'
import type { PyInterviewItem, PyLesson } from '@/content/python/types'
import './python.css'

export function ScenarioPractice({ scenario }: { scenario: PyLesson['scenario'] }) {
  const [choice, setChoice] = useState<string | null>(null)

  const selected = scenario.choices.find((c) => c.id === choice)

  return (
    <section className="py-card">
      <p className="py-kicker">Scenario practice</p>
      <h3 style={{ marginTop: 0 }}>{scenario.title}</h3>
      <p>{scenario.situation}</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {scenario.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={choice === c.id ? 'py-choice selected' : 'py-choice'}
            onClick={() => setChoice(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {selected ? (
        <p
          className={
            selected.outcome === 'success' ? 'py-ok' : selected.outcome === 'warning' ? 'py-warn' : 'py-bad'
          }
        >
          {selected.outcome.toUpperCase()}: {selected.explanation}
        </p>
      ) : null}
    </section>
  )
}

export function InterviewDrill({ items }: { items: PyInterviewItem[] }) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section className="py-card">
      <p className="py-kicker">Interview drill · C-S-E-T</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item) => {
          const shown = open === item.id
          return (
            <div key={item.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <p className="py-muted" style={{ margin: 0 }}>
                {item.kind === 'scenario' ? 'Scenario' : 'Concept'}
              </p>
              <p className="py-strong">{item.question}</p>
              <button
                type="button"
                className="py-btn soft"
                onClick={() => setOpen(shown ? null : item.id)}
              >
                {shown ? 'Hide C-S-E-T answer' : 'Reveal C-S-E-T answer'}
              </button>
              {shown ? (
                <div className="py-hint" style={{ marginTop: 10 }}>
                  <p>
                    <strong>Concept:</strong> {item.answer.concept}
                  </p>
                  <p>
                    <strong>Syntax:</strong> {item.answer.syntax}
                  </p>
                  <p>
                    <strong>Example:</strong> {item.answer.example}
                  </p>
                  <p>
                    <strong>Tradeoff:</strong> {item.answer.tradeoff}
                  </p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
