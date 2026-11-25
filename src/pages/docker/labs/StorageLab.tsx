import { useState } from 'react'
import { Link } from 'react-router-dom'
import '@/components/docker/docker.css'

type Mode = 'ephemeral' | 'bind' | 'volume'

type StoreState = {
  fileExists: boolean
  lastAction: string
}

const INITIAL: Record<Mode, StoreState> = {
  ephemeral: { fileExists: false, lastAction: 'Empty writable layer' },
  bind: { fileExists: false, lastAction: './data on host is empty' },
  volume: { fileExists: false, lastAction: 'Named volume empty' },
}

export function StorageLab() {
  const [mode, setMode] = useState<Mode>('ephemeral')
  const [state, setState] = useState(INITIAL)
  const [prediction, setPrediction] = useState<'survives' | 'gone' | null>(null)
  const [checked, setChecked] = useState(false)

  const current = state[mode]
  const survivesReplace = mode !== 'ephemeral'

  function writeFile() {
    setChecked(false)
    setPrediction(null)
    setState((s) => ({
      ...s,
      [mode]: { fileExists: true, lastAction: 'Wrote /data/index.json inside the container' },
    }))
  }

  function replaceContainer() {
    setChecked(false)
    setState((s) => {
      if (mode === 'ephemeral') {
        return {
          ...s,
          ephemeral: { fileExists: false, lastAction: 'Container replaced — writable layer discarded' },
        }
      }
      return {
        ...s,
        [mode]: {
          fileExists: s[mode].fileExists,
          lastAction:
            mode === 'bind'
              ? 'Container replaced — bind mount ./data still has the file'
              : 'Container replaced — named volume still has the file',
        },
      }
    })
  }

  return (
    <div className="dk-page">
      <p className="dk-sim-tag">Browser simulation</p>
      <h1>Storage experiment</h1>
      <p className="dk-muted">
        Create a file, replace the container, and see what survives for ephemeral storage, a bind
        mount, or a named volume.
      </p>

      <div className="dk-row" style={{ marginTop: '1rem' }}>
        {(
          [
            ['ephemeral', 'Container filesystem'],
            ['bind', 'Bind mount'],
            ['volume', 'Named volume'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mode === id ? 'dk-btn' : 'dk-btn soft'}
            onClick={() => {
              setMode(id)
              setPrediction(null)
              setChecked(false)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="dk-card" style={{ marginTop: '0.85rem' }}>
        <p>
          Mode: <strong>{mode}</strong>
        </p>
        <pre className="dk-pre">
          {mode === 'ephemeral'
            ? 'docker run --rm resume-api:dev'
            : mode === 'bind'
              ? 'docker run --rm -v ${PWD}/data:/data resume-api:dev'
              : 'docker run --rm -v rag_index:/data resume-api:dev'}
        </pre>
        <div className="dk-row">
          <button type="button" className="dk-btn" onClick={writeFile}>
            Create /data/index.json
          </button>
          <button type="button" className="dk-btn soft" onClick={replaceContainer}>
            Replace container
          </button>
        </div>
        <p>
          File present?{' '}
          <strong className={current.fileExists ? 'dk-ok' : 'dk-bad'}>
            {current.fileExists ? 'yes' : 'no'}
          </strong>
        </p>
        <p className="dk-muted">{current.lastAction}</p>
      </div>

      <div className="dk-card">
        <p className="dk-kicker">Prediction</p>
        <p>After replace, does the file survive in this mode?</p>
        <div className="dk-row">
          <button type="button" className="dk-btn soft" onClick={() => setPrediction('survives')}>
            Survives
          </button>
          <button type="button" className="dk-btn soft" onClick={() => setPrediction('gone')}>
            Gone
          </button>
          <button
            type="button"
            className="dk-btn"
            disabled={!prediction}
            onClick={() => setChecked(true)}
          >
            Check
          </button>
        </div>
        {checked && prediction ? (
          <p className={prediction === (survivesReplace ? 'survives' : 'gone') ? 'dk-ok' : 'dk-bad'}>
            {prediction === (survivesReplace ? 'survives' : 'gone')
              ? 'Correct.'
              : 'Not quite.'}{' '}
            {survivesReplace
              ? 'Bind mounts and named volumes keep data across container replacement.'
              : 'The container writable layer is ephemeral — recreate drops those writes.'}
          </p>
        ) : null}
      </div>

      <div className="dk-lesson-nav">
        <Link to="/docker/m4/mounts-and-volumes">Back to lesson</Link>
        <Link to="/docker/labs/compose-network">Next lab →</Link>
      </div>
    </div>
  )
}
