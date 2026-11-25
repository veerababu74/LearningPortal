import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import '@/components/python/python.css'

const STEPS = [
  { label: 'Define f', detail: 'Original function object is created.', stack: ['f'] },
  { label: 'Apply @b', detail: 'f = b(f) — bottom decorator wraps first.', stack: ['b(f)'] },
  { label: 'Apply @a', detail: 'f = a(b(f)) — top decorator wraps the result.', stack: ['a(b(f))'] },
  { label: 'Call f()', detail: 'Enter a → enter b → run original → exit b → exit a.', stack: ['a →', 'b →', 'f body', '← b', '← a'] },
]

export function DecoratorUnwrapLab() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const step = STEPS[i]

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setI((x) => (x + 1) % STEPS.length), 1800)
    return () => window.clearInterval(id)
  }, [playing])

  return (
    <div className="py-page">
      <span className="py-sim-tag">Browser simulation</span>
      <h1>Decorator unwrap</h1>
      <p className="py-muted">
        <code>@a</code> above <code>@b</code> means <code>f = a(b(f))</code>. Wrapping is bottom-up;
        calling is top-down.
      </p>

      <pre className="py-pre">{`@a
@b
def f():
    return "hi"`}</pre>

      <div className="py-row">
        <button type="button" className="py-btn soft" onClick={() => setI((x) => (x - 1 + STEPS.length) % STEPS.length)}>
          Previous
        </button>
        <button type="button" className="py-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="py-btn soft" onClick={() => setI((x) => (x + 1) % STEPS.length)}>
          Next
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.label}
          className="py-flow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <h3>
            Step {i + 1}: {step.label}
          </h3>
          <p>{step.detail}</p>
          <div className="py-row">
            {step.stack.map((s) => (
              <span key={s} className="py-sim-tag" style={{ fontSize: '0.85rem' }}>
                {s}
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="py-lesson-nav">
        <Link to="/python/m5/decorators">Back to lesson</Link>
        <Link to="/python/labs/generator-stepper">Next lab →</Link>
      </div>
    </div>
  )
}
