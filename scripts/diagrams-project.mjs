/**
 * Curated Mermaid diagrams for the VeeraProject track (Modules 01–12).
 * Pinned by module (`where.module`), optional lesson title (`where.topic`), and section; validated by validate-diagrams.mjs.
 */
const at = (module, topic, section) => ({ module, topic, section, fallbackFirst: true })

export const PROJECT_DIAGRAMS = [
  /* ---------------------------------------------------------------- 01 JS Core */
  {
    id: 'proj-js-memory',
    where: at('01', /Runtime|Objects|Destructuring/i),
    title: 'Stack bindings vs Heap objects in JavaScript',
    mermaid: `
flowchart LR
  subgraph STACK["Stack (Bindings)"]
    C1["const cfgA"]
    C2["const cfgB"]
    C3["const safeCopy"]
  end
  subgraph HEAP["Heap (Objects)"]
    O1["#1: model gpt-4o, temp 0.8"]
    O2["#2: model gpt-4o, temp 0.2"]
  end
  C1 -->|"reference"| O1
  C2 -->|"same reference! mutating B mutates A"| O1
  C3 -->|"spread + clone arrays"| O2`,
    explain: `**\`const\` locks the binding arrow, not the heap object.** Assigning \`const b = a\` copies the reference, so mutating \`b.temperature\` silently breaks \`a\`. Always clone with object spread and shallow/deep array copies when configuring independent AI agents.`,
  },
  {
    id: 'proj-js-closures',
    where: at('01', /Functions|Callbacks|Closures/i),
    title: 'Closure scope: var (shared slot) vs let (fresh per-iteration slot)',
    mermaid: `
flowchart TB
  subgraph VAR["for (var i = 0; i < 3; i++)"]
    VSLOT["Single Function-Scoped i = 3"]
    CB1["Callback 0"] --> VSLOT
    CB2["Callback 1"] --> VSLOT
    CB3["Callback 2"] --> VSLOT
  end
  subgraph LET["for (let j = 0; j < 3; j++)"]
    L0["Block Env 0: j = 0"] --> C0["Callback 0 reads 0"]
    L1["Block Env 1: j = 1"] --> C1["Callback 1 reads 1"]
    L2["Block Env 2: j = 2"] --> C2["Callback 2 reads 2"]
  end`,
    explain: `Every function retains a live link to its lexical environment. With \`var\`, all loop callbacks share one function-scoped variable that already reached \`3\` when timers run; \`let\` creates a separate block environment per iteration.`,
  },

  /* ---------------------------------------------------------------- 02 JS Async */
  {
    id: 'proj-event-loop',
    where: at('02', /Asynchronous|Event Loop|Promises/i),
    title: 'The JavaScript Event Loop: Call Stack -> Microtasks -> Macrotasks',
    mermaid: `
flowchart LR
  CS["1. Call Stack (Sync JS)"] -->|"register timer / fetch"| API["Host APIs (libuv / Browser)"]
  CS -->|"stack empty"| MIC{"2. Microtask Queue Empty?"}
  MIC -->|"No: drain ALL Promise.then / await"| CS
  MIC -->|"Yes"| MAC{"3. Pick ONE Macrotask"}
  API -->|"Promise resolves"| MIC
  API -->|"setTimeout / IO ready"| MAC
  MAC -->|"push callback"| CS`,
    explain: `JavaScript never runs two callbacks simultaneously on one thread. Synchronous frames clear the **Call Stack** first, then **ALL pending Microtasks** (\`Promise.then\`, \`await\` continuations) drain to zero before the loop pulls **one Macrotask** (\`setTimeout\`, I/O).`,
  },
  {
    id: 'proj-promise-combinators',
    where: at('02', /Promise|Concurrency|Retry/i),
    title: 'Choosing Promise.all vs allSettled vs race vs any',
    mermaid: `
flowchart TD
  Q(["Running parallel LLM / tool calls"]) --> N{"What failure behavior do you want?"}
  N -- "All must succeed; cancel immediately on first error" --> ALL["Promise.all + AbortController"]
  N -- "Collect partial successes + errors per agent" --> SET["Promise.allSettled"]
  N -- "First response OR timeout wins (whichever finishes first)" --> RACE["Promise.race([work, timeout])"]
  N -- "First SUCCESSFUL provider wins; ignore single failure" --> ANY["Promise.any([openai, azure, anthropic])"]`,
    explain: `In multi-agent fan-out, **\`Promise.all\`** rejects on the first failure (leaving sibling requests running unless you abort them via \`AbortController\`), whereas **\`Promise.allSettled\`** gives every branch's status so partial agent output still survives.`,
  },

  /* ---------------------------------------------------------------- 03 TS Core & Functions */
  {
    id: 'proj-ts-boundary',
    where: at('03', /Fundamentals|Validation|Zod|Runtime/i),
    title: 'TypeScript Compile-Time Checking vs Zod Runtime Boundary',
    mermaid: `
flowchart LR
  SRC["TS Source Code"] -->|"Build time"| TSC["tsc Type Checker"]
  TSC -->|"Type error"| ERR1["Blocked in IDE / CI"]
  TSC -->|"Types erased!"| JS["Compiled JS"]
  EXT["External LLM / API JSON"] -->|"type: unknown"| ZOD["Zod schema.safeParse()"]
  ZOD -->|"Invalid JSON / wrong field"| ERR2["Controlled Error + Retry / 422"]
  ZOD -->|"Validated + narrowed"| APP["Typed Application Logic"]`,
    explain: `TypeScript interfaces exist **only at compile time** and vanish in JavaScript output. External inputs from LLMs, APIs, and DOM forms must cross a runtime **Zod boundary** so malformed values are caught safely instead of crashing deep inside your app.`,
  },
  {
    id: 'proj-ts-overloads',
    where: at('03', /Functions|Overloads|Closures/i),
    title: 'Function Overloads vs Union Return Types',
    mermaid: `
flowchart LR
  CALL1["runPrompt(text: string)"] --> SIG1["Overload 1 -> Promise of string"]
  CALL2["runPrompt(batch: string[])"] --> SIG2["Overload 2 -> Promise of string[]"]
  SIG1 --> IMPL["Single Implementation (erased overloads at runtime)"]
  SIG2 --> IMPL`,
    explain: `Overloads keep callers ergonomic: passing one string returns \`string\` instead of forcing callers to unwrap \`string | string[]\`. Remember overload signatures disappear at runtime — the single implementation signature handles all cases safely.`,
  },

  /* ---------------------------------------------------------------- 04 TS Type System & OOP */
  {
    id: 'proj-ts-discriminated',
    where: at('04', /Interfaces|Type Aliases|Unions/i),
    title: 'Discriminated Union + Exhaustiveness Check with never',
    mermaid: `
flowchart TD
  EV["AgentStep Union (kind literal discriminant)"] --> SW{"switch (step.kind)"}
  SW -- "'retrieve'" --> R["step.query & topK narrowed"]
  SW -- "'tool'" --> T["step.toolName & args narrowed"]
  SW -- "'final'" --> F["step.citations narrowed"]
  SW -- "default" --> NV["const _x: never = step (Compile error if a new kind is missed!)"]`,
    explain: `Attaching a literal \`kind\` or \`type\` property lets TypeScript narrow the exact payload inside each branch — and assigning \`default\` to \`never\` guarantees the compiler flags any unhandled state when you add a new agent step later.`,
  },
  {
    id: 'proj-ts-solid-di',
    where: at('04', /Object-Oriented|SOLID|Adapters|Generics/i),
    title: 'Dependency Inversion: Swappable LLM Provider Adapters',
    mermaid: `
flowchart LR
  SVC["TestPlanService (Depends on Interface)"] --> IF["interface LLMClient { complete(req): Promise }"]
  OAI["OpenAIAdapter implements LLMClient"] --> IF
  AZ["AzureFoundryAdapter implements LLMClient"] --> IF
  MOCK["FakeTestAdapter implements LLMClient"] --> IF`,
    explain: `Instead of hardcoding OpenAI inside business services or Playwright helpers, inject an \`LLMClient\` interface via the constructor. Production uses Azure/OpenAI while unit tests inject a deterministic \`FakeTestAdapter\` in milliseconds.`,
  },

  /* ---------------------------------------------------------------- 05 Production TS */
  {
    id: 'proj-ts-resilience',
    where: at('05', /Production|Circuit|Client|Resilience/i),
    title: 'Resilient Production TypeScript Client Pipeline',
    mermaid: `
flowchart LR
  REQ["Typed Request"] --> CB{"Circuit Breaker Open?"}
  CB -- "Yes (fail fast)" --> ERR["Return Fallback / 503"]
  CB -- "Closed / Half-Open" --> TO["AbortController Timeout + Correlation ID"]
  TO -->|"HTTP 200"| ZOD["Zod Response Validation"]
  TO -->|"429 / 503"| RET["Exponential Backoff + Full Jitter Retry"]
  RET --> CB
  ZOD --> LOG["Structured JSON Log (traceId, latencyMs, tokens)"]`,
    explain: `A production TS AI client wraps every call with a **circuit breaker** (avoiding cascading hangs), **per-attempt AbortController timeouts**, **jittered retries** on transient 429/5xx, **Zod schema validation**, and **correlation-ID logging**.`,
  },

  /* ---------------------------------------------------------------- 06 Playwright Core */
  {
    id: 'proj-pw-arch',
    where: at('06', /Fundamentals|Architecture|Browser/i),
    title: 'Playwright Out-of-Process WebSocket Architecture & Isolation',
    mermaid: `
flowchart LR
  TEST["Test Runner (Node.js / pytest)"] -->|"Single Persistent WebSocket"| DRV["Playwright Engine (CDP / Protocol)"]
  DRV --> B1["Browser Process (Chromium / Firefox / WebKit)"]
  B1 --> C1["BrowserContext 1 (Tenant A Cookies + Storage)"]
  B1 --> C2["BrowserContext 2 (Tenant B Incognito Isolated)"]
  C1 --> P1["Page 1 (DOM + Accessibility Tree)"]`,
    explain: `Unlike legacy WebDriver HTTP round-trips per command, Playwright streams commands over one persistent WebSocket. Spinning up isolated **BrowserContexts** inside one Browser gives clean incognito cookies/localStorage per test in ~15 ms.`,
  },
  {
    id: 'proj-pw-autowait',
    where: at('06', /Auto-Waiting|Actionability|Synchronization|Locators/i),
    title: 'Playwright Actionability Checks & Web-First Assertion Retry Loop',
    mermaid: `
flowchart TB
  LOC["page.getByRole('button', { name: 'Submit' }).click()"] --> A["1. Attached to DOM?"]
  A --> V["2. Visible (non-zero box, not hidden)?"]
  V --> S["3. Stable (not animating across 2 frames)?"]
  S --> R["4. Receives Events (not covered by modal/spinner)?"]
  R --> E["5. Enabled (not disabled)?"]
  E -->|"All pass"| ACT["Execute Click"]
  E -->|"Pending before timeout"| LOC`,
    explain: `Playwright automatically polls the DOM and performs **five actionability checks** before clicking — plus **web-first assertions** (\`expect(locator).toBeVisible()\`) auto-retry until the condition holds or timeout expires, eliminating arbitrary \`sleep()\` calls.`,
  },

  /* ---------------------------------------------------------------- 07 Playwright Ops & Architecture */
  {
    id: 'proj-pw-pom-fixtures',
    where: at('07', /Framework|Architecture|Fixtures|Page Object/i),
    title: 'Layered Playwright Framework: Fixtures -> Page Objects -> Components -> Specs',
    mermaid: `
flowchart TB
  SPEC["Test Spec (Business Intent Only)"] --> FIX["Fixtures (conftest.py / test.extend)"]
  FIX -->|"Worker scope"| AUTH["storageState Auth Cookie Cache"]
  FIX -->|"Test scope"| POM["Page Objects & Reusable Components"]
  POM --> LOC["Semantic Locators (getByRole / getByTestId)"]
  FIX --> API["APIRequestContext Seeding + Cleanup"]`,
    explain: `Keep selectors inside **Page & Component Objects**, lifecycle & test-tenant setup inside **Fixtures** (\`conftest.py\` or \`test.extend()\`), and readable business assertions inside **Test Specs** so UI changes update one locator rather than 50 tests.`,
  },

  /* ---------------------------------------------------------------- 08 Playwright API Mocking & BDD & Prod */
  {
    id: 'proj-pw-route-mock',
    where: at('08', /API|Network|Route|Mock/i),
    title: 'Network Interception with page.route() for Deterministic AI & Error Tests',
    mermaid: `
flowchart LR
  UI["Browser UI fetch('/v1/chat')"] --> INT{"page.route('**/v1/chat')"}
  INT -->|"Mock 200"| FAKE["route.fulfill(deterministic JSON)"]
  INT -->|"Inject fault"| ERR["route.fulfill(429 Retry-After / 503)"]
  INT -->|"Modify live"| PATCH["route.fetch() -> inspect/override -> fulfill"]
  FAKE --> UI
  ERR --> UI`,
    explain: `Intercepting \`/v1/chat\` with **\`page.route()\`** lets browser E2E tests verify streaming error banners, retry countdowns, and malformed-JSON fallbacks deterministically in milliseconds — zero live LLM cost or flakiness.`,
  },
  {
    id: 'proj-pw-bdd-ci',
    where: at('08', /Behavior-Driven|Cucumber|Gherkin|Docker|CI/i),
    title: 'BDD Gherkin -> Step Bindings -> Sharded Docker CI Gate',
    mermaid: `
flowchart LR
  FEAT["login.feature (Given / When / Then)"] --> STEP["Step Definitions (Cucumber.js / pytest-bdd)"]
  STEP --> POM["Playwright POM + BrowserContext"]
  POM -->|"CI Matrix Shards 1..4"| ART["Trace Viewer + HTML/JUnit + Video on Retry"]
  ART --> GATE{"Quality Gate Passed?"}`,
    explain: `Gherkin describes **what** business behavior matters, while **Step Definitions** delegate UI work to Page Objects. Running across sharded official Playwright Docker images with \`trace: 'on-first-retry'\` gives instant timeline + DOM + network replay for any CI failure.`,
  },

  /* ---------------------------------------------------------------- 09 Agentic AI + Playwright */
  {
    id: 'proj-pw-agentic-mcp',
    where: at('09', /Agentic|MCP|Browser Agents|LangGraph/i),
    title: 'Agentic Playwright Loop via Accessibility Snapshot, MCP & HITL Guard',
    mermaid: `
flowchart TB
  OBS["1. Capture Accessibility Tree + URL Snapshot"] --> PLAN["2. LLM Chooses Typed Action (click / fill / verify)"]
  PLAN --> GUARD{"3. Safety & Budget Guard"}
  GUARD -->|"Destructive / External Spend"| HITL["Pause for Human-in-the-Loop Approval"]
  GUARD -->|"Allowed & Under Step Cap"| EXEC["4. Playwright MCP Executes Action"]
  HITL -->|"Approved"| EXEC
  EXEC --> VER["5. Assert DOM / URL Change & Log Span"]
  VER --> OBS`,
    explain: `Production browser agents operate on structured **Accessibility Tree snapshots** (much cheaper and cleaner than raw HTML or screenshots), validate every tool call against typed schemas + **HITL approval gates**, and enforce strict step and token budgets.`,
  },

  /* ---------------------------------------------------------------- 10 REST Design & Security */
  {
    id: 'proj-rest-lifecycle',
    where: at('10', /HTTP|Fundamentals|Design|Resource/i),
    title: 'HTTP Request Lifecycle: DNS -> TCP -> TLS -> Keep-Alive Reuse',
    mermaid: `
flowchart LR
  CLI["HTTPX AsyncClient Pool"] -->|"1. DNS (cached)"| DNS["IP Address"]
  DNS -->|"2. TCP SYN/ACK (1 RTT)"| TCP["Socket"]
  TCP -->|"3. TLS 1.3 (1 RTT)"| TLS["Encrypted Channel"]
  TLS -->|"4. Reused via Keep-Alive!"| API["FastAPI Reverse Proxy -> Endpoint"]`,
    explain: `Creating a fresh client per LLM or tool request repeats DNS, TCP, and TLS handshakes every call. Reusing a shared **\`httpx.AsyncClient\` connection pool** keeps TLS sessions warm and cuts tail latency dramatically.`,
  },
  {
    id: 'proj-rest-security',
    where: at('10', /Security|Auth|JWT|BOLA|OWASP|OAuth/i),
    title: 'API Defense in Depth: JWT AuthN vs Tenant ABAC & BOLA Check',
    mermaid: `
flowchart LR
  REQ["Bearer RS256 JWT + Request"] --> AUTHN{"1. Verify Signature, exp, aud, iss"}
  AUTHN -->|"Invalid / Expired"| R401["401 Unauthorized"]
  AUTHN -->|"Valid Identity"| AUTHZ{"2. Role + Tenant + Resource Ownership Check"}
  AUTHZ -->|"Cross-tenant / BOLA violation"| R403["403 Forbidden (Audit Alert)"]
  AUTHZ -->|"Authorized"| RAG["Scoped Query: WHERE tenant_id = token.tenant_id"]`,
    explain: `Valid JWT authentication never proves **object-level authorization**. Every handler and vector query must explicitly filter by \`tenant_id\` and verify resource ownership to prevent **BOLA** and cross-tenant RAG leakage.`,
  },

  /* ---------------------------------------------------------------- 11 Scale & GenAI APIs */
  {
    id: 'proj-rest-cache-rl',
    where: at('11', /Architecture|Caching|Rate Limit|Redis/i),
    title: 'API Gateway Traffic Shield: Rate Limiter -> Cache-Aside -> Origin',
    mermaid: `
flowchart LR
  REQ["Client Request"] --> RL{"Token Bucket in Redis"}
  RL -->|"Tokens exhausted"| R429["429 Too Many Requests + Retry-After"]
  RL -->|"Allowed"| CACHE{"Redis Cache Hit?"}
  CACHE -->|"Hit (< 2 ms)"| HIT["Return Cached Result"]
  CACHE -->|"Miss + Singleflight Lock"| ORI["FastAPI + Vector DB Origin"]
  ORI -->|"Set TTL + Jitter"| CACHE`,
    explain: `Protect expensive FastAPI and LLM backends with an atomic Redis **Token Bucket** rate limiter upfront and **Cache-Aside + Singleflight lock + TTL jitter** so hot key expirations don't trigger a cache stampede.`,
  },
  {
    id: 'proj-genai-sse-async',
    where: at('11', /Generative AI API|Streaming|SSE|Async|Queues/i),
    title: 'GenAI API Patterns: Real-Time SSE Streaming vs Durable HTTP 202 Queue',
    mermaid: `
flowchart TB
  REQ["Client Request"] --> CHOICE{"Interactive Chat OR Heavy Ingestion?"}
  CHOICE -->|"Interactive LLM Stream"| SSE["FastAPI StreamingResponse (text/event-stream, id:, TTFT)"]
  SSE -->|"Client Disconnects"| ABORT["Cancel Upstream LLM Generation Immediately!"]
  CHOICE -->|"Multi-Doc Ingestion / Long Agent"| J202["HTTP 202 Accepted + Idempotency-Key + job_id"]
  J202 --> Q["RabbitMQ / Redis Queue + Outbox"]
  Q --> W["Worker Pool (ACK on success)"]
  W -->|"Max retries exhausted"| DLQ["Dead Letter Queue (DLQ) + Alert"]`,
    explain: `Use **SSE streaming** for interactive token delivery (and cancel upstream generation immediately if \`request.is_disconnected()\` fires), and use **HTTP 202 + durable message queue + DLQ** for long-running RAG ingestion or multi-step test jobs.`,
  },

  /* ---------------------------------------------------------------- 12 FastAPI, Pydantic V2 & Capstone */
  {
    id: 'proj-fastapi-asgi',
    where: at('12', /FastAPI|Internal|Uvicorn|ASGI|Lifecycle/i),
    title: 'FastAPI Request Flow: ASGI -> Middleware -> Depends() -> Sync vs Async',
    mermaid: `
flowchart TB
  CONN["HTTP Connection"] --> UV["Uvicorn ASGI Server (scope, receive, send)"]
  UV --> MW["Starlette Middleware (CORS, Request ID, Timing)"]
  MW --> RT["Path & Method Router"]
  RT --> DEP["Resolve Depends() Tree + Yield Cleanup"]
  DEP --> PYD["Pydantic V2 Rust Validation (422 on mismatch)"]
  PYD --> HANDLER{"Endpoint Signature?"}
  HANDLER -->|"async def"| EV["Event Loop (Non-blocking await)"]
  HANDLER -->|"def"| TP["AnyIO Worker Threadpool"]`,
    explain: `FastAPI coordinates **Uvicorn** (sockets + event loop), **Starlette** (routing + middleware + ASGI), and **Pydantic V2** (Rust-speed validation). Knowing whether your handler belongs on the **event loop (\`async def\`)** or **threadpool (\`def\`)** prevents production freezes.`,
  },
  {
    id: 'proj-pydantic-4levels',
    where: at('12', /Pydantic|Structured|Resume|Schema/i),
    title: '4 Levels of Structured LLM Output Correctness with Pydantic V2',
    mermaid: `
flowchart LR
  L1["1. Valid JSON Syntax"] --> L2["2. Schema Types & Field Constraints (BaseModel)"]
  L2 --> L3["3. Cross-Field Business Rules (model_validator)"]
  L3 --> L4["4. Grounded Against Source Context (No Hallucinated IDs)"]`,
    explain: `Provider JSON mode only solves Level 1. **Pydantic V2** enforces Level 2 (types, lengths, regex, \`extra="forbid"\`, discriminated unions) and Level 3 (cross-field \`from <= to\` rules), while domain checks verify Level 4 against your retrieved sources.`,
  },
  {
    id: 'proj-capstone-platform',
    where: at('12', /Capstone|Platform/i),
    title: 'Integrated 8-Phase AI Software Testing, RAG & Evaluation Capstone',
    mermaid: `
flowchart TB
  TS["TypeScript + Zod Control Plane"] -->|"JWT + Idempotency-Key"| FA["FastAPI ASGI + Pydantic V2"]
  FA -->|"202 + SSE Stream"| ORC["LangGraph / ADK Multi-Agent Planner"]
  ORC -->|"Hybrid Search"| RAG["Spec & Diff RAG Index"]
  ORC -->|"Playwright MCP + APIRequestContext"| PW["Sharded Docker Browser Pool"]
  PW -->|"Artifacts + Traces"| GATE["Eval Quality Gate (Faithfulness, Pass Rate, Cost)"]
  GATE --> MON["OpenTelemetry Spans + SLO Alerts"]`,
    explain: `The Capstone unites every skill in this track: **TypeScript + Zod** frontend contracts, **FastAPI + Pydantic V2** backend with auth and SSE streaming, **Playwright** automation & mocking, **RAG** context grounding, **LangGraph/ADK** orchestration, and automated **evaluation & observability** gates.`,
  },
]
