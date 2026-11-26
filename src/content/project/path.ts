/**
 * VeeraProject guided learning path: Stages -> Sub-module Topics -> Core / Practice / Deeper lessons.
 */
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { resolvePath, type ResolvedPath, type StageDef } from '@/content/paths/engine'

const S = {
  ROADMAP: /^00\. Roadmap/,
  JS1: /^JS-1:/,
  JS2: /^JS-2:/,
  TS1: /^TS-1:/,
  TS2: /^TS-2:/,
  TS3: /^TS-3:/,
  TS4: /^TS-4:/,
  TS5: /^TS-5:/,
  TS6: /^TS-6:/,
  PW1: /^PW-1:/,
  PW2: /^PW-2:/,
  PW3: /^PW-3:/,
  PW4: /^PW-4:/,
  PW5: /^PW-5:/,
  PW6: /^PW-6:/,
  PW7: /^PW-7:/,
  PW8: /^PW-8:/,
  PW9: /^PW-9:/,
  REST1: /^REST-1:/,
  REST2: /^REST-2:/,
  REST3: /^REST-3:/,
  REST4: /^REST-4:/,
  REST5: /^REST-5:/,
  FA1: /^FA-1:/,
  FA2C: /^FA-2: Pydantic V2 & Capstone/,
  FA2: /^FA-2: Pydantic V2 & Structured/,
}

const ANY = /.*/
const sim = (id: string) => id
const play = (id: string, title: string) => ({ to: `/labs/${id}`, title })

