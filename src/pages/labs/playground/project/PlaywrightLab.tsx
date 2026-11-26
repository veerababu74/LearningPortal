import { useMemo, useState } from 'react'
import { Check, PgHeader, Range, Stat } from '../common'

type LocatorChoice = {
  id: string
  label: string
  code: string
  resilience: number
  reason: string
}

const LOCATORS: LocatorChoice[] = [
  { id: 'role', label: 'getByRole (Recommended)', code: `page.getByRole("button", { name: "Run Evaluation" })`, resilience: 98, reason: 'Queries the Accessibility Tree — verifies both visibility and screen-reader semantics, surviving wrapper div refactors.' },
  { id: 'testid', label: 'getByTestId', code: `page.getByTestId("run-eval-btn")`, resilience: 90, reason: 'Immune to copy changes and layout tweaks when explicit data-testid attributes are owned by QA/FE.' },
  { id: 'css', label: 'Fragile CSS Chain', code: `page.locator("div.card > div:nth-child(2) > button.btn-primary")`, resilience: 25, reason: 'Breaks immediately if a developer adds a wrapper div, changes utility classes, or reorders cards.' },
  { id: 'xpath', label: 'Absolute XPath', code: `page.locator("//html/body/main/section[2]/div/button[1]")`, resilience: 10, reason: 'Most brittle selector possible — virtually any DOM change invalidates the positional path.' },
]

