import { useMemo, useState } from 'react'
import { Check, PgHeader, Range, useReveal } from './common'

type Row = {
  step: number
  nodes: string[]
  update: string
  messages: string[]
  findings: string[]
  report: string
  tone?: 'bad' | 'warn'
}

type Cfg = {
  msgReducer: boolean
  findReducer: boolean
  fanOut: boolean
  loopBug: boolean
  limit: number
  checkpointer: boolean
  secondTurn: boolean
}

export function run(c: Cfg) {
  const rows: Row[] = []
  let messages: string[] = c.checkpointer && c.secondTurn ? ['human: Hi, I am Asha', 'ai: Hello Asha!'] : []
  let findings: string[] = []
  let report = ''
  let error: { title: string; why: string } | null = null
  let step = 0

  const setMsgs = (upd: string[]) => {
    messages = c.msgReducer ? [...messages, ...upd] : upd
  }
  const push = (nodes: string[], update: string, tone?: Row['tone']) =>
    rows.push({ step, nodes, update, messages: [...messages], findings: [...findings], report, tone })
  const tick = () => {
    step++
    if (step > c.limit) {
      error = {
        title: `GraphRecursionError: recursion limit of ${c.limit} reached`,
        why: 'The agent ↔ tools loop never reached a stop condition. The recursion limit is LangGraph\'s built-in loop guard.',
      }
      return false
    }
    return true
  }

  // input is merged through the reducers too
  setMsgs([c.secondTurn ? 'human: Now research Acme for me' : 'human: Research Acme for me'])
  push(['__input__'], '{"messages": [HumanMessage]}', !c.msgReducer && c.checkpointer && c.secondTurn ? 'warn' : undefined)

  if (tick()) {
    setMsgs(['ai: tool_calls=[search("Acme")]'])
    push(['agent'], '{"messages": [AIMessage(tool_calls)]}')
  }
  let loops = 0
  while (!error) {
    if (!tick()) break
    setMsgs([`tool: search result #${loops + 1}`])
    push(['tools'], '{"messages": [ToolMessage]}')
    if (!tick()) break
    if (c.loopBug) {
      loops++
      setMsgs([`ai: tool_calls=[search("Acme")] (again, ×${loops + 1})`])
      push(['agent'], '{"messages": [AIMessage(tool_calls)]}  ← still asking for tools', 'warn')
      continue
    }
    setMsgs(['ai: I have enough, researching details'])
    push(['agent'], '{"messages": [AIMessage]} (no tool_calls → continue)')
    break
  }

  if (!error && tick()) {
    if (c.fanOut) {
      if (!c.findReducer) {
        push(['news', 'financials'], 'both return {"findings": [...]} in the same super-step', 'bad')
        error = {
          title: 'InvalidUpdateError: At key \'findings\': Can receive only one value per step.',
          why: 'Two parallel branches wrote the same key and it has no reducer. Use Annotated[list, operator.add].',
        }
      } else {
        findings = [...findings, 'news: Acme opens Berlin office', 'fin: revenue +12% YoY']
        push(['news', 'financials'], 'both return {"findings": [...]} → merged by operator.add')
      }
    } else {
      findings = c.findReducer ? [...findings, 'news: Acme opens Berlin office', 'fin: revenue +12% YoY'] : ['news: Acme opens Berlin office', 'fin: revenue +12% YoY']
      push(['research'], '{"findings": [news, fin]} (one node, no parallelism)')
    }
  }
  if (!error && tick()) {
    report = `Brief from ${findings.length} findings and ${messages.length} messages`
    push(['report'], '{"report": "…"}')
  }

  const lostHistory = !c.msgReducer
  return { rows, error, lostHistory, steps: step }
}

const NODES = ['__input__', 'agent', 'tools', 'news', 'financials', 'research', 'report']

