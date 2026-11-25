import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import '@/components/python/python.css'

const MRO = ['D', 'B', 'C', 'A', 'object']
const STEPS = [
  'Look for method on D',
  'Not found — try B (next in MRO)',
  'Not found — try C',
  'Found on A — use A.ping',
  'super() chains continue along the same MRO',
]

export function MroTracerLab() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setI((x) => (x + 1) % STEPS.length), 1600)
    return () => window.clearInterval(id)
  }, [playing])

  const active = MRO[Math.min(i, MRO.length - 1)]

  return (
    <div className="py-page">
      <span className="py-sim-tag">Browser simulation</span>
      <h1>MRO tracer</h1>
      <p className="py-muted">
        Diamond inheritance: D(B, C) with B(A), C(A). C3 linearization decides the lookup order.
      </p>

      <pre className="py-pre">{`class A:
    def ping(self): return "A"
class B(A): ...
class C(A): ...
class D(B, C): ...
D.__mro__  # D, B, C, A, object`}</pre>

      <div className="py-row">
        <button type="button" className="py-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="py-btn soft" onClick={() => setI(0)}>
          Restart
        </button>
      </div>

      <div className="py-row" style={{ marginTop: '0.85rem' }}>
        {MRO.map((cls, idx) => (
          <motion.div
            key={cls}
            className={cls === active && i < 4 ? 'py-obj active' : 'py-obj'}
            animate={{ scale: cls === active && i < 4 ? 1.05 : 1 }}
          >
            <strong>{cls}</strong>
            <p className="py-muted">#{idx + 1}</p>
          </motion.div>
        ))}
      </div>

      <div className="py-flow" style={{ marginTop: '0.85rem' }}>
        <h3>
          Step {i + 1}/{STEPS.length}
        </h3>
        <p>{STEPS[i]}</p>
      </div>

      <div className="py-lesson-nav">
        <Link to="/python/m4/mro-super">Back to lesson</Link>
        <Link to="/python/interview">Interview topics →</Link>
      </div>
    </div>
  )
}