export function PlaywrightLab() {
  const [tab, setTab] = useState<'locator' | 'route'>('locator')
  const [locId, setLocId] = useState('role')
  const [domRefactored, setDomRefactored] = useState(false)
  const [spinnerOverlay, setSpinnerOverlay] = useState(true)
  const [disabledBtn, setDisabledBtn] = useState(false)

  // Route mock & framework designer
  const [routeMode, setRouteMode] = useState<'200' | '429' | '503' | 'slow'>('429')
  const [workers, setWorkers] = useState(4)
  const [useStorageState, setUseStorageState] = useState(true)
  const [traceOnRetry, setTraceOnRetry] = useState(true)

  const loc = LOCATORS.find((l) => l.id === locId) || LOCATORS[0]
  const survivesRefactor = loc.id === 'role' || loc.id === 'testid' || !domRefactored

  const actionChecks = [
    { name: '1. Attached to DOM', ok: survivesRefactor },
    { name: '2. Visible (non-zero box)', ok: survivesRefactor },
    { name: '3. Stable (not animating)', ok: survivesRefactor },
    { name: '4. Receives Pointer Events', ok: survivesRefactor && !spinnerOverlay },
    { name: '5. Enabled (not disabled)', ok: survivesRefactor && !disabledBtn },
  ]
  const ready = actionChecks.every((c) => c.ok)

  const mockSummary = useMemo(() => {
    if (routeMode === '200') return { status: 200, tokens: 0, msg: 'Fulfilled immediately from deterministic JSON fixture (0 LLM cost).' }
    if (routeMode === '429') return { status: 429, tokens: 0, msg: 'First call mocked with 429 Retry-After -> verifies UI backoff & retry -> second call succeeds!' }
    if (routeMode === '503') return { status: 503, tokens: 0, msg: 'Injected 503 outage -> verifies fallback banner renders gracefully with correlation ID.' }
    return { status: 408, tokens: 0, msg: 'Delayed 4000ms -> verifies AbortController cancel button & loading state.' }
  }, [routeMode])

  return (
    <div className="pg">
      <PgHeader kicker="VeeraProject Lab · PW-1 to PW-9" title="Playwright Locator, Actionability & Route Mock Lab">
        Test how semantic locators survive DOM refactors, inspect Playwright’s 5 automatic actionability checks, and
        simulate <code>page.route()</code> AI failure injection and parallel CI worker sizing.
      </PgHeader>

      <div className="pg-row" style={{ marginBottom: '1rem' }}>
        <button type="button" className={tab === 'locator' ? 'pg-chip on' : 'pg-chip'} onClick={() => setTab('locator')}>
          1. Locators & 5-Check Auto-Wait
        </button>
        <button type="button" className={tab === 'route' ? 'pg-chip on' : 'pg-chip'} onClick={() => setTab('route')}>
          2. page.route() Mock & CI Designer
        </button>
      </div>

      {tab === 'locator' ? (
        <div className="pg-grid">
          <div className="pg-card">
            <h2>Selector & DOM Conditions</h2>
            <div className="pg-row" style={{ marginBottom: '0.65rem' }}>
              {LOCATORS.map((l) => (
                <button key={l.id} type="button" className={locId === l.id ? 'pg-chip on' : 'pg-chip'} onClick={() => setLocId(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
            <pre className="pg-code">{loc.code}</pre>
            <p className="pg-note" style={{ marginTop: '0.5rem' }}>{loc.reason}</p>
            <Check label="Simulate UI layout refactor (extra wrapper <div>)" checked={domRefactored} onChange={setDomRefactored} />
            <Check label="Spinner overlay covering button (blocks pointer events)" checked={spinnerOverlay} onChange={setSpinnerOverlay} />
            <Check label="Button has disabled={true}" checked={disabledBtn} onChange={setDisabledBtn} />
          </div>

          <div className="pg-stack">
            <div className="pg-stats">
              <Stat label="Selector Resilience" value={`${loc.resilience}%`} tone={loc.resilience >= 85 ? 'ok' : 'bad'} />
              <Stat label="click() Decision" value={ready ? 'EXECUTES CLICK' : 'AUTO-WAITING'} tone={ready ? 'ok' : 'warn'} />
            </div>
            <div className="pg-card">
              <h2>Playwright 5-Step Actionability Matrix</h2>
              <ul className="pg-list">
                {actionChecks.map((c) => (
                  <li key={c.name} className={c.ok ? 'ok' : 'bad'}>
                    {c.name}: {c.ok ? 'PASS' : 'BLOCKED (Playwright keeps polling until timeout)'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="pg-grid">
          <div className="pg-card">
            <h2>page.route("**/v1/chat") Interceptor + CI Designer</h2>
            <div className="pg-row" style={{ marginBottom: '0.65rem' }}>
              {(['200', '429', '503', 'slow'] as const).map((m) => (
                <button key={m} type="button" className={routeMode === m ? 'pg-chip on' : 'pg-chip'} onClick={() => setRouteMode(m)}>
                  Mock {m === 'slow' ? '4s Slow' : `HTTP ${m}`}
                </button>
              ))}
            </div>
            <Range label="Parallel Playwright Workers" value={workers} min={1} max={12} onChange={setWorkers} />
            <Check label="Reuse storageState auth fixture (skip repeated UI logins)" checked={useStorageState} onChange={setUseStorageState} />
            <Check label="Capture Trace Viewer ZIP on first retry" checked={traceOnRetry} onChange={setTraceOnRetry} />
          </div>

          <div className="pg-stack">
            <div className="pg-stats">
              <Stat label="Live LLM Cost" value="$0.00 (mocked)" tone="ok" />
              <Stat label="40-Test Suite Est." value={`${Math.round((40 * (useStorageState ? 2.5 : 6.5)) / workers)}s`} tone={useStorageState ? 'ok' : 'warn'} />
            </div>
            <div className="pg-card">
              <h2>Interception & Framework Diagnostics</h2>
              <p className="pg-note">{mockSummary.msg}</p>
              <pre className="pg-code">{`await page.route("**/v1/chat", route => route.fulfill({\n  status: ${mockSummary.status},\n  contentType: "application/json",\n  body: JSON.stringify({ status: ${mockSummary.status} })\n}));`}</pre>
              <p className="pg-note" style={{ marginTop: '0.5rem' }}>
                {traceOnRetry
                  ? 'Trace on-first-retry keeps passing runs fast while saving full DOM snapshots + network waterfall for flaky debug.'
                  : 'Warning: Without traces on retry, CI failures are far harder to diagnose.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
