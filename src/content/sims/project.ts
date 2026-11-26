/**
 * VeeraProject simulations: step-by-step interactive animations for
 * JavaScript, TypeScript/Zod, Playwright, BDD, Agentic MCP, HTTP/REST, Security, Caching, SSE/Queues & FastAPI/Pydantic V2.
 */
import type { AgentSim } from '@/content/agents/visualizer'

export const PROJECT_SIMS: AgentSim[] = [
  /* -------------------------------------------------------------- 01/02 JS Event Loop */
  {
    id: 'proj-js-event-loop',
    title: 'JS Event Loop: Call Stack, Microtasks & Macrotasks',
    framework: 'JavaScript',
    group: 'JS & TS',
    module: '02',
    home: '/project/learn/02',
    level: 'Beginner',
    summary: 'Watch synchronous code, Promise.then microtasks, await continuations, and setTimeout macrotasks execute in exact FIFO order.',
    scenario: 'A script logs "1", schedules setTimeout("2", 0), queues Promise.resolve().then("3"), runs async/await ("4", await, "5"), and logs "6".',
    nodes: [
      { id: 'stack', label: 'Call Stack', sub: 'active JS frame', x: 110, y: 205, kind: 'agent' },
      { id: 'host', label: 'Host APIs', sub: 'timers & fetch', x: 355, y: 80, kind: 'service' },
      { id: 'micro', label: 'Microtask Q', sub: 'Promise.then / await', x: 355, y: 330, kind: 'router' },
      { id: 'macro', label: 'Macrotask Q', sub: 'setTimeout / I/O', x: 650, y: 80, kind: 'memory' },
      { id: 'out', label: 'Console Out', sub: 'exact log order', x: 650, y: 330, kind: 'end' },
    ],
    edges: [
      { id: 's-h', from: 'stack', to: 'host', label: 'register' },
      { id: 'h-mac', from: 'host', to: 'macro', label: 'timer done' },
      { id: 's-mic', from: 'stack', to: 'micro', label: 'enqueue' },
      { id: 'mic-s', from: 'micro', to: 'stack', label: 'drain all', bend: 35 },
      { id: 'mac-s', from: 'macro', to: 'stack', label: '1 task/tick', bend: -45 },
      { id: 's-out', from: 'stack', to: 'out', label: 'console.log' },
    ],
    code: `console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
(async () => {
  console.log("4");
  await null;
  console.log("5");
})();
console.log("6");`,
    steps: [
      {
        title: 'Run synchronous logs & register callbacks',
        edge: 's-out',
        packet: '"1", "4", "6"',
        narration: 'All top-level synchronous lines execute immediately on the Call Stack: "1" prints, setTimeout hands its callback to Host APIs, Promise.then queues "3" into Microtasks, the async IIFE runs "4" and suspends at await null (queuing "5"), and "6" prints.',
        state: { stack: 'clearing', microtasks: ['cb("3")', 'resume("5")'], macrotasks: ['cb("2")'], output: ['1', '4', '6'] },
        changed: ['output', 'microtasks', 'macrotasks'],
        log: 'sync phase complete → output: 1, 4, 6',
        hl: ['console.log("1")', 'console.log("4")', 'console.log("6")'],
        predict: {
          question: 'Now that the Call Stack is empty, which callback executes next?',
          options: ['"2" from setTimeout(..., 0)', '"3" from Promise.resolve().then()', '"5" after await null', 'Both "2" and "3" run in parallel'],
          answer: 1,
          explain: 'Microtasks ALWAYS drain completely before the event loop pulls a single macrotask. "3" was queued before "5", so "3" runs next.',
        },
      },
      {
        title: 'Drain Microtask #1: Promise.then',
        edge: 'mic-s',
        packet: 'cb("3")',
        narration: 'The Call Stack is empty, so the event loop pulls the first microtask: Promise.then logs "3".',
        state: { stack: 'cb("3")', microtasks: ['resume("5")'], macrotasks: ['cb("2")'], output: ['1', '4', '6', '3'] },
        changed: ['microtasks', 'output'],
        log: 'microtask 1 → log "3"',
        hl: ['Promise.resolve().then'],
      },
      {
        title: 'Drain Microtask #2: await continuation',
        edge: 'mic-s',
        packet: 'resume("5")',
        narration: 'Microtask queue is NOT empty yet! Every remaining microtask runs before any setTimeout callback, so "5" logs next.',
        state: { stack: 'resume("5")', microtasks: [], macrotasks: ['cb("2")'], output: ['1', '4', '6', '3', '5'] },
        changed: ['microtasks', 'output'],
        log: 'microtask 2 → log "5"',
        hl: ['await null;', 'console.log("5")'],
      },
      {
        title: 'Pull one Macrotask: setTimeout',
        edge: 'mac-s',
        packet: 'cb("2")',
        tone: 'ok',
        narration: 'Only now — with both the Call Stack and Microtask queue empty — does the event loop pick the setTimeout macrotask and print "2".',
        state: { stack: 'idle', microtasks: [], macrotasks: [], output: ['1', '4', '6', '3', '5', '2'] },
        changed: ['macrotasks', 'output'],
        log: 'macrotask 1 → log "2" (final order: 1,4,6,3,5,2)',
        hl: ['setTimeout(() => console.log("2")'],
      },
    ],
    match: /event loop|asynchronous|microtask|macrotask|promise|call stack|async/i,
    takeaways: [
      'Synchronous call stack frames always clear first.',
      'All pending microtasks (Promise.then, await continuations) drain before the next macrotask.',
      'Never block the event loop with synchronous CPU work or sync loops.',
    ],
  },

  /* -------------------------------------------------------------- 03 TS + Zod Runtime Boundary */
  {
    id: 'proj-ts-zod-boundary',
    title: 'TypeScript Compile-Time Check vs Zod Runtime Boundary',
    framework: 'TypeScript + Zod',
    group: 'JS & TS',
    module: '03',
    home: '/project/learn/03',
    level: 'Beginner',
    summary: 'See why TypeScript types vanish in JavaScript output and why Zod catches malformed LLM JSON at runtime.',
    scenario: 'An LLM returns {"confidence": "high", "answer": "42"} when our TS type expects confidence: number.',
    nodes: [
      { id: 'ts', label: 'TS Code', sub: 'interface ToolOutput', x: 100, y: 110, kind: 'agent' },
      { id: 'tsc', label: 'tsc Compiler', sub: 'erases TS types', x: 350, y: 110, kind: 'tool' },
      { id: 'llm', label: 'LLM JSON', sub: 'confidence: "high"', x: 100, y: 300, kind: 'llm' },
      { id: 'zod', label: 'Zod Guard', sub: 'safeParse(unknown)', x: 380, y: 300, kind: 'guard' },
      { id: 'app', label: 'App / Retry', sub: 'safe typed path', x: 680, y: 205, kind: 'service' },
    ],
    edges: [
      { id: 'ts-tsc', from: 'ts', to: 'tsc', label: 'build' },
      { id: 'tsc-app', from: 'tsc', to: 'app', label: 'plain JS' },
      { id: 'llm-z', from: 'llm', to: 'zod', label: 'unknown' },
      { id: 'z-app', from: 'zod', to: 'app', label: 'Result' },
    ],
    code: `const OutputSchema = z.object({
  answer: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
type Output = z.infer<typeof OutputSchema>;

export function handleLLM(raw: unknown) {
  const parsed = OutputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues };
  }
  return { ok: true, data: parsed.data }; // safely typed Output!
}`,
    steps: [
      {
        title: 'Compile time: tsc erases interfaces',
        edge: 'ts-tsc',
        packet: 'types erased',
        narration: 'At build time, TypeScript verifies our internal code and removes every interface and type keyword before emitting JavaScript.',
        state: { compile_types: 'checked & erased', runtime_payload: 'pending', status: 'deployed' },
        changed: ['compile_types'],
        log: 'tsc compiled cleanly (runtime knows nothing about Output type)',
        hl: ['type Output = z.infer'],
      },
      {
        title: 'Untrusted LLM JSON arrives as unknown',
        edge: 'llm-z',
        packet: '{"confidence":"high"}',
        narration: 'Instead of unsafely casting `raw as Output`, we type external network/LLM JSON as `unknown` and pass it into Zod.',
        state: { compile_types: 'erased', runtime_payload: '{confidence: "high"}', status: 'validating' },
        changed: ['runtime_payload', 'status'],
        log: 'received LLM JSON: confidence is string "high"',
        hl: ['export function handleLLM(raw: unknown)'],
        predict: {
          question: 'Without Zod, if you wrote `(raw as Output).confidence.toFixed(2)`, what happens at runtime?',
          options: ['tsc catches it at build time', 'JavaScript coerces "high" to 0.50', 'Runtime crash: TypeError: .toFixed is not a function', 'Zod silently fixes "high"'],
          answer: 2,
          explain: 'Type assertions (`as Output`) tell the compiler to trust you without checking at runtime — calling `.toFixed` on `"high"` crashes in production.',
        },
      },
      {
        title: 'Zod rejects bad type safely',
        edge: 'z-app',
        packet: 'safeParse → false',
        tone: 'warn',
        narration: '`OutputSchema.safeParse(raw)` returns structured field issues (`confidence: Expected number, received string`) so the service can trigger a bounded retry or return HTTP 422 without crashing.',
        state: { compile_types: 'erased', runtime_payload: 'rejected cleanly', status: 'retry / 422' },
        changed: ['runtime_payload', 'status'],
        log: 'Zod caught invalid field: confidence expected number',
        hl: ['OutputSchema.safeParse(raw)', 'if (!parsed.success)'],
      },
    ],
    match: /typescript|zod|compile-time|runtime validation|type erasure|unknown|narrowing/i,
    takeaways: [
      'TypeScript protects internal code at compile time; types do not exist at runtime.',
      'Accept external API and LLM JSON as `unknown` and validate with Zod before use.',
    ],
  },

  /* -------------------------------------------------------------- 05 Resilient TS Client */
  {
    id: 'proj-ts-resilient-client',
    title: 'Resilient TS AI Client: Circuit Breaker + Jitter Retry + Timeout',
    framework: 'TypeScript',
    group: 'JS & TS',
    module: '05',
    home: '/project/learn/05',
    level: 'Intermediate',
    summary: 'Trace an LLM API call through circuit breaker checks, AbortController per-attempt timeouts, and exponential backoff with full jitter.',
    scenario: 'An LLM endpoint spikes to HTTP 429, recovers on attempt 2, and records latency + correlation ID.',
    nodes: [
      { id: 'caller', label: 'TS Service', sub: 'req + traceId', x: 95, y: 205, kind: 'user' },
      { id: 'cb', label: 'Circuit Breaker', sub: 'closed / open', x: 295, y: 110, kind: 'guard' },
      { id: 'retry', label: 'Retry Policy', sub: 'backoff + jitter', x: 295, y: 310, kind: 'router' },
      { id: 'abort', label: 'AbortController', sub: 'per-call timeout', x: 520, y: 205, kind: 'tool' },
      { id: 'llm', label: 'LLM Gateway', sub: 'Azure / OpenAI', x: 725, y: 205, kind: 'llm' },
    ],
    edges: [
      { id: 'c-cb', from: 'caller', to: 'cb' },
      { id: 'cb-ab', from: 'cb', to: 'abort' },
      { id: 'ab-llm', from: 'abort', to: 'llm' },
      { id: 'llm-ret', from: 'llm', to: 'retry', bend: 35, label: '429 / 503' },
      { id: 'ret-ab', from: 'retry', to: 'abort', label: 'jitter wait' },
    ],
    code: `async function callWithResilience(req: ChatReq, traceId: string) {
  breaker.assertClosed();
  for (let attempt = 0; attempt <= 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(URL, { signal: ctrl.signal, headers: { "X-Trace-Id": traceId } });
      if (res.status === 429 || res.status >= 500) throw new RetryableError(res.status);
      breaker.recordSuccess();
      return ResponseSchema.parse(await res.json());
    } catch (e) {
      breaker.recordFailure();
      if (attempt === 2) throw e;
      await sleep(Math.random() * (200 * 2 ** attempt)); // full jitter
    } finally { clearTimeout(timer); }
  }
}`,
    steps: [
      {
        title: 'Check Circuit Breaker & start AbortController',
        edge: 'c-cb',
        packet: 'traceId=tr_88',
        narration: 'Before touching the network, check that the circuit breaker is Closed, attach a correlation ID, and arm a 3-second AbortController timer.',
        state: { circuit: 'CLOSED (0 fails)', attempt: '1', timeout_ms: '3000', trace_id: 'tr_88' },
        changed: ['circuit', 'attempt'],
        log: 'circuit CLOSED → attempt 1 starts (3s abort timer)',
        hl: ['breaker.assertClosed()', 'new AbortController()'],
      },
      {
        title: 'Provider returns HTTP 429 Rate Limit',
        edge: 'llm-ret',
        packet: '429 Too Many',
        tone: 'warn',
        narration: 'The gateway returns HTTP 429. Instead of failing the user immediately or hammering immediately in a synchronized storm, we compute random full jitter.',
        state: { circuit: 'CLOSED (1 fail)', attempt: '1 → 2', backoff: 'random(0..200ms)', trace_id: 'tr_88' },
        changed: ['circuit', 'attempt', 'backoff'],
        log: 'HTTP 429 → sleeping 142ms full jitter before attempt 2',
        hl: ['if (res.status === 429', 'Math.random() * (200'],
        predict: {
          question: 'Why do production clients add random jitter instead of waiting an exact 200ms / 400ms / 800ms?',
          options: ['To make TypeScript compile faster', 'To prevent synchronized thundering-herd retries crashing the recovering provider', 'To skip Zod validation', 'Jitter disables AbortController'],
          answer: 1,
          explain: 'When 500 clients fail at the same instant, identical fixed backoff causes all 500 to retry simultaneously. Full jitter spreads the load cleanly.',
        },
      },
      {
        title: 'Retry succeeds & resets Circuit Breaker',
        edge: 'ab-llm',
        packet: '200 OK + Zod',
        tone: 'ok',
        narration: 'Attempt 2 hits the gateway cleanly, clears the AbortController timer in `finally`, resets the failure counter, and parses JSON with Zod.',
        state: { circuit: 'CLOSED (0 fails)', attempt: '2 succeeded', backoff: '0', trace_id: 'tr_88' },
        changed: ['circuit', 'attempt'],
        log: '200 OK validated with Zod → circuit failure counter reset',
        hl: ['breaker.recordSuccess()', 'ResponseSchema.parse', 'clearTimeout(timer)'],
      },
    ],
    match: /circuit breaker|retry|jitter|backoff|abort|resilien|production.*typescript|timeout/i,
    takeaways: [
      'Always clear AbortController timers in `finally` to prevent timer leaks.',
      'Combine bounded retries + full jitter + circuit breaking so one slow LLM vendor never sinks your server.',
    ],
  },

  /* -------------------------------------------------------------- 06 Playwright Auto-Wait */
  {
    id: 'proj-pw-auto-wait',
    title: 'Playwright Actionability & Web-First Auto-Wait Loop',
    framework: 'Playwright TS',
    group: 'Playwright',
    module: '06',
    home: '/project/learn/06',
    level: 'Beginner',
    summary: 'Follow how Playwright eliminates flaky sleep() calls by verifying 5 actionability checks and retrying web-first assertions.',
    scenario: 'A user test calls `await page.getByRole("button", { name: "Generate" }).click()` while the button is briefly covered by a loading spinner.',
    nodes: [
      { id: 'spec', label: 'Test Spec', sub: 'getByRole().click()', x: 95, y: 205, kind: 'user' },
      { id: 'loc', label: 'Locator Engine', sub: 'lazy re-query', x: 295, y: 205, kind: 'agent' },
      { id: 'act', label: 'Actionability', sub: '5 DOM checks', x: 520, y: 95, kind: 'guard' },
      { id: 'dom', label: 'Browser DOM', sub: 'spinner animating', x: 520, y: 315, kind: 'service' },
      { id: 'assert', label: 'Web Assertion', sub: 'expect().toBeVisible()', x: 730, y: 205, kind: 'end' },
    ],
    edges: [
      { id: 's-l', from: 'spec', to: 'loc' },
      { id: 'l-a', from: 'loc', to: 'act' },
      { id: 'a-d', from: 'act', to: 'dom', bend: -30, label: 'poll' },
      { id: 'd-a', from: 'dom', to: 'act', bend: -30, label: 'ready' },
      { id: 'a-as', from: 'act', to: 'assert', label: 'clicked' },
    ],
    code: `const btn = page.getByRole("button", { name: "Generate" });
// Auto-waits: Attached → Visible → Stable → Receives Events → Enabled
await btn.click();

// Web-first assertion auto-retries until visible (up to timeout)
await expect(page.getByRole("status")).toContainText("Done");`,
    steps: [
      {
        title: 'Lazy locator resolves DOM dynamically',
        edge: 's-l',
        packet: 'role=button',
        narration: 'Unlike ElementHandle snapshots, a Locator is lazy — every retry re-queries the live accessibility tree so React re-renders never cause stale errors.',
        state: { attached: 'true', visible: 'true', stable: 'true', receives_events: 'pending', enabled: 'true' },
        changed: ['attached'],
        log: 'Locator resolved button[name="Generate"] in accessibility tree',
        hl: ['const btn = page.getByRole'],
      },
      {
        title: 'Check #4 blocked by overlay spinner',
        edge: 'a-d',
        packet: 'retry check',
        tone: 'warn',
        narration: 'The button is attached, visible, and enabled — BUT a spinner overlay currently intercepts pointer clicks (`Receives Events: false`). Playwright automatically keeps polling without throwing.',
        state: { attached: 'true', visible: 'true', stable: 'true', receives_events: 'FALSE (spinner overlay)', enabled: 'true' },
        changed: ['receives_events'],
        log: 'waiting: subtree intercepts pointer events — retrying automatically',
        hl: ['await btn.click()'],
        predict: {
          question: 'What happens if the spinner disappears 450 ms later?',
          options: ['The test crashes immediately with ElementClickIntercepted', 'Playwright retries actionability checks and clicks as soon as all 5 pass', 'You must add await page.waitForTimeout(1000)', 'Playwright clicks the spinner instead'],
          answer: 1,
          explain: 'Playwright continuously polls all 5 actionability checks (Attached, Visible, Stable, Receives Events, Enabled) up to the action timeout.',
        },
      },
      {
        title: 'Spinner clears → click + web-first assertion',
        edge: 'a-as',
        packet: 'clicked + pass',
        tone: 'ok',
        narration: 'As soon as the spinner unmounts, all 5 checks pass, the click fires, and `await expect(...).toContainText("Done")` auto-retries cleanly.',
        state: { attached: 'true', visible: 'true', stable: 'true', receives_events: 'TRUE', enabled: 'true' },
        changed: ['receives_events'],
        log: 'all 5 actionability checks passed → clicked → assertion green',
        hl: ['await expect(page.getByRole("status")).toContainText'],
      },
    ],
    match: /auto-wait|actionability|locator|synchronization|assertion|flaky|wait/i,
    takeaways: [
      'Locators re-evaluate lazily on every check; avoid ElementHandle and manual sleep().',
      'Click performs 5 checks: Attached, Visible, Stable, Receives Events, Enabled.',
    ],
  },

  /* -------------------------------------------------------------- 08 Playwright Route Mock */
  {
    id: 'proj-pw-route-mock',
    title: 'Playwright page.route(): Mocking LLM 429 & Deterministic JSON',
    framework: 'Playwright TS',
    group: 'Playwright',
    module: '08',
    home: '/project/learn/08',
    level: 'Intermediate',
    summary: 'Intercept browser network requests inside Playwright to test HTTP 429 retries and deterministic AI responses with zero LLM cost.',
    scenario: 'A chat UI sends POST /v1/chat. First call returns a mocked 429; retry returns mocked JSON citations.',
    nodes: [
      { id: 'ui', label: 'Browser Page', sub: 'fetch /v1/chat', x: 100, y: 205, kind: 'user' },
      { id: 'route', label: 'page.route()', sub: '**/v1/chat hook', x: 375, y: 205, kind: 'router' },
      { id: 'mock', label: 'Mock Handler', sub: '429 -> 200 JSON', x: 660, y: 95, kind: 'tool' },
      { id: 'real', label: 'Real Backend', sub: 'never hit in CI!', x: 660, y: 315, kind: 'service' },
    ],
    edges: [
      { id: 'u-r', from: 'ui', to: 'route', label: 'POST /v1/chat' },
      { id: 'r-m', from: 'route', to: 'mock', label: 'intercept' },
      { id: 'm-u', from: 'mock', to: 'ui', label: 'fulfill()', bend: -50 },
      { id: 'r-re', from: 'route', to: 'real', label: 'bypassed' },
    ],
    code: `let calls = 0;
await page.route("**/v1/chat", async (route) => {
  if (++calls === 1) {
    return route.fulfill({ status: 429, body: '{"error":"rate limit"}' });
  }
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ answer: "30-day refund", citations: ["sla.pdf#p2"] }),
  });
});`,
    steps: [
      {
        title: 'Register route interceptor before navigation',
        edge: 'u-r',
        packet: 'POST /v1/chat #1',
        narration: 'The page clicks Send. Because `page.route("**/v1/chat")` is active in the BrowserContext, Playwright pauses the network request before it ever leaves the browser.',
        state: { calls: '1', mock_action: 'intercepted', live_llm_tokens: '0' },
        changed: ['calls', 'mock_action'],
        log: 'intercepted POST /v1/chat (attempt 1)',
        hl: ['await page.route("**/v1/chat"'],
      },
      {
        title: 'Fulfill call #1 with synthetic HTTP 429',
        edge: 'm-u',
        packet: '429 Rate Limit',
        tone: 'warn',
        narration: '`route.fulfill({ status: 429 })` forces the frontend UI retry logic to activate on demand — something nearly impossible to trigger reliably against a live API.',
        state: { calls: '1', mock_action: '429 returned', live_llm_tokens: '0' },
        changed: ['mock_action'],
        log: 'mock fulfilled 429 → UI retries automatically',
        hl: ['return route.fulfill({ status: 429'],
      },
      {
        title: 'Fulfill retry #2 with grounded JSON',
        edge: 'm-u',
        packet: '200 JSON + cite',
        tone: 'ok',
        narration: 'On the second attempt, `route.fulfill(200)` injects deterministic text and citations so `expect(page.getByText("sla.pdf#p2")).toBeVisible()` is 100% reproducible and free.',
        state: { calls: '2', mock_action: '200 fulfilled', live_llm_tokens: '0 (saved!)' },
        changed: ['calls', 'mock_action'],
        log: 'mock fulfilled 200 → citation badge verified',
        hl: ['return route.fulfill({', 'status: 200', 'sla.pdf#p2'],
      },
    ],
    match: /route|network|intercept|mock|429|har|apirequestcontext/i,
    takeaways: [
      'Always register `page.route()` BEFORE the action that triggers the request.',
      'Mock LLM endpoints in deterministic PR checks; save live API tests for nightly smoke runs.',
    ],
  },

  /* -------------------------------------------------------------- 08 BDD Gherkin Runner */
  {
    id: 'proj-pw-bdd-flow',
    title: 'BDD Flow: Gherkin Feature -> Step Definitions -> POM -> FastAPI',
    framework: 'Gherkin / BDD',
    group: 'Playwright',
    module: '08',
    home: '/project/learn/08',
    level: 'Beginner',
    summary: 'Follow one Gherkin scenario from plain-English Given/When/Then through World state and Page Objects into Playwright assertions.',
    scenario: 'Scenario: Grounded citation renders for tenant acme-qa when asking SLA policy.',
    nodes: [
      { id: 'feat', label: '.feature File', sub: 'Given/When/Then', x: 95, y: 205, kind: 'user' },
      { id: 'step', label: 'Step Defs', sub: 'Cucumber / pytest-bdd', x: 325, y: 110, kind: 'router' },
      { id: 'world', label: 'World / Fixture', sub: 'isolated page + api', x: 325, y: 310, kind: 'memory' },
      { id: 'pom', label: 'ChatPage POM', sub: 'semantic locators', x: 575, y: 110, kind: 'tool' },
      { id: 'api', label: 'FastAPI App', sub: 'UI + backend check', x: 730, y: 245, kind: 'service' },
    ],
    edges: [
      { id: 'f-s', from: 'feat', to: 'step' },
      { id: 's-w', from: 'step', to: 'world' },
      { id: 's-p', from: 'step', to: 'pom' },
      { id: 'p-a', from: 'pom', to: 'api' },
    ],
    code: `# features/chat.feature
Scenario: Verified citation renders
  Given tenant "acme-qa" is signed in
  When the user submits "What is the SLA?"
  Then citation "sla-2026.pdf#p2" is visible

# steps/chat.steps.ts
When("the user submits {string}", async function (q: string) {
  await this.chatPage.ask(q);
});`,
    steps: [
      {
        title: 'Given: Hook + World isolate BrowserContext',
        edge: 's-w',
        packet: 'Before hook',
        narration: 'Each Scenario gets a fresh World/Fixture with its own Playwright BrowserContext and seeded tenant auth state so parallel scenarios never leak cookies.',
        state: { scenario: 'Verified citation', context: 'isolated #4', page_object: 'ChatPage ready' },
        changed: ['context', 'page_object'],
        log: 'Given tenant "acme-qa" → fresh BrowserContext ready',
        hl: ['Given tenant "acme-qa"'],
      },
      {
        title: 'When: Step delegates to Page Object (no raw selectors)',
        edge: 's-p',
        packet: 'ask(question)',
        narration: 'Step definitions remain thin glue calling `this.chatPage.ask(q)`. All `getByRole` / `getByLabel` locators live cleanly inside the POM.',
        state: { scenario: 'Verified citation', context: 'isolated #4', page_object: 'chatPage.ask()' },
        changed: ['page_object'],
        log: 'When user submits → ChatPage fills textbox & clicks Send',
        hl: ['When("the user submits {string}"', 'this.chatPage.ask(q)'],
      },
      {
        title: 'Then: Assert business outcome cleanly',
        edge: 'p-a',
        packet: 'sla-2026.pdf#p2',
        tone: 'ok',
        narration: 'The `Then` step verifies observable domain behavior (`sla-2026.pdf#p2` visible) rather than internal CSS class names.',
        state: { scenario: 'PASSED', context: 'closed cleanly', page_object: 'verified citation' },
        changed: ['scenario'],
        log: 'Then citation visible → PASS',
        hl: ['Then citation "sla-2026.pdf#p2"'],
      },
    ],
    match: /bdd|gherkin|cucumber|pytest-bdd|behave|feature|scenario outline/i,
    takeaways: [
      'Keep CSS/ARIA selectors inside Page Objects, NEVER inside `.feature` files or step definitions.',
      'Always isolate BrowserContext per scenario so parallel BDD runs never collide.',
    ],
  },

  /* -------------------------------------------------------------- 09 Agentic Playwright MCP */
  {
    id: 'proj-pw-agent-mcp',
    title: 'Agentic Browser Automation: Accessibility Snapshot + Playwright MCP + HITL',
    framework: 'LangGraph + Playwright MCP',
    group: 'Playwright',
    module: '09',
    home: '/project/learn/09',
    level: 'Advanced',
    summary: 'Watch an AI browser agent inspect an accessibility snapshot, emit a structured action, pause at a safety guardrail, and execute via MCP.',
    scenario: 'Agent navigates staging portal, finds "Delete Demo Tenant", triggers HITL approval guard, then executes safely.',
    nodes: [
      { id: 'obs', label: 'A11y Snapshot', sub: 'compact DOM tree', x: 95, y: 205, kind: 'service' },
      { id: 'llm', label: 'Planner LLM', sub: 'structured action', x: 325, y: 90, kind: 'llm' },
      { id: 'guard', label: 'Policy & Budget', sub: 'HITL + step cap', x: 325, y: 315, kind: 'guard' },
      { id: 'human', label: 'Human Approver', sub: 'interrupt gate', x: 565, y: 315, kind: 'human' },
      { id: 'mcp', label: 'Playwright MCP', sub: 'browser_click', x: 720, y: 155, kind: 'tool' },
    ],
    edges: [
      { id: 'o-l', from: 'obs', to: 'llm', label: 'roles + refs' },
      { id: 'l-g', from: 'llm', to: 'guard', label: 'action JSON' },
      { id: 'g-h', from: 'guard', to: 'human', label: 'destructive!' },
      { id: 'h-m', from: 'human', to: 'mcp', label: 'approved' },
      { id: 'g-m', from: 'guard', to: 'mcp', label: 'safe action' },
    ],
    code: `action = BrowserActionSchema.model_validate(llm_output)
if action.kind in {"delete", "submit_payment"}:
    approved = interrupt({"action": action.model_dump()})
    if not approved:
        raise PermissionError("Human rejected destructive browser action")
result = await mcp_session.call_tool("browser_click", {"ref": action.target_ref})`,
    steps: [
      {
        title: 'Observe compact Accessibility Tree (not raw HTML)',
        edge: 'o-l',
        packet: 'a11y tree (1.2 KB)',
        narration: 'Playwright MCP sends structured roles and element refs instead of 180 KB of raw DOM HTML — slashing token cost and avoiding prompt injection hidden in invisible text.',
        state: { step_budget: '1 / 12', prompt_tokens: '420', proposed_action: 'pending', hitl: 'not triggered' },
        changed: ['step_budget', 'prompt_tokens'],
        log: 'captured accessibility snapshot (1.2 KB) → sent to planner',
        hl: ['BrowserActionSchema.model_validate'],
      },
      {
        title: 'Policy Gate catches destructive action → HITL Pause',
        edge: 'g-h',
        packet: 'action: delete',
        tone: 'warn',
        narration: 'The LLM proposes clicking `Delete Demo Tenant`. The policy guard detects a destructive action and triggers a LangGraph `interrupt()` for human approval.',
        state: { step_budget: '2 / 12', prompt_tokens: '610', proposed_action: 'delete(ref="b19")', hitl: 'WAITING APPROVAL' },
        changed: ['proposed_action', 'hitl'],
        log: 'GUARD HIT: destructive browser click paused for human approval',
        hl: ['if action.kind in {"delete"', 'interrupt('],
        predict: {
          question: 'Why do production browser agents use an Accessibility Tree + HITL instead of blind vision clicking?',
          options: ['Screenshots are forbidden by HTTP', 'A11y trees use 90% fewer tokens, provide exact deterministic refs, and HITL stops irreversible mutations', 'Playwright cannot take screenshots', 'A11y trees bypass CORS'],
          answer: 1,
          explain: 'Accessibility trees are structured, token-efficient, and deterministic; pairing them with typed schemas + HITL stops destructive or prompt-injected clicks.',
        },
      },
      {
        title: 'Human approves → Playwright MCP clicks & verifies',
        edge: 'h-m',
        packet: 'browser_click(b19)',
        tone: 'ok',
        narration: 'After human sign-off, Playwright MCP executes the click deterministically and logs a trace span for observability.',
        state: { step_budget: '3 / 12', prompt_tokens: '610', proposed_action: 'executed cleanly', hitl: 'APPROVED' },
        changed: ['hitl', 'proposed_action'],
        log: 'human approved → Playwright MCP executed browser_click(b19)',
        hl: ['mcp_session.call_tool("browser_click"'],
      },
    ],
    match: /agentic|mcp|browser agent|self-healing|vision|accessibility tree|langgraph.*playwright|adk.*playwright/i,
    takeaways: [
      'Accessibility Tree snapshots beat raw HTML and pixel screenshots for reliability and cost.',
      'Enforce strict step/token budgets and HITL pauses on destructive browser actions.',
    ],
  },

  /* -------------------------------------------------------------- 10 HTTP Lifecycle */
  {
    id: 'proj-rest-http-lifecycle',
    title: 'HTTP Lifecycle: DNS, TCP, TLS 1.3 vs Keep-Alive Pooling',
    framework: 'REST / HTTPX',
    group: 'REST & Security',
    module: '10',
    home: '/project/learn/10',
    level: 'Beginner',
    summary: 'Compare a cold HTTP call (DNS + TCP + TLS handshakes) against reusing a persistent Keep-Alive HTTPX connection pool.',
    scenario: 'A FastAPI orchestrator calls a downstream embedding microservice twice: first cold, then via pooled Keep-Alive.',
    nodes: [
      { id: 'cli', label: 'HTTPX Pool', sub: 'AsyncClient', x: 95, y: 205, kind: 'user' },
      { id: 'dns', label: 'DNS Resolver', sub: 'domain -> IP', x: 285, y: 90, kind: 'tool' },
      { id: 'tcp', label: 'TCP + TLS 1.3', sub: 'SYN/ACK + certs', x: 500, y: 90, kind: 'guard' },
      { id: 'pool', label: 'Warm Socket', sub: 'Keep-Alive reuse', x: 395, y: 320, kind: 'memory' },
      { id: 'api', label: 'FastAPI Server', sub: '200 OK JSON', x: 715, y: 205, kind: 'service' },
    ],
    edges: [
      { id: 'c-d', from: 'cli', to: 'dns', label: '15 ms' },
      { id: 'd-t', from: 'dns', to: 'tcp', label: '45 ms' },
      { id: 't-a', from: 'tcp', to: 'api', label: '1st req' },
      { id: 'c-p', from: 'cli', to: 'pool', label: '0 ms handshake' },
      { id: 'p-a', from: 'pool', to: 'api', label: 'reused!' },
    ],
    code: `# Create ONE shared AsyncClient during app lifespan (not inside each endpoint!)
async with httpx.AsyncClient(limits=httpx.Limits(max_connections=100)) as client:
    r1 = await client.post("https://embed.internal/v1/vectors", json=batch1)  # Cold: DNS+TCP+TLS
    r2 = await client.post("https://embed.internal/v1/vectors", json=batch2)  # Warm: Keep-Alive!`,
    steps: [
      {
        title: 'Cold Request #1: DNS Lookup',
        edge: 'c-d',
        packet: 'DNS A/AAAA',
        narration: 'No socket exists in the pool yet, so the OS resolves `embed.internal` to an IP address (~15 ms).',
        state: { dns_ms: '15', handshake_ms: '0', pool_sockets: '0', total_overhead_ms: '15' },
        changed: ['dns_ms', 'total_overhead_ms'],
        log: 'cold call #1: DNS lookup 15 ms',
        hl: ['r1 = await client.post'],
      },
      {
        title: 'Cold Request #1: TCP SYN/ACK + TLS 1.3',
        edge: 'd-t',
        packet: 'TCP + TLS',
        tone: 'warn',
        narration: 'Next, TCP 3-way handshake + TLS 1.3 certificate verification consume ~45 ms before any application JSON is even sent!',
        state: { dns_ms: '15', handshake_ms: '45', pool_sockets: '1 (opened)', total_overhead_ms: '60' },
        changed: ['handshake_ms', 'pool_sockets', 'total_overhead_ms'],
        log: 'cold call #1: TCP+TLS handshake 45 ms → 60 ms network overhead',
        hl: ['httpx.AsyncClient'],
      },
      {
        title: 'Warm Request #2: Reuses Keep-Alive Socket',
        edge: 'p-a',
        packet: 'Keep-Alive 0ms',
        tone: 'ok',
        narration: 'Request #2 borrows the already-authenticated TLS socket from `httpx.AsyncClient` — skipping DNS, TCP, and TLS completely!',
        state: { dns_ms: '0 (cached)', handshake_ms: '0 (Keep-Alive)', pool_sockets: '1 (reused)', total_overhead_ms: '0' },
        changed: ['dns_ms', 'handshake_ms', 'pool_sockets', 'total_overhead_ms'],
        log: 'warm call #2: socket reused → 60 ms saved!',
        hl: ['r2 = await client.post'],
      },
    ],
    match: /http lifecycle|dns|tcp|tls|https|httpx|requests|keep-alive|rest fundamentals/i,
    takeaways: [
      'Instantiate ONE shared `httpx.AsyncClient` per worker at startup; creating one per request destroys connection pooling.',
      'Reusing TLS sockets via Keep-Alive removes tens of milliseconds from every internal microservice hop.',
    ],
  },

  /* -------------------------------------------------------------- 10 JWT + BOLA Security */
  {
    id: 'proj-rest-jwt-bola',
    title: 'API Security: JWT AuthN vs BOLA Resource-Level Ownership',
    framework: 'FastAPI Security',
    group: 'REST & Security',
    module: '10',
    home: '/project/learn/10',
    level: 'Intermediate',
    summary: 'Understand why a valid RS256 JWT still allows BOLA data leaks unless every DB and vector query checks resource ownership and tenant ID.',
    scenario: 'Authenticated user from Tenant A requests GET /v1/documents/doc_tenant_b.',
    nodes: [
      { id: 'user', label: 'Tenant A Caller', sub: 'valid RS256 JWT', x: 95, y: 205, kind: 'user' },
      { id: 'authn', label: 'JWT Verify', sub: 'RS256 + exp', x: 315, y: 105, kind: 'guard' },
      { id: 'authz', label: 'BOLA / ABAC', sub: 'tenant_id match?', x: 545, y: 105, kind: 'router' },
      { id: 'db', label: 'Document DB', sub: 'doc belongs to B', x: 545, y: 315, kind: 'memory' },
      { id: 'res', label: '403 + Audit', sub: 'blocked cleanly', x: 730, y: 205, kind: 'end' },
    ],
    edges: [
      { id: 'u-n', from: 'user', to: 'authn', label: 'Bearer JWT' },
      { id: 'n-z', from: 'authn', to: 'authz', label: 'sub=alice, tenant=A' },
      { id: 'z-db', from: 'authz', to: 'db', label: 'WHERE tenant_id=A' },
      { id: 'z-r', from: 'authz', to: 'res', label: 'owner mismatch' },
    ],
    code: `@app.get("/v1/documents/{doc_id}")
async def get_document(doc_id: str, user: Claims = Depends(verify_rs256_jwt)):
    # ALWAYS scope lookup by BOTH doc_id AND user.tenant_id!
    doc = await db.fetch_one(
        "SELECT id, title FROM docs WHERE id = $1 AND tenant_id = $2",
        doc_id, user.tenant_id,
    )
    if not doc:
        raise HTTPException(status_code=403, detail="Forbidden or not found")
    return doc`,
    steps: [
      {
        title: 'Authentication passes (Valid RS256 JWT)',
        edge: 'u-n',
        packet: 'RS256 valid',
        narration: 'The gateway verifies the RS256 signature with the public JWKS key and confirms `exp` has not expired. Authentication (`401`) succeeds — Alice really IS Alice from Tenant A.',
        state: { authN: 'PASS (tenant=A)', authZ_owner_check: 'pending', response: '—' },
        changed: ['authN'],
        log: 'RS256 JWT valid: sub=alice, tenant_id=tenant_a',
        hl: ['Depends(verify_rs256_jwt)'],
        predict: {
          question: 'Alice has a 100% valid JWT. What prevents her from reading `doc_tenant_b`?',
          options: ['JWT RS256 signature automatically blocks wrong document IDs', 'CORS headers on the backend', 'Scoping the DB/vector query explicitly by `tenant_id == user.tenant_id` (preventing BOLA)', 'Using HTTPS instead of HTTP'],
          answer: 2,
          explain: 'JWT only proves WHO Alice is (AuthN). Checking object ownership / tenant_id inside every query prevents Broken Object Level Authorization (BOLA / OWASP API1).',
        },
      },
      {
        title: 'BOLA Guard enforces tenant_id filter',
        edge: 'z-db',
        packet: 'tenant_id=A filter',
        tone: 'warn',
        narration: 'Instead of `SELECT * FROM docs WHERE id = $1` (vulnerable!), the backend enforces `AND tenant_id = $2` directly in SQL and vector metadata filters.',
        state: { authN: 'PASS (tenant=A)', authZ_owner_check: 'FAIL (doc owner=B)', response: '403 Forbidden' },
        changed: ['authZ_owner_check', 'response'],
        log: 'BOLA check rejected cross-tenant access → 403 logged to audit trail',
        hl: ['WHERE id = $1 AND tenant_id = $2', 'HTTPException(status_code=403'],
      },
    ],
    match: /security|bola|jwt|oauth|pkce|rbac|abac|owasp|tenant|auth/i,
    takeaways: [
      'AuthN (JWT/OAuth2) != AuthZ (BOLA/ABAC). Never trust an object ID from URL params without checking `tenant_id`.',
      'Always push tenant ACL filters straight into SQL WHERE clauses and Vector DB metadata filters.',
    ],
  },

  /* -------------------------------------------------------------- 11 Rate Limit + Redis Cache */
  {
    id: 'proj-rest-cache-ratelimit',
    title: 'API Gateway: Token Bucket Rate Limiter & Redis Cache-Aside',
    framework: 'Redis + FastAPI',
    group: 'REST & Security',
    module: '11',
    home: '/project/learn/11',
    level: 'Intermediate',
    summary: 'Follow how Token Bucket rate limiting, Redis Cache-Aside, and singleflight locks protect FastAPI + LLM origins from traffic bursts.',
    scenario: 'Two identical requests arrive as a cached key expires; burst limit hits 429 on a noisy tenant.',
    nodes: [
      { id: 'cli', label: 'API Client', sub: 'tenant burst', x: 90, y: 205, kind: 'user' },
      { id: 'rl', label: 'Token Bucket', sub: 'Lua atomic check', x: 280, y: 205, kind: 'guard' },
      { id: 'cache', label: 'Redis Cache', sub: 'TTL + Jitter', x: 500, y: 100, kind: 'memory' },
      { id: 'origin', label: 'FastAPI + RAG', sub: 'singleflight lock', x: 720, y: 205, kind: 'service' },
      { id: 'r429', label: '429 Retry-After', sub: 'shielded!', x: 500, y: 320, kind: 'end' },
    ],
    edges: [
      { id: 'c-rl', from: 'cli', to: 'rl' },
      { id: 'rl-ca', from: 'rl', to: 'cache', label: 'allowed' },
      { id: 'rl-429', from: 'rl', to: 'r429', label: '0 tokens' },
      { id: 'ca-or', from: 'cache', to: 'origin', label: 'miss + lock' },
    ],
    code: `if not await token_bucket.consume(tenant_id):
    return JSONResponse(status_code=429, headers={"Retry-After": "4"}, content={"detail": "Slow down"})
cached = await redis.get(cache_key)
if cached:
    return json.loads(cached)
async with redis_lock(f"lock:{cache_key}"):   # prevents cache stampede!
    result = await compute_rag(query)
    await redis.set(cache_key, json.dumps(result), ex=300 + random.randint(0, 45))`,
    steps: [
      {
        title: 'Token Bucket admits normal request → Cache Hit',
        edge: 'rl-ca',
        packet: 'tokens: 9 -> 8',
        tone: 'ok',
        narration: 'Atomic Redis Lua script decrements tenant tokens (9 -> 8) and Redis Cache-Aside returns the answer in <2 ms without touching the LLM.',
        state: { bucket_tokens: '8 / 10', cache: 'HIT (1.8 ms)', origin_calls: '0' },
        changed: ['bucket_tokens', 'cache'],
        log: 'token consumed → Redis cache HIT → returned in 1.8 ms',
        hl: ['token_bucket.consume', 'if cached:'],
      },
      {
        title: 'Key expires → Singleflight lock prevents Stampede',
        edge: 'ca-or',
        packet: '1 lock -> origin',
        narration: 'When the cached entry expires under heavy traffic, only ONE request acquires the singleflight lock to call FastAPI + RAG and stores the new result with `TTL + random jitter`.',
        state: { bucket_tokens: '7 / 10', cache: 'MISS -> Rebuilt (TTL+jitter)', origin_calls: '1 (not 200!)' },
        changed: ['cache', 'origin_calls'],
        log: 'cache miss → singleflight lock protected origin (1 call instead of 200)',
        hl: ['async with redis_lock', 'ex=300 + random.randint'],
      },
      {
        title: 'Noisy tenant exhausts bucket → HTTP 429',
        edge: 'rl-429',
        packet: '429 + Retry-After',
        tone: 'bad',
        narration: 'When burst traffic drains remaining tokens to 0, the gateway rejects immediately at the edge with `429 Too Many Requests` + `Retry-After`.',
        state: { bucket_tokens: '0 / 10', cache: 'bypassed', origin_calls: '1 (protected!)' },
        changed: ['bucket_tokens'],
        log: 'bucket empty → returned 429 Retry-After: 4',
        hl: ['status_code=429', 'Retry-After'],
      },
    ],
    match: /rate limit|token bucket|sliding window|redis|cache|stampede|gateway|proxy|scal/i,
    takeaways: [
      'Token buckets allow short UX bursts while enforcing steady sustained capacity.',
      'Pair singleflight locks with randomized TTL jitter to stop cache stampedes.',
    ],
  },

  /* -------------------------------------------------------------- 11 GenAI SSE & Async Jobs */
  {
    id: 'proj-genai-sse-jobs',
    title: 'GenAI APIs: SSE Token Streaming vs HTTP 202 Queue + DLQ',
    framework: 'FastAPI Streaming + Celery',
    group: 'FastAPI & GenAI',
    module: '11',
    home: '/project/learn/11',
    level: 'Intermediate',
    summary: 'Contrast real-time Server-Sent Events (including disconnect cancellation!) against durable HTTP 202 jobs + RabbitMQ + Dead Letter Queue.',
    scenario: 'A chat endpoint streams tokens via SSE, while a 200-page PDF ingestion hits HTTP 202 + queue + DLQ.',
    nodes: [
      { id: 'ui', label: 'Client App', sub: 'EventSource / POST', x: 95, y: 205, kind: 'user' },
      { id: 'api', label: 'FastAPI ASGI', sub: 'SSE or 202', x: 310, y: 205, kind: 'service' },
      { id: 'sse', label: 'LLM Stream', sub: 'TTFT + cancel check', x: 540, y: 90, kind: 'llm' },
      { id: 'q', label: 'Broker Queue', sub: 'RabbitMQ + outbox', x: 540, y: 320, kind: 'memory' },
      { id: 'dlq', label: 'Worker / DLQ', sub: 'ACK or dead-letter', x: 735, y: 320, kind: 'guard' },
    ],
    edges: [
      { id: 'u-a', from: 'ui', to: 'api' },
      { id: 'a-s', from: 'api', to: 'sse', label: 'SSE stream' },
      { id: 'a-q', from: 'api', to: 'q', label: '202 Accepted' },
      { id: 'q-d', from: 'q', to: 'dlq', label: 'consume / retry' },
    ],
    code: `@app.get("/v1/chat/stream")
async def stream(request: Request):
    async def gen():
        async for tok in llm.astream(prompt):
            if await request.is_disconnected():  # stop burning LLM tokens!
                break
            yield f"data: {tok}\\n\\n"
    return StreamingResponse(gen(), media_type="text/event-stream")`,
    steps: [
      {
        title: 'Interactive Chat → SSE Streaming (Measure TTFT)',
        edge: 'a-s',
        packet: 'data: token #1',
        tone: 'ok',
        narration: 'For interactive chat, `StreamingResponse(media_type="text/event-stream")` pushes tokens immediately as they generate, optimizing **Time To First Token (TTFT)**.',
        state: { mode: 'SSE Streaming', ttft_ms: '210', status: '200 event-stream', disconnect_guard: 'watching' },
        changed: ['mode', 'ttft_ms', 'status'],
        log: 'SSE started → first token emitted in 210 ms',
        hl: ['StreamingResponse', 'yield f"data:'],
        predict: {
          question: 'If the user closes their browser tab mid-generation, why check `await request.is_disconnected()` inside the generator?',
          options: ['Otherwise FastAPI restarts the server', 'Otherwise your backend continues streaming and paying for all remaining LLM output tokens into thin air', 'SSE forbids client closes', 'It converts SSE to WebSockets'],
          answer: 1,
          explain: 'Without checking `is_disconnected()` (or cancellation hooks), upstream LLM streaming keeps running and billing tokens for nobody.',
        },
      },
      {
        title: 'Bulk 200-Page Ingestion → HTTP 202 + Durable Queue',
        edge: 'a-q',
        packet: '202 job_84',
        narration: 'Heavy jobs that take minutes NEVER block an HTTP socket. Return `202 Accepted` with `job_id` and persist an outbox message into RabbitMQ/Redis.',
        state: { mode: 'Async Job Queue', ttft_ms: 'n/a', status: '202 job_84 queued', disconnect_guard: 'durable' },
        changed: ['mode', 'status'],
        log: 'POST /v1/ingest → 202 Accepted (job_84) pushed to queue',
        hl: ['status=202'],
      },
      {
        title: 'Poison Message Exhausts Retries → Moves to DLQ',
        edge: 'q-d',
        packet: 'NACK -> DLQ',
        tone: 'warn',
        narration: 'Workers ACK on completion. If a corrupt PDF fails 3 retries, moving it to a **Dead Letter Queue (DLQ)** prevents blocking healthy jobs while allowing inspection and replay.',
        state: { mode: 'Async Job Queue', status: 'DLQ + Alert', worker: 'healthy' },
        changed: ['status'],
        log: 'corrupt doc exceeded max retries → moved safely to DLQ',
        hl: ['request.is_disconnected'],
      },
    ],
    match: /streaming|sse|websocket|webhook|202|queue|celery|rabbitmq|dlq|outbox|ttft|generative ai api/i,
    takeaways: [
      'Measure TTFT & TPS on SSE streams and always check `request.is_disconnected()` to save wasted LLM spend.',
      'Use HTTP 202 + durable queue + DLQ for jobs lasting longer than a few seconds.',
    ],
  },

  /* -------------------------------------------------------------- 12 FastAPI ASGI & Pydantic V2 */
  {
    id: 'proj-fastapi-asgi-pydantic',
    title: 'FastAPI Internals: ASGI (scope/receive/send), Depends & Pydantic V2',
    framework: 'FastAPI + Pydantic V2',
    group: 'FastAPI & GenAI',
    module: '12',
    home: '/project/learn/12',
    level: 'Intermediate',
    summary: 'Walk a request through Uvicorn ASGI, Starlette middleware, Depends() DI, Pydantic V2 Rust validation, and event-loop vs threadpool dispatch.',
    scenario: 'A POST /v1/resumes request hits Uvicorn, resolves Depends(), validates via Pydantic V2, and avoids freezing the event loop.',
    nodes: [
      { id: 'uv', label: 'Uvicorn ASGI', sub: 'scope/receive/send', x: 90, y: 205, kind: 'service' },
      { id: 'mw', label: 'Starlette MW', sub: 'CORS + RequestID', x: 280, y: 205, kind: 'router' },
      { id: 'dep', label: 'Depends() + V2', sub: 'DI + Rust validate', x: 495, y: 205, kind: 'guard' },
      { id: 'ev', label: 'async def Loop', sub: 'non-blocking await', x: 715, y: 100, kind: 'agent' },
      { id: 'tp', label: 'def Threadpool', sub: 'AnyIO sync worker', x: 715, y: 315, kind: 'tool' },
    ],
    edges: [
      { id: 'u-m', from: 'uv', to: 'mw', label: 'ASGI' },
      { id: 'm-d', from: 'mw', to: 'dep', label: 'route' },
      { id: 'd-ev', from: 'dep', to: 'ev', label: 'async def' },
      { id: 'd-tp', from: 'dep', to: 'tp', label: 'sync def' },
    ],
    code: `@app.post("/v1/resumes")
async def parse_resume(
    body: ResumeExtraction,          # Pydantic V2 Rust core validates before handler runs!
    tenant: str = Depends(get_tenant),
    client: httpx.AsyncClient = Depends(get_http_client),
):
    # Safe: non-blocking async I/O. Never call requests.get() or time.sleep() here!
    return await score_resume(client, tenant, body)`,
    steps: [
      {
        title: 'Uvicorn builds ASGI scope/receive/send',
        edge: 'u-m',
        packet: 'ASGI scope',
        narration: 'Uvicorn parses raw TCP bytes into an ASGI `scope` dict + async `receive`/`send` callables and passes them into Starlette middleware.',
        state: { layer: 'Uvicorn + Starlette', validation: 'pending', execution: 'ASGI' },
        changed: ['layer'],
        log: 'Uvicorn → Starlette middleware added X-Request-ID',
        hl: ['@app.post("/v1/resumes")'],
      },
      {
        title: 'Depends() Tree + Pydantic V2 Rust Core Validate',
        edge: 'm-d',
        packet: 'BaseModel check',
        tone: 'ok',
        narration: 'FastAPI resolves `Depends(get_tenant)` and `Depends(get_http_client)`, then runs Pydantic V2 Rust validation (`ResumeExtraction`). Invalid payloads return HTTP 422 before your endpoint runs a single line!',
        state: { layer: 'Depends + Pydantic V2', validation: 'PASSED (0.2ms Rust)', execution: 'dispatching' },
        changed: ['layer', 'validation'],
        log: 'Depends() resolved · Pydantic V2 validated nested schema in 0.2 ms',
        hl: ['body: ResumeExtraction', 'Depends(get_tenant)'],
        predict: {
          question: 'If you mistakenly called synchronous `requests.post()` inside this `async def` route, what breaks?',
          options: ['Pydantic raises ValidationError', 'It freezes the single event loop for ALL concurrent users on that Uvicorn worker', 'FastAPI automatically moves async def to a threadpool', 'Uvicorn spawns a new browser'],
          answer: 1,
          explain: 'FastAPI runs `async def` directly on the event loop; blocking sync calls freeze the entire loop. Only plain `def` routes run in the AnyIO threadpool.',
        },
      },
      {
        title: 'Dispatch non-blocking async def coroutine',
        edge: 'd-ev',
        packet: 'await I/O',
        tone: 'ok',
        narration: 'Because `parse_resume` uses `async def` with `httpx.AsyncClient` (`await`), Uvicorn handles hundreds of concurrent requests concurrently — then runs `yield` cleanup after sending the response.',
        state: { layer: 'Event Loop', validation: 'PASSED', execution: 'async non-blocking' },
        changed: ['layer', 'execution'],
        log: 'await score_resume() → response sent → Depends yield cleanup complete',
        hl: ['return await score_resume'],
      },
    ],
    match: /fastapi|uvicorn|gunicorn|starlette|asgi|wsgi|pydantic|depends|resume|structured llm/i,
    takeaways: [
      'FastAPI = Uvicorn (ASGI server) + Starlette (routing/middleware) + Pydantic V2 (Rust validation).',
      'Use `async def` ONLY with awaitable I/O; use `def` for blocking libraries so AnyIO offloads to threads.',
    ],
  },

  /* -------------------------------------------------------------- 12 Full-Stack Capstone */
  {
    id: 'proj-capstone-e2e',
    title: 'Integrated Capstone: FastAPI + RAG + LangGraph + Playwright + Eval Gate',
    framework: 'Full Stack AI',
    group: 'Capstone',
    module: '12',
    home: '/project/learn/12',
    level: 'Advanced',
    summary: 'Follow a PR release test run across the entire platform: TS/Zod trigger → FastAPI 202 → Hybrid RAG → LangGraph Planner → Playwright MCP → Eval Quality Gate.',
    scenario: 'A developer opens a PR; the platform retrieves relevant specs via RAG, plans checks with LangGraph, executes Playwright tests, and gates deployment.',
    nodes: [
      { id: 'ui', label: 'TS + Zod UI', sub: 'Idempotency-Key', x: 85, y: 205, kind: 'user' },
      { id: 'fa', label: 'FastAPI ASGI', sub: 'RS256 + 202 + SSE', x: 270, y: 205, kind: 'service' },
      { id: 'rag', label: 'Hybrid RAG', sub: 'specs + code diffs', x: 465, y: 90, kind: 'memory' },
      { id: 'lg', label: 'LangGraph + MCP', sub: 'Playwright runner', x: 465, y: 320, kind: 'agent' },
      { id: 'gate', label: 'Eval & OTel Gate', sub: 'pass rate + traces', x: 715, y: 205, kind: 'guard' },
    ],
    edges: [
      { id: 'u-f', from: 'ui', to: 'fa', label: 'POST /runs' },
      { id: 'f-r', from: 'fa', to: 'rag', label: 'retrieve' },
      { id: 'r-l', from: 'rag', to: 'lg', label: 'test plan' },
      { id: 'l-g', from: 'lg', to: 'gate', label: 'traces + HAR' },
    ],
    code: `@app.post("/v1/test-runs", status_code=202)
async def launch_run(req: RunRequest, claims: Claims = Depends(verify_jwt)):
    specs = await rag_hybrid_search(req.diff_summary, tenant=claims.tenant_id)
    plan = await langgraph_planner.ainvoke({"specs": specs, "model": "pydantic_v2"})
    pw_result = await playwright_mcp_pool.execute(plan)
    return eval_gate.score(pw_result, min_faithfulness=0.85, min_pass_rate=0.95)`,
    steps: [
      {
        title: 'TS + Zod submits signed run with Idempotency-Key',
        edge: 'u-f',
        packet: 'RS256 + Zod OK',
        narration: 'The TypeScript dashboard validates the form with Zod, attaches an RS256 Bearer token and Idempotency-Key, and triggers `POST /v1/test-runs` (returning 202 + SSE stream).',
        state: { auth_tenant: 'acme-qa', retrieved_specs: '0', tests_passed: '0/0', gate: 'RUNNING' },
        changed: ['auth_tenant'],
        log: 'POST /v1/test-runs → 202 Accepted + SSE live stream opened',
        hl: ['@app.post("/v1/test-runs"'],
      },
      {
        title: 'Tenant-scoped Hybrid RAG fetches relevant PR specs',
        edge: 'f-r',
        packet: 'top-4 chunks',
        narration: 'BM25 + vector search (with `tenant=acme-qa` ACL filter) retrieves the acceptance rules affected by the git diff.',
        state: { auth_tenant: 'acme-qa', retrieved_specs: '4 specs (RRF)', tests_passed: '0/0', gate: 'PLANNING' },
        changed: ['retrieved_specs', 'gate'],
        log: 'Hybrid RAG retrieved 4 grounded spec chunks',
        hl: ['rag_hybrid_search'],
      },
      {
        title: 'LangGraph + Playwright MCP runs Docker browser suite',
        edge: 'r-l',
        packet: 'Playwright MCP',
        narration: 'The planner outputs a Pydantic V2 test plan, executes semantic Playwright checks + `page.route()` fault scenarios inside isolated BrowserContexts, and captures traces.',
        state: { auth_tenant: 'acme-qa', retrieved_specs: '4 specs', tests_passed: '18 / 18', gate: 'SCORING' },
        changed: ['tests_passed', 'gate'],
        log: 'Playwright Docker pool completed 18/18 checks in 9.4 s',
        hl: ['langgraph_planner.ainvoke', 'playwright_mcp_pool.execute'],
        predict: {
          question: 'All 18 Playwright clicks pass, but RAG faithfulness drops to 0.71. What should the Capstone Eval Gate do?',
          options: ['Deploy automatically because Playwright clicks passed', 'Block the release because faithfulness (0.71) is below the 0.85 quality gate threshold', 'Skip OpenTelemetry spans', 'Switch JWT from RS256 to HS256'],
          answer: 1,
          explain: 'AI platforms need multi-dimensional quality gates: deterministic E2E functional checks AND grounded RAG/LLM evaluation metrics + latency/cost SLOs.',
        },
      },
      {
        title: 'Eval Gate scores faithfulness + emits OTel trace',
        edge: 'l-g',
        packet: 'PASS (0.94)',
        tone: 'ok',
        narration: 'Pass rate is 100%, RAG faithfulness is 0.94 (>= 0.85), p95 latency is within SLO, and OpenTelemetry spans archive the full run trace.',
        state: { auth_tenant: 'acme-qa', retrieved_specs: '4 specs', tests_passed: '18 / 18', gate: 'APPROVED (faithfulness 0.94)' },
        changed: ['gate'],
        log: 'EVAL GATE PASSED → OpenTelemetry trace archived → PR ready to merge',
        hl: ['eval_gate.score'],
      },
    ],
    match: /capstone|platform|overview|roadmap|end-to-end|evaluation/i,
    takeaways: [
      'A full-stack AI engineer connects frontend TS/Zod contracts, FastAPI async APIs, Playwright verification, RAG grounding, and automated eval gates.',
      'OpenTelemetry trace IDs tie UI clicks, FastAPI spans, RAG retrieval, and LLM calls into one debuggable timeline.',
    ],
  },
]
