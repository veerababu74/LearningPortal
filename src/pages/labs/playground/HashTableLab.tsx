import { useState } from 'react'
import { PgHeader, Stat, useReveal } from './common'

type Entry = { key: string; hash: number; value: number }
const DUMMY = 'DUMMY' as const
type Slot = Entry | null | typeof DUMMY

/** Toy hash: ints hash to themselves (like CPython); strings use a 32-bit polynomial. */
function toyHash(key: string) {
  if (/^-?\d+$/.test(key)) return Number(key) >>> 0
  let h = 7
  for (const ch of key) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0
  return h
}

/** CPython's probe sequence: i = (5*i + 1 + perturb) & mask, perturb >>= 5. */
function* probes(hash: number, size: number) {
  const mask = size - 1
  let perturb = hash
  let i = hash & mask
  for (let n = 0; n < size * 4; n++) {
    yield i
    perturb >>>= 5
    i = (5 * i + 1 + perturb) & mask
  }
}

type Op = { kind: 'insert' | 'lookup' | 'delete' | 'error'; key: string; path: number[]; final: number | null; result: 'hit' | 'miss' | 'placed' | 'updated' | 'deleted' | 'error'; note: string }

const SAMPLE = ['apple', 'kiwi', 'mango', 'fig', 'pear', 'plum']

