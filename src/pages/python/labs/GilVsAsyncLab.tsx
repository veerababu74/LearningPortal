import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import '@/components/python/python.css'

type Mode = 'threads-cpu' | 'async-io'

export function GilVsAsyncLab() {
  const [mode, setMode] = useState<Mode>('threads-cpu')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    setT(0)
  }, [mode])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setT((x) => (x + 1) % 12), 500)
    return () => window.clearInterval(id)
  }, [playing, mode])

  const threadA = mode === 'threads-cpu' ? (t % 2 === 0 ? 'RUN' : 'WAIT-GIL') : t % 3 === 0 ? 'IO-wait' : 'idle'
  const threadB = mode === 'threads-cpu' ? (t % 2 === 1 ? 'RUN' : 'WAIT-GIL') : t % 3 === 1 ? 'IO-wait' : 'idle'
  const asyncTask =
    mode === 'async-io'
      ? ['await http1', 'await http2', 'await http3'][t % 3]
      : 'event loop not used'

  return (
    <div className="py-page">
      <span className="py-sim-tag">Browser simulation</span>
      <h1>GIL vs asyncio</h1>
      <p className="py-muted">
        Under CPython, CPU-bound threads take turns holding the GIL. Asyncio interleaves waits on one
        thread for I/O-bound work.
      </p>

      <div className="py-row">
        <button
          type="button"
          className={mode === 'threads-cpu' ? 'py-btn' : 'py-btn soft'}
          onClick={() => setMode('threads-cpu')}
        >
          2 CPU threads
        </button>
        <button
          type="button"
          className={mode === 'async-io' ? 'py-btn' : 'py-btn soft'}
          onClick={() => setMode('async-io')}
        >
          asyncio I/O fan-out
        </button>
        <button type="button" className="py-btn soft" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="py-lab-board" style={{ marginTop: '0.85rem' }}>
        <motion.div className="py-obj active" animate={{ opacity: 1 }} key={`a-${threadA}`}>
          <strong>{mode === 'async-io' ? 'Task A' : 'Thread A'}</strong>
          <p>{threadA}</p>
        </motion.div>
        <motion.div className="py-obj active" animate={{ opacity: 1 }} key={`b-${threadB}`}>
          <strong>{mode === 'async-io' ? 'Task B' : 'Thread B'}</strong>
          <p>{threadB}</p>
        </motion.div>
        <div className="py-obj">
          <strong>{mode === 'async-io' ? 'Event loop' : 'GIL'}</strong>
          <p>{mode === 'threads-cpu' ? 'One bytecode runner at a time' : asyncTask}</p>
        </div>
      </div>

      <div className="py-card" style={{ marginTop: '0.85rem' }}>
        {mode === 'threads-cpu' ? (
          <p>
            Even on multi-core, CPython bytecode for these threads is serialized by the GIL. Prefer
            multiprocessing or native extensions for CPU-bound work.
          </p>
        ) : (
          <p>
            While one task awaits network I/O, the loop can progress other tasks — great for many LLM
            HTTP calls.
          </p>
        )}
      </div>

      <div className="py-lesson-nav">
        <Link to="/python/m7/gil-mental-model">Back to lesson</Link>
        <Link to="/python/labs/mro-tracer">Next lab →</Link>
      </div>
    </div>
  )
}