export function GraphStateLab() {
  const [msgReducer, setMsgReducer] = useState(true)
  const [findReducer, setFindReducer] = useState(true)
  const [fanOut, setFanOut] = useState(true)
  const [loopBug, setLoopBug] = useState(false)
  const [limit, setLimit] = useState(25)
  const [checkpointer, setCheckpointer] = useState(true)
  const [secondTurn, setSecondTurn] = useState(false)
  const [runId, setRunId] = useState(0)

  const res = useMemo(
    () => run({ msgReducer, findReducer, fanOut, loopBug, limit, checkpointer, secondTurn }),
    [msgReducer, findReducer, fanOut, loopBug, limit, checkpointer, secondTurn],
  )
  const shown = useReveal(res.rows.length, runId, 500)
  const done = shown >= res.rows.length
  const active = new Set(res.rows[shown - 1]?.nodes || [])
  const visited = new Set(res.rows.slice(0, shown).flatMap((r) => r.nodes))

  const code = `class State(TypedDict):
    messages: ${msgReducer ? 'Annotated[list[AnyMessage], add_messages]' : 'list[AnyMessage]          # ⚠ no reducer'}
    findings: ${findReducer ? 'Annotated[list[str], operator.add]' : 'list[str]                    # ⚠ no reducer'}
    report: str

builder.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: ${fanOut ? '"fan_out"' : '"research"'}})
builder.add_edge("tools", "agent")
${fanOut ? 'builder.add_edge("fan_out", "news")\nbuilder.add_edge("fan_out", "financials")\nbuilder.add_edge(["news", "financials"], "report")' : 'builder.add_edge("research", "report")'}
graph = builder.compile(${checkpointer ? 'checkpointer=MemorySaver()' : ''})
graph.invoke(inputs, {"configurable": {"thread_id": "t1"}, "recursion_limit": ${limit}})`

  return (
    <div className="pg">
      <PgHeader kicker="AI agent playground" title="LangGraph State & Reducers Lab">
        Flip reducers, parallel branches, a looping-agent bug and the checkpointer, then run the graph. The table shows
        the state after every super-step — and exactly which error LangGraph raises when the design is wrong.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Graph design</h2>
          <Check label="messages uses add_messages" hint="off = every update overwrites the history" checked={msgReducer} onChange={setMsgReducer} />
          <Check label="findings uses operator.add" hint="needed when parallel nodes write it" checked={findReducer} onChange={setFindReducer} />
          <Check label="Parallel fan-out (news ∥ financials)" checked={fanOut} onChange={setFanOut} />
          <Check label="Bug: agent always asks for a tool" hint="the model never stops calling search" checked={loopBug} onChange={setLoopBug} />
          <Range label="recursion_limit" value={limit} min={4} max={30} onChange={setLimit} />
          <h3 style={{ marginTop: '0.8rem' }}>Memory</h3>
          <Check label="Compile with a checkpointer" checked={checkpointer} onChange={setCheckpointer} />
          <Check label="This is the 2nd message on thread t1" hint="first turn was “Hi, I am Asha”" checked={secondTurn} onChange={setSecondTurn} />
          <pre className="pg-mono" style={{ marginTop: '0.7rem', fontSize: '0.72rem' }}>
            {code}
          </pre>
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <div className="pg-row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Execution</h2>
              <button type="button" className="pg-btn" onClick={() => setRunId((n) => n + 1)}>
                ▶ Run graph
              </button>
            </div>
            <div className="pg-nodes" style={{ margin: '0.7rem 0' }}>
              {NODES.filter((n) => (fanOut ? n !== 'research' : n !== 'news' && n !== 'financials')).map((n) => (
                <span
                  key={n}
                  className={`pg-node${active.has(n) ? (done && res.error ? ' bad' : ' on') : visited.has(n) ? ' done' : ''}`}
                >
                  {n}
                </span>
              ))}
            </div>
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Node(s)</th>
                    <th>Returned update</th>
                    <th>State after</th>
                  </tr>
                </thead>
                <tbody>
                  {res.rows.slice(0, shown).map((r, i) => (
                    <tr key={`${runId}-${i}`} className={r.tone || ''}>
                      <td>{r.step}</td>
                      <td>
                        <code>{r.nodes.join(' ∥ ')}</code>
                      </td>
                      <td>
                        <code>{r.update}</code>
                      </td>
                      <td>
                        <code>
                          messages ({r.messages.length}): {r.messages.slice(-2).join(' | ')}
                          {r.findings.length ? `\nfindings: ${r.findings.length}` : ''}
                          {r.report ? `\nreport: ✓` : ''}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {done ? (
            <>
              <div className={`pg-banner ${res.error ? 'bad' : res.lostHistory ? 'warn' : 'ok'}`}>
                {res.error ? res.error.title : res.lostHistory ? 'Finished — but the conversation history was lost' : `Finished in ${res.steps} super-steps`}
                <p>
                  {res.error
                    ? res.error.why
                    : res.lostHistory
                      ? 'Without add_messages each node replaced the whole list, so the report only saw the last message.'
                      : 'Every update was merged by its reducer and the run stayed under the recursion limit.'}
                </p>
              </div>
              <div className="pg-card">
                <h3>Try next</h3>
                <ul className="pg-insights">
                  <li>Turn off <code>operator.add</code> with fan-out on → InvalidUpdateError.</li>
                  <li>Turn on the loop bug and lower recursion_limit → GraphRecursionError.</li>
                  <li>2nd message + checkpointer: history from turn 1 is still there. Turn the checkpointer off → it is gone.</li>
                  <li>Checkpointer on but add_messages off → the new input overwrites the saved history.</li>
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
