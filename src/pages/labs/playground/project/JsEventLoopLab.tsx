import { useState } from 'react'
import { Check, PgHeader, Range, Stat } from '../common'

type TraceFrame = {
  line: string
  stack: string[]
  micro: string[]
  macro: string[]
  out: string[]
  note: string
}

const SCENARIOS: Record<string, { title: string; code: string; frames: TraceFrame[] }> = {
  microVsMacro: {
    title: 'Sync vs Microtask (Promise/await) vs Macrotask (setTimeout)',
    code: `console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
(async () => {
  console.log("4");
  await null;
  console.log("5");
})();
console.log("6");`,
    frames: [
      { line: 'console.log("1")', stack: ['main()', 'log("1")'], micro: [], macro: [], out: ['1'], note: 'Synchronous code runs immediately on the Call Stack.' },
      { line: 'setTimeout(..., 0)', stack: ['main()', 'setTimeout'], micro: [], macro: ['cb("2")'], out: ['1'], note: 'setTimeout hands callback to host timer; when ready it enters the Macrotask Queue.' },
      { line: 'Promise.resolve().then(...)', stack: ['main()', '.then'], micro: ['cb("3")'], macro: ['cb("2")'], out: ['1'], note: 'Resolved promise pushes callback to the high-priority Microtask Queue.' },
      { line: 'async () => log("4"); await null', stack: ['main()', 'asyncFn'], micro: ['cb("3")', 'resume("5")'], macro: ['cb("2")'], out: ['1', '4'], note: 'Code BEFORE await runs synchronously ("4"); await suspends and queues continuation ("5") into Microtasks.' },
      { line: 'console.log("6")', stack: ['main()'], micro: ['cb("3")', 'resume("5")'], macro: ['cb("2")'], out: ['1', '4', '6'], note: 'Remaining synchronous code logs "6". Call stack is about to empty.' },
      { line: 'Microtask #1: log("3")', stack: ['cb("3")'], micro: ['resume("5")'], macro: ['cb("2")'], out: ['1', '4', '6', '3'], note: 'Call Stack is empty → Event Loop drains Microtasks FIRST.' },
      { line: 'Microtask #2: log("5")', stack: ['resume("5")'], micro: [], macro: ['cb("2")'], out: ['1', '4', '6', '3', '5'], note: 'All microtasks must drain completely before ANY macrotask executes.' },
      { line: 'Macrotask #1: log("2")', stack: ['cb("2")'], micro: [], macro: [], out: ['1', '4', '6', '3', '5', '2'], note: 'Only now does setTimeout run and print "2"!' },
    ],
  },
  combinators: {
    title: 'Promise.all vs Promise.allSettled with Multi-Agent Rejection',
    code: `const agents = [
  ok("retriever", 120),
  fail("critic", 200),
  ok("writer", 350),
];
// Compare Promise.all vs Promise.allSettled!`,
    frames: [
      { line: 'Start 3 parallel LLM agents', stack: ['Promise.all(...)'], micro: [], macro: ['retriever@120ms', 'critic@200ms', 'writer@350ms'], out: ['3 requests in flight'], note: 'All three async network requests begin concurrently on Host I/O.' },
      { line: '120ms: retriever resolves', stack: [], micro: ['retriever ok'], macro: ['critic@200ms', 'writer@350ms'], out: ['retriever: OK (120ms)'], note: 'Both Promise.all and allSettled record retriever result and keep waiting.' },
      { line: '200ms: critic rejects!', stack: [], micro: ['critic Error'], macro: ['writer@350ms'], out: ['retriever: OK', 'critic: REJECTED'], note: 'Promise.all IMMEDIATELY rejects at 200ms (even though writer is still running on network!). Promise.allSettled waits for writer.' },
      { line: '350ms: writer finishes', stack: [], micro: ['writer ok'], macro: [], out: ['allSettled → [fulfilled, rejected, fulfilled]'], note: 'With Promise.all you need AbortController to cancel writer; with allSettled you inspect partial agent results cleanly.' },
    ],
  },
}

