import { useMemo, useState } from 'react'
import { PgHeader } from './common'

type Tool = { name: string; desc: string; params: string }

const VAGUE: Tool[] = [
  { name: 'search', desc: 'Searches things.', params: 'query: str' },
  { name: 'get_data', desc: 'Gets data.', params: 'id: str' },
  { name: 'process', desc: 'Processes a request.', params: 'id: str, amount: float' },
  { name: 'notify', desc: 'Sends something.', params: 'to: str, body: str' },
]

const CLEAR: Tool[] = [
  {
    name: 'search_help_center',
    desc: 'Search help-center articles about policies, shipping times, returns rules and how-to guides. Use for general questions, not for a specific order.',
    params: 'query: str',
  },
  {
    name: 'get_order_status',
    desc: 'Look up one order by its order id (like A-1009): status, delivery date, tracking number, amount paid.',
    params: 'order_id: str',
  },
  {
    name: 'issue_refund',
    desc: 'Refund money for a specific order id. Use only when the customer asks for a refund or money back.',
    params: 'order_id: str, amount: float',
  },
  {
    name: 'send_customer_email',
    desc: 'Send an email message to the customer, for confirmations or follow-ups.',
    params: 'to: str, subject: str, body: str',
  },
]

const QUERIES = [
  'Where is my order A-1009? It has not arrived.',
  'I want my money back for order A-2231',
  'What is your return policy for shoes?',
  'Please email me a confirmation',
  'refund the damaged headphones',
]

const STOP = new Set('a an the is are my me i you your for of to it its and or not do does has have with what where when how please can this that on in by be as at from like use only one'.split(' '))
const SYN: Record<string, string> = {
  money: 'refund', back: 'refund', refunds: 'refund', reimburse: 'refund',
  arrived: 'delivery', arrive: 'delivery', delivered: 'delivery', shipping: 'delivery', where: 'status', track: 'tracking',
  policy: 'policies', rules: 'policies', returns: 'return',
  mail: 'email', emailed: 'email', confirmation: 'confirmations',
  orders: 'order',
}

function terms(text: string) {
  return text
    .toLowerCase()
    .replace(/[a-z]-\d+/g, ' orderid ')
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (SYN[w] || w).replace(/(ing|ed|s)$/, ''))
}

function score(query: string, tool: Tool) {
  const q = terms(query)
  const nameT = new Set(terms(tool.name.replace(/_/g, ' ')))
  const descT = new Set(terms(tool.desc))
  if (/order id/i.test(tool.desc) || /order_id/.test(tool.params)) descT.add('orderid')
  let s = 0.2
  const hits: string[] = []
  for (const w of q) {
    if (nameT.has(w)) {
      s += 2
      hits.push(w)
    } else if (descT.has(w)) {
      s += 1
      hits.push(w)
    }
  }
  return { s, hits: [...new Set(hits)] }
}

export function ToolSelectionLab() {
  const [tools, setTools] = useState<Tool[]>(VAGUE)
  const [query, setQuery] = useState(QUERIES[0])

  const ranked = useMemo(() => {
    const raw = tools.map((t) => ({ t, ...score(query, t) }))
    const exp = raw.map((r) => Math.exp(r.s))
    const sum = exp.reduce((a, b) => a + b, 0)
    return raw.map((r, i) => ({ ...r, p: exp[i] / sum })).sort((a, b) => b.p - a.p)
  }, [tools, query])

  const top = ranked[0]
  const second = ranked[1]
  const ambiguous = top && second && top.p - second.p < 0.15
  const confident = top && top.p >= 0.6

  return (
    <div className="pg">
      <PgHeader kicker="AI agent playground" title="Tool Selection Lab">
        The model chooses a tool by reading names and descriptions. Edit them, type a request, and watch how
        confident the choice is. Start with the vague set, then load the clear set and compare.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Tool definitions</h2>
          <div className="pg-row" style={{ marginBottom: '0.7rem' }}>
            <button type="button" className={tools === VAGUE ? 'pg-chip on' : 'pg-chip'} onClick={() => setTools(VAGUE)}>
              Vague descriptions
            </button>
            <button type="button" className={tools === CLEAR ? 'pg-chip on' : 'pg-chip'} onClick={() => setTools(CLEAR)}>
              Clear descriptions
            </button>
          </div>
          {tools.map((t, i) => (
            <div key={i} className="pg-field">
              <input
                className="pg-input"
                type="text"
                value={t.name}
                aria-label={`Tool ${i + 1} name`}
                onChange={(e) => setTools((ts) => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}
              />
              <textarea
                value={t.desc}
                aria-label={`Tool ${i + 1} description`}
                onChange={(e) => setTools((ts) => ts.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>User request</h2>
            <input className="pg-input" type="text" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="User request" />
            <div className="pg-row" style={{ marginTop: '0.5rem' }}>
              {QUERIES.map((q) => (
                <button key={q} type="button" className={q === query ? 'pg-chip on' : 'pg-chip'} onClick={() => setQuery(q)}>
                  {q.length > 34 ? `${q.slice(0, 33)}…` : q}
                </button>
              ))}
            </div>
          </div>

          <div className="pg-card">
            <h2>How likely is each tool?</h2>
            <div className="pg-bars">
              {ranked.map((r, i) => (
                <div key={r.t.name + i} className={i === 0 ? 'pg-bar top' : 'pg-bar'}>
                  <code>{r.t.name || '(no name)'}</code>
                  <div className="pg-bar-track">
                    <i style={{ width: `${Math.round(r.p * 100)}%` }} />
                  </div>
                  <span>{Math.round(r.p * 100)}%</span>
                </div>
              ))}
            </div>
            <p className="pg-note">
              Matched words for the top tool: {top?.hits.length ? top.hits.map((h) => <code key={h}>{h} </code>) : 'none'}
            </p>
          </div>

          <div className={`pg-banner ${confident && !ambiguous ? 'ok' : ambiguous ? 'bad' : 'warn'}`}>
            {confident && !ambiguous
              ? `Clear choice: ${top.t.name}`
              : ambiguous
                ? `Ambiguous: ${top.t.name} vs ${second.t.name}`
                : `Weak choice: ${top.t.name}`}
            <p>
              {confident && !ambiguous
                ? 'Name and description share the user\'s vocabulary, so the model can pick reliably.'
                : 'When descriptions are vague, several tools look equally plausible and the model guesses — the classic “wrong tool” bug. Say what the tool does, when to use it, and when not to.'}
            </p>
          </div>

          <div className="pg-card">
            <h3>What the model receives for the top tool</h3>
            <pre className="pg-mono">
              {JSON.stringify(
                {
                  type: 'function',
                  function: {
                    name: top?.t.name,
                    description: top?.t.desc,
                    parameters: {
                      type: 'object',
                      properties: Object.fromEntries(
                        (top?.t.params || '').split(',').map((p) => {
                          const [n, ty] = p.split(':').map((x) => x.trim())
                          return [n, { type: ty === 'float' ? 'number' : 'string' }]
                        }),
                      ),
                    },
                  },
                },
                null,
                2,
              )}
            </pre>
            <p className="pg-note">
              This lab approximates selection with word overlap; real models match meaning, but they fail in the same
              way when descriptions are vague or overlapping.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
