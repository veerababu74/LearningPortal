import { useMemo, useState } from 'react'
import { Check, PgHeader, Range, Stat, useReveal } from './common'

type Step = { tool: string; args: string; result: string }
type Scenario = { label: string; question: string; tools: string[]; plan: Step[]; answer: string }

const SCENARIOS: Record<string, Scenario> = {
  weather: {
    label: 'Weather in °F',
    question: 'What is the weather in Paris, in Fahrenheit?',
    tools: ['get_weather', 'calculator', 'web_search'],
    plan: [
      { tool: 'get_weather', args: 'city="Paris"', result: '18 °C, cloudy' },
      { tool: 'calculator', args: '"18*9/5+32"', result: '64.4' },
    ],
    answer: 'It is 64.4 °F and cloudy in Paris.',
  },
  refund: {
    label: 'Refund an order',
    question: 'Refund order A-1009 and email the customer.',
    tools: ['get_order', 'issue_refund', 'send_email'],
    plan: [
      { tool: 'get_order', args: 'id="A-1009"', result: '{paid: 120, status: "delivered"}' },
      { tool: 'issue_refund', args: 'id="A-1009", amount=120', result: '{refund_id: "R-77"}' },
      { tool: 'send_email', args: 'to=customer, template="refund"', result: 'sent' },
    ],
    answer: 'Refunded $120 (R-77) and emailed the customer.',
  },
  research: {
    label: 'Revenue vs market',
    question: 'Compare our Q3 revenue growth with the market.',
    tools: ['run_sql', 'web_search', 'calculator'],
    plan: [
      { tool: 'run_sql', args: '"SELECT … WHERE quarter=3"', result: '$4.2M, +8% QoQ' },
      { tool: 'web_search', args: '"Q3 market growth"', result: 'market grew 3%' },
    ],
    answer: 'Q3 revenue grew 8% to $4.2M, beating the 3% market growth.',
  },
}

type Ev = { kind: 'llm' | 'tool' | 'guard' | 'bad' | 'done'; label: string; meta: string }
type Config = {
  scenario: Scenario
  enabled: Set<string>
  maxSteps: number
  budget: number
  fTimeout: boolean
  fRepeat: boolean
  fError: boolean
  gRetry: boolean
  gRepeat: boolean
}