export function JsEventLoopLab() {
  const [tab, setTab] = useState<'loop' | 'closure'>('loop')
  const [scenario, setScenario] = useState<'microVsMacro' | 'combinators'>('microVsMacro')
  const [stepIdx, setStepIdx] = useState(0)

  // Closure & Config mutation lab state
  const [decl, setDecl] = useState<'var' | 'let'>('var')
  const [loopCount, setLoopCount] = useState(3)
  const [immutableCopy, setImmutableCopy] = useState(false)
  const [overrideTemp, setOverrideTemp] = useState(0.9)

  const cur = SCENARIOS[scenario]
  const frame = cur.frames[Math.min(stepIdx, cur.frames.length - 1)]

  const closureOutput = Array.from({ length: loopCount }, (_, i) => (decl === 'var' ? loopCount : i))
  const agentATemp = immutableCopy ? 0.2 : overrideTemp

  return (
    <div className="pg">
      <PgHeader kicker="VeeraProject Lab · JS-1 & JS-2" title="JS Event Loop & Closure / Config Lab">
        Step through the Call Stack, Microtask Queue, and Macrotask Queue interactively — then test <code>var</code> vs{' '}
        <code>let</code> loop closures and shared object mutation bugs.
      </PgHeader>

      <div className="pg-row" style={{ marginBottom: '1rem' }}>
        <button type="button" className={tab === 'loop' ? 'pg-chip on' : 'pg-chip'} onClick={() => setTab('loop')}>
          1. Event Loop Step Tracer
        </button>
        <button type="button" className={tab === 'closure' ? 'pg-chip on' : 'pg-chip'} onClick={() => setTab('closure')}>
          2. Closures & Shared Config Bug
        </button>
      </div>

      {tab === 'loop' ? (
        <div className="pg-grid">
          <div className="pg-card">
            <h2>Scenario & Controls</h2>
            <div className="pg-row" style={{ marginBottom: '0.75rem' }}>
              <button
                type="button"
                className={scenario === 'microVsMacro' ? 'pg-chip on' : 'pg-chip'}
                onClick={() => { setScenario('microVsMacro'); setStepIdx(0) }}
              >
                Microtasks vs setTimeout
              </button>
              <button
                type="button"
                className={scenario === 'combinators' ? 'pg-chip on' : 'pg-chip'}
                onClick={() => { setScenario('combinators'); setStepIdx(0) }}
              >
                Promise.all vs allSettled
              </button>
            </div>
            <pre className="pg-code">{cur.code}</pre>
            <div className="pg-row" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="pg-btn soft" onClick={() => setStepIdx((s) => Math.max(0, s - 1))} disabled={stepIdx === 0}>
                ← Prev
              </button>
              <button
                type="button"
                className="pg-btn"
                onClick={() => setStepIdx((s) => Math.min(cur.frames.length - 1, s + 1))}
                disabled={stepIdx >= cur.frames.length - 1}
              >
                Next step →
              </button>
              <button type="button" className="pg-btn soft" onClick={() => setStepIdx(0)}>
                Reset
              </button>
            </div>
            <p className="pg-note" style={{ marginTop: '0.75rem' }}>
              <strong>Step {stepIdx + 1}/{cur.frames.length}:</strong> {frame.note}
            </p>
          </div>

          <div className="pg-stack">
            <div className="pg-stats">
              <Stat label="Running Line" value={frame.line} />
              <Stat label="Call Stack" value={frame.stack.length ? frame.stack.join(' → ') : '(empty)'} />
            </div>
            <div className="pg-card">
              <h2>Queues & Console State</h2>
              <div className="pg-table-wrap">
                <table className="pg-table">
                  <thead>
                    <tr>
                      <th>Microtask Queue (Priority 1)</th>
                      <th>Macrotask Queue (Priority 2)</th>
                      <th>Console Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{frame.micro.length ? frame.micro.join(', ') : '(empty)'}</td>
                      <td>{frame.macro.length ? frame.macro.join(', ') : '(empty)'}</td>
                      <td><code>{JSON.stringify(frame.out)}</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pg-grid">
          <div className="pg-card">
            <h2>1. Loop Closure Inspector</h2>
            <div className="pg-row" style={{ marginBottom: '0.6rem' }}>
              <button type="button" className={decl === 'var' ? 'pg-chip on' : 'pg-chip'} onClick={() => setDecl('var')}>
                Use var (function scope)
              </button>
              <button type="button" className={decl === 'let' ? 'pg-chip on' : 'pg-chip'} onClick={() => setDecl('let')}>
                Use let (block scope)
              </button>
            </div>
            <Range label="Loop iterations" value={loopCount} min={2} max={6} onChange={setLoopCount} />
            <pre className="pg-code">{`for (${decl} i = 0; i < ${loopCount}; i++) {\n  setTimeout(() => log(i), 0);\n}`}</pre>
            <div className="pg-stats" style={{ marginTop: '0.7rem' }}>
              <Stat
                label="Actual timer output"
                value={JSON.stringify(closureOutput)}
                tone={decl === 'var' ? 'bad' : 'ok'}
              />
            </div>
            <p className="pg-note">
              {decl === 'var'
                ? 'Bug: Every callback shares ONE hoisted function-scoped variable that already reached ' + loopCount + '.'
                : 'Fixed: `let` creates a fresh block binding per iteration, capturing 0, 1, 2...'}
            </p>
          </div>

          <div className="pg-card">
            <h2>2. Shared Agent Config Reference Bug</h2>
            <Check
              label="Clone config immutably ({ ...base, tools: [...base.tools] })"
              hint="Toggle OFF to see reference mutation corrupt Agent A"
              checked={immutableCopy}
              onChange={setImmutableCopy}
            />
            <Range
              label="Agent B temperature override"
              value={overrideTemp}
              min={0}
              max={1}
              step={0.1}
              onChange={setOverrideTemp}
              fmt={(v) => v.toFixed(1)}
            />
            <div className="pg-stats">
              <Stat label="Agent A temperature" value={agentATemp.toFixed(1)} tone={agentATemp === 0.2 ? 'ok' : 'bad'} />
              <Stat label="Agent B temperature" value={overrideTemp.toFixed(1)} />
            </div>
            <pre className="pg-code">
              {immutableCopy
                ? `const agentB = { ...agentA, temperature: ${overrideTemp.toFixed(1)}, tools: [...agentA.tools] };\n// agentA stays safe at 0.2 ✅`
                : `const agentB = agentA; // same heap pointer!\nagentB.temperature = ${overrideTemp.toFixed(1)}; // silently corrupted agentA ❌`}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