export function HashTableLab() {
  const [slots, setSlots] = useState<Slot[]>(() => Array(8).fill(null))
  const [input, setInput] = useState('apple')
  const [op, setOp] = useState<Op | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [runId, setRunId] = useState(0)
  const [counter, setCounter] = useState(1)

  const size = slots.length
  const used = slots.filter((s) => s && s !== DUMMY).length
  const dummies = slots.filter((s) => s === DUMMY).length
  const shown = useReveal(op?.path.length || 0, runId, 380)

  const record = (o: Op, msg: string) => {
    setOp(o)
    setRunId((n) => n + 1)
    setLog((l) => [msg, ...l].slice(0, 12))
  }

  const unhashable = (key: string) => /^\s*[[{]/.test(key)

  function insert(key: string, table = slots, silent = false): Slot[] {
    const h = toyHash(key)
    const path: number[] = []
    let firstDummy: number | null = null
    const next = [...table]
    for (const i of probes(h, next.length)) {
      path.push(i)
      const s = next[i]
      if (s === DUMMY) {
        if (firstDummy === null) firstDummy = i
        continue
      }
      if (s === null) {
        const at = firstDummy ?? i
        next[at] = { key, hash: h, value: counter }
        if (!silent) {
          setCounter((c) => c + 1)
          record(
            { kind: 'insert', key, path, final: at, result: 'placed', note: path.length > 1 ? `${path.length - 1} collision(s) before finding slot ${at}` : `slot ${at} was free` },
            `d["${key}"] = ${counter} → hash ${h} → slot ${at}${path.length > 1 ? ` after ${path.length - 1} probe(s)` : ''}`,
          )
        }
        return next
      }
      if (s.hash === h && s.key === key) {
        next[i] = { ...s, value: counter }
        if (!silent) {
          setCounter((c) => c + 1)
          record({ kind: 'insert', key, path, final: i, result: 'updated', note: 'key already present → value replaced' }, `d["${key}"] updated in slot ${i}`)
        }
        return next
      }
    }
    return next
  }

  function doInsert() {
    const key = input.trim()
    if (!key) return
    if (unhashable(key)) {
      record({ kind: 'error', key, path: [], final: null, result: 'error', note: "TypeError: unhashable type: 'list'" }, `d[${key}] → TypeError: unhashable type`)
      return
    }
    let next = insert(key)
    const live = next.filter((s) => s && s !== DUMMY).length
    const fill = next.filter((s) => s !== null).length
    if (fill * 3 > next.length * 2) {
      // resize: double and re-insert live keys (tombstones disappear)
      const grown: Slot[] = Array(next.length * 2).fill(null)
      for (const s of next) {
        if (!s || s === DUMMY) continue
        for (const i of probes(s.hash, grown.length)) {
          if (grown[i] === null) {
            grown[i] = s
            break
          }
        }
      }
      setLog((l) => [`⤢ table more than 2/3 full (${fill}/${next.length}) → resized to ${grown.length} slots, ${live} keys re-inserted`, ...l].slice(0, 12))
      next = grown
    }
    setSlots(next)
  }

  function doLookup(del = false) {
    const key = input.trim()
    if (!key) return
    if (unhashable(key)) {
      record({ kind: 'error', key, path: [], final: null, result: 'error', note: "TypeError: unhashable type: 'list'" }, `d[${key}] → TypeError`)
      return
    }
    const h = toyHash(key)
    const path: number[] = []
    for (const i of probes(h, size)) {
      path.push(i)
      const s = slots[i]
      if (s === null) {
        record({ kind: del ? 'delete' : 'lookup', key, path, final: i, result: 'miss', note: 'reached an empty slot → KeyError' }, `d["${key}"] → KeyError after ${path.length} probe(s)`)
        return
      }
      if (s !== DUMMY && s.hash === h && s.key === key) {
        if (del) {
          const next = [...slots]
          next[i] = DUMMY
          setSlots(next)
          record({ kind: 'delete', key, path, final: i, result: 'deleted', note: 'slot becomes a DUMMY tombstone so later probe chains are not broken' }, `del d["${key}"] → slot ${i} = DUMMY`)
        } else record({ kind: 'lookup', key, path, final: i, result: 'hit', note: `found after ${path.length} probe(s)` }, `d["${key}"] → ${s.value} (slot ${i}, ${path.length} probe(s))`)
        return
      }
    }
  }

  const probeIdx = op ? op.path.slice(0, shown) : []
  const finished = op && shown >= op.path.length

  return (
    <div className="pg">
      <PgHeader kicker="Python playground" title="Dict Hash Table Playground" python>
        Insert, look up and delete your own keys in a tiny dict. Watch the probe sequence on collisions, the tombstones
        left by deletes, and the resize when the table gets two-thirds full. (Hashes here are a simplified toy; CPython
        randomizes string hashes per process.)
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Operation</h2>
          <label className="pg-field">
            <span>Key</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doInsert()
              }}
            />
          </label>
          <p className="pg-note">
            hash(<code>{input || '…'}</code>) = <code>{unhashable(input) ? 'TypeError' : toyHash(input.trim())}</code> → start slot{' '}
            <code>{unhashable(input) ? '—' : toyHash(input.trim()) & (size - 1)}</code>
          </p>
          <div className="pg-row" style={{ margin: '0.6rem 0' }}>
            <button type="button" className="pg-btn" onClick={doInsert}>
              Insert d[key] = …
            </button>
            <button type="button" className="pg-btn soft" onClick={() => doLookup(false)}>
              Look up
            </button>
            <button type="button" className="pg-btn soft" onClick={() => doLookup(true)}>
              Delete
            </button>
          </div>
          <p className="pg-label">Try</p>
          <div className="pg-row">
            {[...SAMPLE, '8', '16', '[1, 2]'].map((k) => (
              <button key={k} type="button" className="pg-chip" onClick={() => setInput(k)}>
                {k}
              </button>
            ))}
          </div>
          <p className="pg-note">Tip: ints 8 and 16 both start at slot 0 in an 8-slot table — an instant collision.</p>
          <div className="pg-row" style={{ marginTop: '0.7rem' }}>
            <button
              type="button"
              className="pg-chip"
              onClick={() => {
                setSlots(Array(8).fill(null))
                setOp(null)
                setLog([])
                setCounter(1)
              }}
            >
              Reset table
            </button>
          </div>
        </div>

        <div className="pg-stack">
          <div className="pg-stats">
            <Stat label="Slots" value={size} />
            <Stat label="Keys" value={used} />
            <Stat label="Tombstones" value={dummies} tone={dummies ? 'warn' : undefined} />
            <Stat label="Load factor" value={`${Math.round(((used + dummies) / size) * 100)}%`} tone={(used + dummies) / size > 0.6 ? 'warn' : undefined} />
          </div>

          <div className="pg-card">
            <h2>Table</h2>
            <div className="pg-slots">
              {slots.map((s, i) => {
                const order = probeIdx.indexOf(i)
                const isFinal = finished && op?.final === i
                const cls = isFinal ? (op?.result === 'miss' ? 'miss' : 'hit') : order >= 0 ? 'probe' : ''
                return (
                  <div key={i} className={`pg-slot ${s === null ? 'empty' : s === DUMMY ? 'dummy' : ''} ${cls}`}>
                    <div className="idx">
                      slot {i}
                      {order >= 0 ? ` · probe ${order + 1}` : ''}
                    </div>
                    <div className="key">{s === null ? 'empty' : s === DUMMY ? 'DUMMY' : `"${s.key}": ${s.value}`}</div>
                    {s && s !== DUMMY ? <div className="idx">hash {s.hash}</div> : null}
                  </div>
                )
              })}
            </div>
            {op && finished ? (
              <div className={`pg-banner ${op.result === 'error' || op.result === 'miss' ? 'bad' : op.path.length > 1 ? 'warn' : 'ok'}`} style={{ marginTop: '0.8rem' }}>
                {op.kind} “{op.key}”: {op.result}
                <p>{op.note}</p>
              </div>
            ) : null}
          </div>

          <div className="pg-card">
            <h3>Operation log</h3>
            {log.length ? (
              <ol className="pg-insights">
                {log.map((l, i) => (
                  <li key={i}>
                    <code>{l}</code>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="pg-note">Insert the six sample fruits — the sixth insert pushes the table past 2/3 full and triggers a resize to 16 slots.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
