import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '@/components/docker/docker.css'

const INSTRUCTIONS = [
  { line: 'FROM python:3.12-slim', layer: 'base', note: 'Base OS + Python. Rarely changes.' },
  { line: 'WORKDIR /app', layer: 'workdir', note: 'Sets the working directory for later steps.' },
  { line: 'COPY requirements.txt .', layer: 'reqs-copy', note: 'Only dependency manifest.' },
  {
    line: 'RUN pip install -r requirements.txt',
    layer: 'pip',
    note: 'Heavy layer. Reused when requirements.txt is unchanged.',
  },
  { line: 'COPY app ./app', layer: 'app', note: 'Application source. Changes often.' },
  {
    line: 'CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]',
    layer: 'cmd',
    note: 'Metadata for the start command (tiny layer).',
  },
]

type EditTarget = 'none' | 'app.py' | 'requirements.txt'

export function LayerExplorerLab() {
  const [selected, setSelected] = useState(0)
  const [edit, setEdit] = useState<EditTarget>('none')

  const invalidated = useMemo(() => {
    if (edit === 'none') return new Set<number>()
    if (edit === 'requirements.txt') return new Set([2, 3, 4, 5])
    return new Set([4, 5])
  }, [edit])

  const current = INSTRUCTIONS[selected]

  return (
    <div className="dk-page">
      <p className="dk-sim-tag">Browser simulation</p>
      <h1>Image layer explorer</h1>
      <p className="dk-muted">
        Click a Dockerfile instruction. Then simulate editing <code>app.py</code> vs{' '}
        <code>requirements.txt</code> and see which layers rebuild.
      </p>

      <div className="dk-card" style={{ marginTop: '1rem' }}>
        <p className="dk-kicker">Simulate a file change</p>
        <div className="dk-row">
          {(
            [
              ['none', 'No change'],
              ['app.py', 'Edit app.py'],
              ['requirements.txt', 'Edit requirements.txt'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={edit === id ? 'dk-btn' : 'dk-btn soft'}
              onClick={() => setEdit(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p>
          {edit === 'none'
            ? 'All layers can be reused from cache.'
            : edit === 'app.py'
              ? 'Only COPY app and later layers rebuild. pip install stays cached.'
              : 'requirements.txt copy + pip install + everything after rebuild.'}
        </p>
      </div>

      <div className="dk-grid" style={{ marginTop: '0.85rem' }}>
        {INSTRUCTIONS.map((ins, idx) => {
          const rebuild = invalidated.has(idx)
          return (
            <button
              key={ins.line}
              type="button"
              className={selected === idx ? 'dk-card' : 'dk-card'}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: selected === idx ? 'var(--focus-mid)' : undefined,
                background: rebuild ? 'var(--reward-tint)' : undefined,
              }}
              onClick={() => setSelected(idx)}
            >
              <code>{ins.line}</code>
              <p className="dk-muted" style={{ margin: '0.35rem 0 0' }}>
                Layer: {ins.layer}
                {rebuild ? ' · will rebuild' : edit !== 'none' ? ' · cache hit' : ''}
              </p>
            </button>
          )
        })}
      </div>

      <div className="dk-flow" style={{ marginTop: '1rem' }}>
        <h3>{current.line}</h3>
        <p>{current.note}</p>
      </div>

      <div className="dk-lesson-nav">
        <Link to="/docker/m3/layer-caching">Back to lesson</Link>
        <Link to="/docker/labs/port-visualizer">Next lab →</Link>
      </div>
    </div>
  )
}