export function simulate(c: Config) {
  const ev: Ev[] = []
  let llmCalls = 0
  let toolCalls = 0
  let tokens = 0
  let cost = 0
  let ms = 0
  let obs = 0
  let i = 0
  let repeatCount = 0
  let repeatResolved = false
  let timedOut = false
  let errored = false
  let status: { tone: 'ok' | 'bad' | 'warn'; title: string; why: string } = { tone: 'ok', title: '', why: '' }
  const plan = c.scenario.plan

  const llm = (label: string) => {
    llmCalls++
    const inTok = 500 + 220 * obs + 120 * c.enabled.size
    tokens += inTok + 80
    const callCost = inTok * 3e-6 + 80 * 15e-6
    cost += callCost
    ms += 900
    ev.push({ kind: 'llm', label, meta: `${inTok} tok · $${callCost.toFixed(4)}` })
  }
  const tool = (label: string, took: number, kind: Ev['kind'] = 'tool') => {
    toolCalls++
    ms += took
    ev.push({ kind, label, meta: `${took} ms` })
  }

  for (let guard = 0; guard < 60; guard++) {
    if (llmCalls >= c.maxSteps) {
      ev.push({ kind: 'bad', label: `Guard: max_steps = ${c.maxSteps} reached — run stopped`, meta: 'stop' })
      status = { tone: 'warn', title: 'Stopped by max_steps', why: 'The loop guard ended the run before the task finished. Without it, this run would keep spending.' }
      break
    }
    if (cost >= c.budget) {
      ev.push({ kind: 'bad', label: `Guard: budget $${c.budget.toFixed(3)} exceeded — run stopped`, meta: 'stop' })
      status = { tone: 'warn', title: 'Stopped by the cost budget', why: 'The token budget guard stopped a run that was not converging.' }
      break
    }
    if (i >= plan.length) {
      llm(`final answer: “${c.scenario.answer}”`)
      ev.push({ kind: 'done', label: 'No tool_calls → loop exits', meta: 'done' })
      status = { tone: 'ok', title: 'Answered', why: 'The model stopped asking for tools, which is the only healthy exit from an agent loop.' }
      break
    }
    const step = plan[i]
    if (!c.enabled.has(step.tool)) {
      llm(`needs ${step.tool}, but it is not in the tool list`)
      ev.push({ kind: 'bad', label: `Model answers with a limitation: “I can't do this without ${step.tool}.”`, meta: 'partial' })
      status = { tone: 'bad', title: 'Could not finish: missing tool', why: `The plan needs ${step.tool}. A good agent says so instead of inventing a result.` }
      break
    }
    // fault: the model keeps repeating its first tool call
    if (c.fRepeat && i === 1 && !repeatResolved) {
      const first = plan[0]
      llm(`tool_call ${first.tool}(${first.args}) — the same call again`)
      repeatCount++
      if (c.gRepeat && repeatCount >= 2) {
        ev.push({ kind: 'guard', label: 'Repeat detector: same tool + args 3× → inject “you already have this result, move on”', meta: 'hint' })
        repeatResolved = true
        continue
      }
      tool(`${first.tool} → ${first.result} (identical result)`, 300)
      obs++
      continue
    }
    llm(`tool_call ${step.tool}(${step.args})`)
    if (c.fTimeout && i === 0 && !timedOut) {
      timedOut = true
      tool(`${step.tool} ✗ timed out after 5 s`, 5000, 'bad')
      if (c.gRetry) {
        ev.push({ kind: 'guard', label: 'Code retry 1/2 with 0.5 s backoff (no LLM call needed)', meta: '+500 ms' })
        ms += 500
        tool(`${step.tool} → ${step.result}`, 300)
        obs++
        i++
      } else {
        obs++
        ev.push({ kind: 'bad', label: 'Error returned to the model — it must decide to try again (extra LLM call)', meta: 'replan' })
      }
      continue
    }
    if (c.fError && i === 1 && !errored) {
      errored = true
      tool(`${step.tool} ✗ 500 Internal Server Error`, 300, 'bad')
      if (c.gRetry) {
        ev.push({ kind: 'guard', label: 'Code retry 1/2 (transient 5xx) — succeeded', meta: '+300 ms' })
        tool(`${step.tool} → ${step.result}`, 300)
        obs++
        i++
      } else {
        obs++
        ev.push({ kind: 'bad', label: 'Error returned to the model — it retries through another LLM call', meta: 'replan' })
      }
      continue
    }
    tool(`${step.tool} → ${step.result}`, 300)
    obs++
    i++
  }
  return { ev, llmCalls, toolCalls, tokens, cost, ms, status }
}

