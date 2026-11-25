import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '@/components/docker/docker.css'

const LOGS = `docker ps -a
CONTAINER ID   IMAGE            STATUS                      PORTS     NAMES
a1b2c3d4e5f6   resume-api:dev   Exited (1) 4 seconds ago              resume-api

docker logs resume-api
INFO:     Started server process [1]
ERROR:    [Errno 98] error while attempting to bind on address ('127.0.0.1', 8000): address already in use
# wait — actually the real issue in this lab is bind address + publish mismatch in compose

docker inspect resume-api --format '{{.State.ExitCode}}'
1`

export function DebugLab() {
  const [host, setHost] = useState('127.0.0.1')
  const [publish, setPublish] = useState('8000:9000')
  const [dbUrl, setDbUrl] = useState('http://localhost:6333')
  const [ran, setRan] = useState(false)

  const issues = useMemo(() => {
    const list: string[] = []
    if (host !== '0.0.0.0') list.push('Uvicorn must bind 0.0.0.0 for published traffic')
    if (publish !== '8000:8000' && !publish.endsWith(':8000'))
      list.push('Right side of ports must be 8000 (app listen port)')
    if (dbUrl.includes('localhost')) list.push('Compose service DNS should use qdrant, not localhost')
    return list
  }, [host, publish, dbUrl])

  const fixed = issues.length === 0

  return (
    <div className="dk-page">
      <p className="dk-sim-tag">Browser simulation</p>
      <h1>Debugging lab</h1>
      <p className="dk-muted">
        Inspect the simulated terminal output, edit the broken configuration, and run the check.
      </p>

      <div className="dk-card" style={{ marginTop: '1rem' }}>
        <p className="dk-kicker">Simulated terminal</p>
        <pre className="dk-pre">{LOGS}</pre>
        <p>
          Hypothesis: the process may start, but networking/config still blocks host access and DB
          calls. Fix the three fields below.
        </p>
      </div>

      <div className="dk-card">
        <label>
          Uvicorn --host
          <select
            value={host}
            onChange={(e) => {
              setHost(e.target.value)
              setRan(false)
            }}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8 }}
          >
            <option value="127.0.0.1">127.0.0.1</option>
            <option value="0.0.0.0">0.0.0.0</option>
          </select>
        </label>
        <label style={{ display: 'block', marginTop: '0.75rem' }}>
          Compose ports
          <select
            value={publish}
            onChange={(e) => {
              setPublish(e.target.value)
              setRan(false)
            }}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8 }}
          >
            <option value="8000:9000">8000:9000</option>
            <option value="8001:8000">8001:8000</option>
            <option value="8000:8000">8000:8000</option>
          </select>
        </label>
        <label style={{ display: 'block', marginTop: '0.75rem' }}>
          QDRANT_URL
          <select
            value={dbUrl}
            onChange={(e) => {
              setDbUrl(e.target.value)
              setRan(false)
            }}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8 }}
          >
            <option value="http://localhost:6333">http://localhost:6333</option>
            <option value="http://qdrant:6333">http://qdrant:6333</option>
          </select>
        </label>
        <div className="dk-row">
          <button type="button" className="dk-btn" onClick={() => setRan(true)}>
            Run verification check
          </button>
        </div>
        {ran ? (
          fixed ? (
            <p className="dk-ok">
              Pass. curl /health succeeds, and the API can resolve qdrant over the Compose network.
            </p>
          ) : (
            <div>
              <p className="dk-bad">Check failed. Still broken:</p>
              <ul>
                {issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )
        ) : null}
      </div>

      <div className="dk-lesson-nav">
        <Link to="/docker/m7/debug-loop">Back to lesson</Link>
        <Link to="/docker/capstone">Capstone →</Link>
      </div>
    </div>
  )
}
