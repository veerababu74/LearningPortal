import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import '@/components/python/python.css'

const FRAMES = [
  { pc: 'start', yielded: null as number | null, note: 'gen = countdown(3) — function body not running yet.' },
  { pc: 'yield 3', yielded: 3, note: 'First next(): run until yield 3, then suspend.' },
  { pc: 'yield 2', yielded: 2, note: 'Resume after previous yield; yield 2; suspend.' },
  { pc: 'yield 1', yielded: 1, note: 'Resume; yield 1; suspend.' },
  { pc: 'StopIteration', yielded: null, note: 'Function returns — iterator is exhausted.' },
]

export function GeneratorStepperLab() {
  const [i, setI] = useState(0)
  const frame = FRAMES[i]

  return (
    <div className="py-page">
      <span className="py-sim-tag">Browser simulation</span>
      <h1>Generator stepper</h1>
      <p className="py-muted">Generators pause at yield and resume later — perfect for streaming pipelines.</p>

      <pre className="py-pre">{`def countdown(n):
    while n:
        yield n
        n -= 1

gen = countdown(3)
print(next(gen))  # step with the buttons`}</pre>

      <div className="py-row">
        <button type="button" className="py-btn soft" disabled={i === 0} onClick={() => setI((x) => x - 1)}>
          Back
        </button>
        <button
          type="button"
          className="py-btn"
          disabled={i >= FRAMES.length - 1}
          onClick={() => setI((x) => x + 1)}
        >
          next(gen)
        </button>
        <button type="button" className="py-btn soft" onClick={() => setI(0)}>
          Reset
        </button>
      </div>

      <motion.div className="py-flow" key={frame.pc} initial={{ scale: 0.98 }} animate={{ scale: 1 }}>
        <h3>Program counter: {frame.pc}</h3>
        <p>{frame.note}</p>
        <p>
          Yielded value:{' '}
          <strong>{frame.yielded == null ? '—' : String(frame.yielded)}</strong>
        </p>
        <div className="py-row">
          {FRAMES.map((f, idx) => (
            <span
              key={f.pc}
              className="py-sim-tag"
              style={{ opacity: idx <= i ? 1 : 0.35, background: idx === i ? '#ffedd5' : undefined }}
            >
              {f.pc}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="py-lesson-nav">
        <Link to="/python/m5/generators">Back to lesson</Link>
        <Link to="/python/labs/gil-vs-async">Next lab →</Link>
      </div>
    </div>
  )
}
