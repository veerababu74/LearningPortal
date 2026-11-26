import { useMemo, useState } from 'react'
import { Check, PgHeader, Stat } from '../common'

const PRESETS: Array<{ id: string; label: string; raw: string; explain: string }> = [
  {
    id: 'valid',
    label: 'Valid Tool Call',
    raw: JSON.stringify({ kind: 'search_docs', query: 'JWT RS256 rotation', topK: 5 }, null, 2),
    explain: 'Matches discriminated union `kind === "search_docs"` with integer `topK` in range 1..20.',
  },
  {
    id: 'wrong-type',
    label: 'LLM String-For-Number Bug',
    raw: JSON.stringify({ kind: 'search_docs', query: 'OAuth PKCE', topK: 'five' }, null, 2),
    explain: 'TypeScript types vanish at runtime! Without Zod, `raw.topK + 1` produces `"five1"` or NaN silently.',
  },
  {
    id: 'coercible',
    label: 'String Number ("5")',
    raw: JSON.stringify({ kind: 'search_docs', query: 'BOLA prevention', topK: '5' }, null, 2),
    explain: 'Strict mode rejects `"5"` (string instead of number); Coerce mode converts `"5"` -> 5.',
  },
  {
    id: 'extra-key',
    label: 'Prompt-Injected Extra Field',
    raw: JSON.stringify({ kind: 'search_docs', query: 'pricing', topK: 4, adminOverride: true }, null, 2),
    explain: 'With `.strict()` (`extra="forbid"`), unexpected keys from prompt injection are rejected cleanly.',
  },
  {
    id: 'wrong-union',
    label: 'Unknown Tool / Bad Discriminant',
    raw: JSON.stringify({ kind: 'drop_database', table: 'users' }, null, 2),
    explain: 'Discriminated union only permits registered tool names (`search_docs` | `run_playwright`), stopping rogue calls.',
  },
]

function validatePayload(rawText: string, strictMode: boolean, forbidExtra: boolean) {
  let obj: unknown
  try {
    obj = JSON.parse(rawText)
  } catch (e) {
    return { ok: false, issues: [`SyntaxError: ${e instanceof Error ? e.message : 'Invalid JSON'}`], parsed: null }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { ok: false, issues: ['Root value must be a JSON object'], parsed: null }
  }
  const rec = obj as Record<string, unknown>
  const issues: string[] = []
  if (rec.kind === 'search_docs') {
    const allowed = new Set(['kind', 'query', 'topK'])
    if (forbidExtra) {
      for (const k of Object.keys(rec)) if (!allowed.has(k)) issues.push(`Unrecognized key(s) in strict object: "${k}"`)
    }
    if (typeof rec.query !== 'string' || rec.query.trim().length < 2) {
      issues.push('query: Expected string with length >= 2')
    }
    let topK = rec.topK
    if (!strictMode && typeof topK === 'string' && /^\d+$/.test(topK)) topK = Number(topK)
    if (typeof topK !== 'number' || !Number.isInteger(topK) || topK < 1 || topK > 20) {
      issues.push(`topK: Expected integer 1..20, received ${JSON.stringify(rec.topK)} (${typeof rec.topK})`)
    }
    return {
      ok: issues.length === 0,
      issues,
      parsed: issues.length === 0 ? { kind: 'search_docs', query: rec.query, topK } : null,
    }
  }
  if (rec.kind === 'run_playwright') {
    const allowed = new Set(['kind', 'url', 'headless'])
    if (forbidExtra) {
      for (const k of Object.keys(rec)) if (!allowed.has(k)) issues.push(`Unrecognized key(s) in strict object: "${k}"`)
    }
    if (typeof rec.url !== 'string' || !/^https?:\/\//.test(rec.url)) {
      issues.push('url: Expected valid http/https URL')
    }
    if (typeof rec.headless !== 'boolean') issues.push('headless: Expected boolean')
    return {
      ok: issues.length === 0,
      issues,
      parsed: issues.length === 0 ? { kind: 'run_playwright', url: rec.url, headless: rec.headless } : null,
    }
  }
  issues.push(`kind: Invalid discriminator value "${String(rec.kind)}". Expected "search_docs" | "run_playwright".`)
  return { ok: false, issues, parsed: null }
}

export function TsContractLab() {
  const [presetId, setPresetId] = useState('wrong-type')
  const [jsonText, setJsonText] = useState(PRESETS[1].raw)
  const [strictNumbers, setStrictNumbers] = useState(true)
  const [forbidExtra, setForbidExtra] = useState(true)

  const res = useMemo(() => validatePayload(jsonText, strictNumbers, forbidExtra), [jsonText, strictNumbers, forbidExtra])
  const presetInfo = PRESETS.find((p) => p.id === presetId)

  return (
    <div className="pg">
      <PgHeader kicker="VeeraProject Lab · TS-1 to TS-6" title="TypeScript Compile-Time vs Zod Runtime Contract Lab">
        Test real LLM & API JSON payloads against a strict discriminated-union contract. Toggle strict vs coercion and{' '}
        <code>.strict()</code> (extra forbid) to see why TypeScript alone cannot protect runtime boundaries.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Untrusted LLM / API JSON Input (unknown)</h2>
          <div className="pg-row" style={{ marginBottom: '0.6rem' }}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={presetId === p.id ? 'pg-chip on' : 'pg-chip'}
                onClick={() => {
                  setPresetId(p.id)
                  setJsonText(p.raw)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className="pg-field">
            <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} style={{ minHeight: 165, fontFamily: 'monospace' }} />
          </label>
          <Check label="Strict types (no '5' -> 5 coercion)" checked={strictNumbers} onChange={setStrictNumbers} />
          <Check label="Reject unrecognized extra keys (.strict())" hint="Blocks prompt-injected admin flags" checked={forbidExtra} onChange={setForbidExtra} />
        </div>

        <div className="pg-stack">
          <div className="pg-stats">
            <Stat label="tsc Compile Check" value="PASSED (erased)" />
            <Stat label="Runtime Zod Boundary" value={res.ok ? 'VALIDATED' : 'BLOCKED (422 / Retry)'} tone={res.ok ? 'ok' : 'bad'} />
          </div>
          <div className="pg-card">
            <h2>Validation Result</h2>
            {presetInfo ? <p className="pg-note">{presetInfo.explain}</p> : null}
            {res.ok ? (
              <pre className="pg-code">{JSON.stringify(res.parsed, null, 2)}</pre>
            ) : (
              <ul className="pg-list">
                {res.issues.map((iss, i) => (
                  <li key={i} className="bad">
                    {iss}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
