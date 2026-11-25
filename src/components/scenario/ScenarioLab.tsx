import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScenarioSpec } from '@/types/curriculum'
import './ScenarioLab.css'

export function ScenarioLab({ scenario }: { scenario: ScenarioSpec }) {
  const [selected, setSelected] = useState<string | null>(null)
  const choice = scenario.choices.find((c) => c.id === selected)

  return (
    <div className="scenario-lab">
      <p className="scenario-kicker">Scenario lab</p>
      <h3>{scenario.title}</h3>
      <p className="situation">{scenario.situation}</p>
      <div className="choices">
        {scenario.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={selected === c.id ? `choice selected ${c.outcome}` : 'choice'}
            onClick={() => setSelected(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {choice ? (
          <motion.div
            key={choice.id}
            className={`outcome ${choice.outcome}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <strong>
              {choice.outcome === 'success'
                ? 'Good path'
                : choice.outcome === 'warning'
                  ? 'Partial path'
                  : 'Risky path'}
            </strong>
            <p>{choice.explanation}</p>
          </motion.div>
        ) : (
          <p className="hint">Choose an action to see what happens next.</p>
        )}
      </AnimatePresence>
    </div>
  )
}
