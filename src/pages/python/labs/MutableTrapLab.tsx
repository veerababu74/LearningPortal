import { useState } from 'react'
import { Link } from 'react-router-dom'
import '@/components/python/python.css'

export function MutableTrapLab() {
  const [mode, setMode] = useState<'bad' | 'good'>('bad')
  const [badBucket, setBadBucket] = useState<string[]>([])
  const [calls, setCalls] = useState(0)
  const [goodBuckets, setGoodBuckets] = useState<string[][]>([])

  function callBad(item: string) {
    setBadBucket((b) => [...b, item])
    setCalls((c) => c + 1)
  }

  function callGood(item: string) {
    setGoodBuckets((rows) => [...rows, [item]])
    setCalls((c) => c + 1)
  }

  function reset() {
    setBadBucket([])
    setGoodBuckets([])
    setCalls(0)
  }

  return (
    <div className="py-page">
      <span className="py-sim-tag">Browser simulation</span>
      <h1>Mutable default trap</h1>
      <p className="py-muted">
        Default arguments are evaluated once at function definition. A mutable default is shared.
      </p>

      <div className="py-row">
        <button
          type="button"
          className={mode === 'bad' ? 'py-btn' : 'py-btn soft'}
          onClick={() => {
            setMode('bad')
            reset()
          }}
        >
          Broken: bucket=[]
        </button>
        <button
          type="button"
          className={mode === 'good' ? 'py-btn' : 'py-btn soft'}
          onClick={() => {
            setMode('good')
            reset()
          }}
        >
          Fixed: bucket=None
        </button>
        <button type="button" className="py-btn soft" onClick={reset}>
          Reset
        </button>
      </div>

      <pre className="py-pre">
        {mode === 'bad'
          ? `def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket`
          : `def add_item(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket`}
      </pre>

      <div className="py-row">
        <button
          type="button"
          className="py-btn"
          onClick={() => (mode === 'bad' ? callBad('a') : callGood('a'))}
        >
          Call add_item("a")
        </button>
        <button
          type="button"
          className="py-btn soft"
          onClick={() => (mode === 'bad' ? callBad('b') : callGood('b'))}
        >
          Call add_item("b")
        </button>
      </div>

      <div className="py-card" style={{ marginTop: '0.85rem' }}>
        <p>
          Calls: <strong>{calls}</strong>
        </p>
        {mode === 'bad' ? (
          <p>
            Shared default bucket: <code>{JSON.stringify(badBucket)}</code>
            {badBucket.length > 1 ? (
              <span className="py-bad"> — second call reused the same list</span>
            ) : null}
          </p>
        ) : (
          <div>
            <p className="py-ok">Each call gets a fresh list:</p>
            <ul>
              {goodBuckets.map((b, i) => (
                <li key={`${i}-${b.join()}`}>{JSON.stringify(b)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="py-lesson-nav">
        <Link to="/python/m3/legb-and-closures">Back to lesson</Link>
        <Link to="/python/labs/decorator-unwrap">Next lab →</Link>
      </div>
    </div>
  )
}