const STAGES: StageDef[] = [
  {
    id: 'js-ts',
    title: 'Stage 1 · JavaScript & TypeScript Foundations',
    level: 'Beginner → Intermediate',
    color: '#2563eb',
    blurb: 'JavaScript execution model, event loop concurrency, strict TypeScript type system, OOP & resilient engineering.',
    topics: [
      {
        id: 'js-core',
        title: 'JS Core, Scope, Objects & Closures',
        icon: '🟨',
        blurb: 'Browser vs Node.js, var/let/const hoisting & TDZ, == vs ===, map/filter/reduce, destructuring, spread & callbacks.',
        kw: /\b(var|let|const|hoisting|tdz|coercion|===|truthy|falsy|destructuring|spread|rest|closure|lexical|map|filter|reduce|nullish|optional chaining)\b/i,
        rules: [
          { s: S.ROADMAP, t: ANY, role: 'deeper' },
          { s: S.JS1, t: ANY },
        ],
        labs: [play('js-event-loop', 'JS Event Loop & Closure Lab')],
      },
      {
        id: 'js-async',
        title: 'Async JS, Event Loop & Resilience',
        icon: '🌀',
        blurb: 'Call stack, microtasks vs macrotasks, Promises, combinators (all/allSettled/race/any), Fetch, retries/jitter & AbortController.',
        kw: /\b(event loop|microtask|macrotask|call stack|promise|async|await|allsettled|fetch|abortcontroller|backoff|jitter|concurrency limit|race condition)\b/i,
        rules: [
          { s: S.JS2, t: /Revision/, role: 'deeper' },
          { s: S.JS2, t: ANY },
        ],
        sims: [sim('proj-js-event-loop')],
        labs: [play('js-event-loop', 'JS Event Loop & Closure Lab')],
      },
      {
        id: 'ts-core-functions',
        title: 'TypeScript Basics, Zod & Typed Functions',
        icon: '🔷',
        blurb: 'tsc & tsconfig strict mode, any/unknown/never/void, narrowing, Zod runtime boundary, overloads & typed async callbacks.',
        kw: /\b(typescript|tsc|tsconfig|type erasure|unknown|never|narrowing|type guard|overload|contextual typing|zod)\b/i,
        rules: [
          { s: S.TS1, t: /cheat sheet|next module/i, role: 'practice' },
          { s: S.TS1, t: ANY },
          { s: S.TS2, t: ANY },
        ],
        sims: [sim('proj-ts-zod-boundary')],
        labs: [play('ts-contract', 'TypeScript & Zod Contract Lab')],
      },
      {
        id: 'ts-types-oop',
        title: 'Interfaces, Discriminated Unions, Generics & SOLID OOP',
        icon: '🧩',
        blurb: 'Interfaces vs types, discriminated unions, generics, keyof/infer, utility & branded types, classes, DI & LLM provider adapters.',
        kw: /\b(interface|type alias|discriminated union|structural typing|excess property|generic|keyof|infer|mapped type|conditional type|branded|solid|dependency injection|polymorphism|composition)\b/i,
        rules: [
          { s: S.TS3, t: /cheat sheet|next module/i, role: 'practice' },
          { s: S.TS3, t: ANY },
          { s: S.TS4, t: /cheat sheet|next module/i, role: 'practice' },
          { s: S.TS4, t: ANY },
          { s: S.TS5, t: ANY },
        ],
        labs: [play('ts-contract', 'TypeScript & Zod Contract Lab')],
      },
      {
        id: 'ts-production',
        title: 'Production TypeScript, Circuit Breakers & Testing',
        icon: '🛡️',
        blurb: 'Env/secrets validation, custom errors, correlation IDs, typed HTTP clients, circuit breakers, structured LLM outputs & mocking.',
        kw: /\b(circuit breaker|correlation id|structured log|mocking|unit test|eslint|env config|production.*ts|production.*typescript)\b/i,
        rules: [
          { s: S.TS6, t: /Revision/, role: 'deeper' },
          { s: S.TS6, t: /cheat sheet|next phase/i, role: 'practice' },
          { s: S.TS6, t: ANY },
        ],
        sims: [sim('proj-ts-resilient-client')],
        labs: [play('ts-contract', 'TypeScript & Zod Contract Lab')],
      },
    ],
  },
  {
    id: 'playwright',
    title: 'Stage 2 · Playwright Automation, BDD & AI Browser Agents',
    level: 'Intermediate → Advanced',
    color: '#16a34a',
    blurb: 'Browser automation in Python & TypeScript: architecture, locators, auto-wait, POM frameworks, route mocking, BDD & MCP agents.',
    topics: [
      {
        id: 'pw-basics-locators',
        title: 'Playwright Architecture, BrowserContexts & Semantic Locators',
        icon: '🎭',
        blurb: 'WebSocket/CDP engine, BrowserContext isolation, sync vs async Python, DOM/accessibility tree, getByRole & ElementHandle vs Locator.',
        kw: /\b(playwright|selenium|webdriverio|browsercontext|accessibility tree|getbyrole|getbylabel|getbytestid|elementhandle|locator|xpath|css selector)\b/i,
        rules: [
          { s: S.PW1, t: ANY },
          { s: S.PW2, t: ANY },
        ],
        labs: [play('playwright-lab', 'Playwright Locator & Route Mock Lab')],
      },
      {
        id: 'pw-waiting-ops',
        title: 'Auto-Waiting, Assertions, Frames, Auth State & Shadow DOM',
        icon: '⏱️',
        blurb: '5-check actionability matrix, web-first & soft assertions, waitForResponse, multi-tabs, iframes, uploads/downloads & storageState.',
        kw: /\b(auto-?wait|actionability|web-first|soft assertion|hard vs soft|assertions|isvisible|waitfortimeout|domcontentloaded|load event|networkidle|hydration|streaming llm|expect\.poll|waitforresponse|iframe|nested frame|framelocator|storagestate|storage state|shadow dom|dialog|alert|file chooser|popup|download|upload|emulation)\b/i,
        rules: [
          { s: S.PW3, t: ANY },
          { s: S.PW4, t: ANY },
        ],
        sims: [sim('proj-pw-auto-wait')],
        labs: [play('playwright-lab', 'Playwright Locator & Route Mock Lab')],
      },
      {
        id: 'pw-framework',
        title: 'Test Framework Architecture, POM & Parallel Sharding',
        icon: '🏗️',
        blurb: 'pytest conftest vs Playwright test.extend, test vs worker fixtures, Page & Component Object Model, factories, workers & sharding.',
        kw: /\b(pom|page object|component object|conftest|test\.extend|fixture|sharding|worker|parameteriz|data factory|tag|marker)\b/i,
        rules: [
          { s: S.PW5, t: /cheat sheet/i, role: 'practice' },
          { s: S.PW5, t: ANY },
        ],
        labs: [play('playwright-lab', 'Playwright Locator & Route Mock Lab')],
      },
      {
        id: 'pw-api-bdd-prod',
        title: 'APIRequestContext, page.route() Mocking, BDD & Docker CI',
        icon: '🧪',
        blurb: 'API contract tests, page.route() 429/500 & HAR mocking, Cucumber/Gherkin Feature/Scenario Outline, Docker Compose & Trace Viewer.',
        kw: /\b(apirequestcontext|page\.route|fulfill|har|bdd|gherkin|cucumber|behave|pytest-bdd|scenario outline|data table|world object|trace viewer|inspector|docker|github actions|azure devops|flaky)\b/i,
        rules: [
          { s: S.PW6, t: /cheat sheet|checklist/i, role: 'practice' },
          { s: S.PW6, t: ANY },
          { s: S.PW7, t: /checklist/i, role: 'practice' },
          { s: S.PW7, t: ANY },
          { s: S.PW8, t: /cheat sheet|checklist/i, role: 'practice' },
          { s: S.PW8, t: ANY },
        ],
        sims: [sim('proj-pw-route-mock'), sim('proj-pw-bdd-flow')],
        labs: [play('playwright-lab', 'Playwright Locator & Route Mock Lab')],
      },
      {
        id: 'pw-agentic-mcp',
        title: 'Agentic AI Browser Automation & Playwright MCP',
        icon: '🤖',
        blurb: 'Playwright MCP, Accessibility snapshots vs Vision, self-healing limits, LangGraph/ADK browser agents, prompt injection & HITL.',
        kw: /\b(mcp|browser agent|self-healing|vision agent|accessibility snapshot|hitl|human-in-the-loop|step budget|sandbox)\b/i,
        rules: [{ s: S.PW9, t: ANY }],
        sims: [sim('proj-pw-agent-mcp')],
        labs: [play('playwright-lab', 'Playwright Locator & Route Mock Lab')],
      },
    ],
  },
  {
    id: 'rest-fastapi',
    title: 'Stage 3 · REST APIs, Security, FastAPI & Capstone',
    level: 'Intermediate → Senior',
    color: '#0d9488',
    blurb: 'HTTP internals, enterprise REST contracts, JWT/OAuth2/BOLA security, caching & rate limits, GenAI SSE/queues, FastAPI ASGI & Pydantic V2.',
    topics: [
      {
        id: 'rest-http-design',
        title: 'HTTP Lifecycle, REST Design, Idempotency & ETags',
        icon: '🌐',
        blurb: 'DNS/TCP/TLS, Keep-Alive HTTPX pools, status codes, RFC 9457 Problem Details, cursor pagination, versioning, Idempotency-Key & ETag.',
        kw: /\b(dns|tcp|tls|keep-alive|httpx|requests|idempoten|etag|if-match|rfc 9457|problem details|pagination|cursor|keyset|openapi|graphql|grpc|status code)\b/i,
        rules: [
          { s: S.REST1, t: /checklist/i, role: 'practice' },
          { s: S.REST1, t: ANY },
          { s: S.REST2, t: /checklist/i, role: 'practice' },
          { s: S.REST2, t: ANY },
        ],
        sims: [sim('proj-rest-http-lifecycle')],
        labs: [play('http-lifecycle', 'HTTP Lifecycle & Rate-Limit Lab')],
      },
      {
        id: 'rest-security',
        title: 'API Security: JWT (HS256/RS256), OAuth2 PKCE, BOLA & OWASP',
        icon: '🔐',
        blurb: 'AuthN vs AuthZ, JWT rotation, OAuth2 PKCE & Client Credentials, OIDC, RBAC/ABAC, BOLA, CORS/CSRF, SSRF, SQLi & multi-tenant RAG ACLs.',
        kw: /\b(jwt|hs256|rs256|jwks|oauth|pkce|oidc|refresh token|rbac|abac|bola|cors|csrf|mtls|owasp|mass assignment|sql injection|ssrf|multi-tenant|prompt injection)\b/i,
        rules: [
          { s: S.REST3, t: /checklist/i, role: 'practice' },
          { s: S.REST3, t: ANY },
        ],
        sims: [sim('proj-rest-jwt-bola')],
        labs: [play('http-lifecycle', 'HTTP Lifecycle & Rate-Limit Lab')],
      },
      {
        id: 'rest-scale-genai',
        title: 'Scaling, Redis Caching, Rate Limiting, SSE & Async Queues',
        icon: '🌊',
        blurb: 'Reverse proxies, Redis Cache-Aside & stampede protection, Token Bucket/Sliding Window, SSE streaming & TTFT, HTTP 202, Celery & DLQs.',
        kw: /\b(redis|cache|stampede|ttl|rate limit|token bucket|sliding window|leaky bucket|reverse proxy|load balancer|sse|server-sent|websocket|webhook|hmac|ttft|tps|celery|rabbitmq|dlq|outbox|202 accepted)\b/i,
        rules: [
          { s: S.REST4, t: ANY },
          { s: S.REST5, t: /cheat sheet/i, role: 'practice' },
          { s: S.REST5, t: ANY },
        ],
        sims: [sim('proj-rest-cache-ratelimit'), sim('proj-genai-sse-jobs')],
        labs: [play('http-lifecycle', 'HTTP Lifecycle & Rate-Limit Lab'), play('fastapi-pydantic', 'FastAPI ASGI & Pydantic V2 Lab')],
      },
      {
        id: 'fastapi-pydantic',
        title: 'FastAPI ASGI Internals, Depends() & Pydantic V2 LLM Contracts',
        icon: '⚡',
        blurb: 'WSGI vs ASGI (scope/receive/send), Uvicorn & Starlette, sync def threadpool vs async def loop, Depends(), Pydantic V2 Rust validators & structured LLM outputs.',
        kw: /\b(fastapi|uvicorn|gunicorn|starlette|asgi|wsgi|scope|receive|send|depends|threadpool|anyio|pydantic|basemodel|configdict|field_validator|model_validator|computed_field|exclude_unset|typeadapter|validationerror|alias|resume)\b/i,
        rules: [
          { s: S.FA1, t: ANY },
          { s: S.FA2, t: ANY },
        ],
        sims: [sim('proj-fastapi-asgi-pydantic')],
        labs: [play('fastapi-pydantic', 'FastAPI ASGI & Pydantic V2 Lab')],
      },
      {
        id: 'project-capstone',
        title: 'Capstone: AI Testing, RAG & Evaluation Quality Gate',
        icon: '🚀',
        blurb: 'Complete Resume Schema + 8-Phase AI Software Testing Platform connecting TS/Zod, FastAPI, Playwright MCP, RAG, LangGraph & Evaluation.',
        kw: /\b(capstone|quality gate|evaluation gate|platform|resume schema|from_date|ragas|faithfulness|system design)\b/i,
        rules: [{ s: S.FA2C, t: ANY }],
        sims: [sim('proj-capstone-e2e')],
        labs: [play('capstone-evaluator', 'Capstone AI Quality Gate Lab')],
      },
    ],
  },
]

let cached: ResolvedPath | null = null

export function getProjectPath(): ResolvedPath {
  if (cached) return cached
  const all = (getCurriculumIndex().lessonsByTrack.veeraproject || []).filter((l) => Number(l.title.slice(0, 2)) < 20)
  cached = resolvePath(all, STAGES)
  return cached
}
