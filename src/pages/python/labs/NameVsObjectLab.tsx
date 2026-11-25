import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import '@/components/python/python.css'

type HeapObj = { id: number; value: string; kind: 'list' | 'int' }

let nextId = 1000

export function NameVsObjectLab() {
  const [heap, setHeap] = useState<HeapObj[]>([{ id: 1001, value: '[1, 2]', kind: 'list' }])
  const [names, setNames] = useState<Record<string, number>>({ a: 1001 })
  const [log, setLog] = useState<string[]>(['a = [1, 2]'])
  const [prediction, setPrediction] = useState<'same' | 'diff' | null>(null)
  const [checked, setChecked] = useState(false)

  const a = names.a
  const b = names.b
  const same = a != null && b != null && a === b

  function pushLog(line: string) {
    setLog((l) => [...l.slice(-6), line])
  }

  function assignBAlias() {
    if (a == null) return
    setNames((n) => ({ ...n, b: a }))
    pushLog('b = a  # alias')
    setChecked(false)
    setPrediction(null)
  }

  function assignBCopy() {
    const obj = heap.find((h) => h.id === a)
    if (!obj) return
    const id = ++nextId
    setHeap((h) => [...h, { id, value: obj.value, kind: 'list' }])
    setNames((n) => ({ ...n, b: id }))
    pushLog('b = list(a)  # shallow copy')
    setChecked(false)
    setPrediction(null)
  }

  function mutateB() {
    if (b == null) return
    setHeap((h) =>
      h.map((obj) =>
        obj.id === b && obj.kind === 'list'
          ? { ...obj, value: obj.value.replace(']', ', 9]') }
          : obj,
      ),
    )
    pushLog('b.append(9)')
  }

  function rebindA() {
    const id = ++nextId
    setHeap((h) => [...h, { id, value: '42', kind: 'int' }])
    setNames((n) => ({ ...n, a: id }))
    pushLog('a = 42  # rebind name a')
    setChecked(false)
    setPrediction(null)
  }

  return (
    <div className="py-page">
      <span className="py-sim-tag">Browser simulation</span>
      <h1>Name vs object</h1>
      <p className="py-muted">
        Names point at objects. Alias vs copy decides whether mutation is shared.
      </p>

      <div className="py-row">
        <button type="button" className="py-btn" onClick={assignBAlias}>
          b = a
        </button>
        <button type="button" className="py-btn soft" onClick={assignBCopy}>
          b = list(a)
        </button>
        <button type="button" className="py-btn soft" onClick={mutateB} disabled={b == null}>
          b.append(9)
        </button>
        <button type="button" className="py-btn soft" onClick={rebindA}>
          a = 42
        </button>
      </div>

      <div className="py-lab-board" style={{ marginTop: '0.85rem' }}>
        {Object.entries(names).map(([name, objId]) => {
          const obj = heap.find((h) => h.id === objId)
          return (
            <motion.div
              key={name}
              className="py-obj active"
              layout
              initial={{ opacity: 0.4, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <strong>name {name}</strong>
              <p className="py-muted">points to id={objId}</p>
              <p>{obj?.value}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="py-card" style={{ marginTop: '0.85rem' }}>
        <p className="py-kicker">Predict</p>
        <p>
          Right now, is <code>a is b</code>?
        </p>
        <div className="py-row">
          <button type="button" className="py-btn soft" onClick={() => setPrediction('same')}>
            Same object
          </button>
          <button type="button" className="py-btn soft" onClick={() => setPrediction('diff')}>
            Different objects
          </button>
          <button
            type="button"
            className="py-btn"
            disabled={!prediction || b == null}
            onClick={() => setChecked(true)}
          >
            Check
          </button>
        </div>
        {checked && prediction ? (
          <p className={prediction === (same ? 'same' : 'diff') ? 'py-ok' : 'py-bad'}>
            {prediction === (same ? 'same' : 'diff') ? 'Correct.' : 'Not quite.'} Actual:{' '}
            {same ? 'a is b → True' : 'a is b → False'}
          </p>
        ) : null}
      </div>

      <pre className="py-pre" style={{ marginTop: '0.85rem' }}>
        {log.join('\n')}
      </pre>

      <div className="py-lesson-nav">
        <Link to="/python/m1/names-and-objects">Back to lesson</Link>
        <Link to="/python/labs/mutable-trap">Next lab →</Link>
      </div>
    </div>
  )
}