export function AgentPlaygroundLab() {
  const [key, setKey] = useState<keyof typeof SCENARIOS>('weather')
  const scenario = SCENARIOS[key]
  const [disabled, setDisabled] = useState<Set<string>>(new Set())
  const [maxSteps, setMaxSteps] = useState(8)
  const [budget, setBudget] = useState(0.05)
  const [fTimeout, setFTimeout] = useState(false)
  const [fRepeat, setFRepeat] = useState(false)
  const [fError, setFError] = useState(false)
  const [gRetry, setGRetry] = useState(true)
  const [gRepeat, setGRepeat] = useState(true)
  const [runId, setRunId] = useState(0)

  const enabled = useMemo(() => new Set(scenario.tools.filter((t) => !disabled.has(t))), [scenario, disabled])
  const res = useMemo(
    () => simulate({ scenario, enabled, maxSteps, budget, fTimeout, fRepeat, fError, gRetry, gRepeat }),
    [scenario, enabled, maxSteps, budget, fTimeout, fRepeat, fError, gRetry, gRepeat],
  )
  const shown = useReveal(res.ev.length, runId)
  const finished = shown >= res.ev.length

  const insights: string[] = []
  if (fTimeout && !gRetry) insights.push('Without code-level retries, every transient tool failure costs an extra LLM call (more tokens and ~1 s more latency).')
  if (fTimeout && gRetry) insights.push('The retry happened in code with backoff — the model never even saw the timeout.')
  if (fRepeat && !gRepeat) insights.push('The model kept repeating the same call. Only max_steps or the budget stopped it — turn on repeat detection.')
  if (fRepeat && gRepeat) insights.push('Repeat detection hashed (tool, args) and nudged the model after the 3rd identical call.')
  if (res.status.title === 'Could not finish: missing tool') insights.push('Tool availability defines what an agent can do. Re-enable the tool to see the full run.')
  if (!insights.length) insights.push('Turn on a fault (timeout, repeated call, 500 error) and switch guards on and off to compare runs.')

  return (
    <div className="pg">
      <PgHeader kicker="AI agent playground" title="Agent Loop Playground">
        Configure the tools, inject faults and choose the guards, then run the agent loop. Every LLM call, tool call and
        guard decision appears in the timeline with its token cost and latency.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Scenario</h2>
          <div className="pg-row" style={{ marginBottom: '0.6rem' }}>
            {Object.entries(SCENARIOS).map(([k, s]) => (
              <button
                key={k}
                type="button"
                className={k === key ? 'pg-chip on' : 'pg-chip'}
                onClick={() => {
                  setKey(k as keyof typeof SCENARIOS)
                  setDisabled(new Set())
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="pg-note">“{scenario.question}”</p>

          <h3 style={{ marginTop: '0.9rem' }}>Tools available</h3>
          {scenario.tools.map((t) => (
            <Check
              key={t}
              label={t}
              checked={!disabled.has(t)}
              onChange={(v) =>
                setDisabled((d) => {
                  const n = new Set(d)
                  if (v) n.delete(t)
                  else n.add(t)
                  return n
                })
              }
            />
          ))}

          <h3 style={{ marginTop: '0.9rem' }}>Faults</h3>
          <Check label="First tool times out" hint="network blip, 5 s timeout" checked={fTimeout} onChange={setFTimeout} />
          <Check label="Model repeats its first call" hint="classic infinite-loop bug" checked={fRepeat} onChange={setFRepeat} />
          <Check label="Second tool returns 500" hint="transient server error" checked={fError} onChange={setFError} />

          <h3 style={{ marginTop: '0.9rem' }}>Guards</h3>
          <Check label="Retry transient errors in code" hint="max 2, exponential backoff" checked={gRetry} onChange={setGRetry} />
          <Check label="Repeat detection" hint="hash (tool, args); hint after 3 repeats" checked={gRepeat} onChange={setGRepeat} />
          <Range label="max_steps (LLM calls)" value={maxSteps} min={1} max={12} onChange={setMaxSteps} />
          <Range label="Cost budget" value={budget} min={0.005} max={0.08} step={0.005} onChange={setBudget} fmt={(v) => `$${v.toFixed(3)}`} />
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <div className="pg-row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Run timeline</h2>
              <button type="button" className="pg-btn" onClick={() => setRunId((n) => n + 1)}>
                ▶ Run agent
              </button>
            </div>
            <p className="pg-note">Results update live as you change settings; press Run to replay them step by step.</p>
            <ol className="pg-timeline" style={{ marginTop: '0.7rem' }}>
              {res.ev.slice(0, shown).map((e, idx) => (
                <li key={`${runId}-${idx}`} className={e.kind}>
                  <span className="n">{idx + 1}</span>
                  <span className="k">{e.kind === 'llm' ? 'LLM' : e.kind === 'tool' ? 'TOOL' : e.kind === 'guard' ? 'GUARD' : e.kind === 'done' ? 'DONE' : 'FAIL'}</span>
                  <span>{e.label}</span>
                  <span className="pg-tl-meta">{e.meta}</span>
                </li>
              ))}
            </ol>
          </div>

          {finished ? (
            <>
              <div className={`pg-banner ${res.status.tone}`}>
                {res.status.title}
                <p>{res.status.why}</p>
              </div>
              <div className="pg-stats">
                <Stat label="LLM calls" value={res.llmCalls} />
                <Stat label="Tool calls" value={res.toolCalls} />
                <Stat label="Tokens" value={res.tokens.toLocaleString()} />
                <Stat label="Cost" value={`$${res.cost.toFixed(4)}`} tone={res.cost > budget * 0.8 ? 'warn' : undefined} />
                <Stat label="Latency" value={`${(res.ms / 1000).toFixed(1)} s`} tone={res.ms > 8000 ? 'warn' : undefined} />
              </div>
              <div className="pg-card">
                <h3>What this run teaches</h3>
                <ul className="pg-insights">
                  {insights.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                  <li>Each LLM call re-sends the whole history, so input tokens grow with every observation ({res.llmCalls} calls here).</li>
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
