import type { CourseConfig } from '@/content/courseKit'
import { PROJECT_GALLERY } from '@/content/sims/registry'

export const PROJECT_LABS = [
  { to: '/labs/js-event-loop', icon: '🌀', title: 'JS Event Loop & Closure Lab', text: 'Step through Call Stack, Microtasks & Macrotasks live, and compare var vs let loop closures and config cloning.' },
  { to: '/labs/ts-contract', icon: '🛡️', title: 'TypeScript & Zod Contract Lab', text: 'Test malformed LLM & API payloads against strict TypeScript + Zod runtime validation and discriminated unions.' },
  { to: '/labs/playwright-lab', icon: '🎭', title: 'Playwright Locator & Route Mock Lab', text: 'Score semantic vs CSS/XPath locators, inspect the 5 actionability checks, and mock 429/503 LLM routes.' },
  { to: '/labs/http-lifecycle', icon: '🌐', title: 'HTTP Lifecycle & Rate-Limit Lab', text: 'Compare cold vs Keep-Alive sockets, inject DNS/TLS/429/503 faults, inspect RFC 9457, and test Token Bucket bursts.' },
  { to: '/labs/fastapi-pydantic', icon: '⚡', title: 'FastAPI ASGI & Pydantic V2 Lab', text: 'Benchmark async def vs blocking event-loop bugs, test PATCH exclude_unset=True, and trace SSE disconnect savings.' },
  { to: '/labs/capstone-evaluator', icon: '🚀', title: 'Capstone AI Quality Gate Lab', text: 'Connect Hybrid RAG + Pydantic/Zod contracts + Playwright MCP + Eval Thresholds to approve or block release.' },
]

export const PROJECT_COURSE: CourseConfig = {
  trackId: 'veeraproject',
  base: '/project',
  title: 'VeeraProject',
  accent: '#2563eb',
  kicker: 'VeeraProject Learn',
  heroTitle: 'Master JavaScript, TypeScript, Playwright, REST APIs & FastAPI end to end',
  heroText:
    'Everything from JS event loop internals and strict TypeScript + Zod contracts to Playwright Python & TS automation, BDD, Agentic Browser MCP, Enterprise REST security, SSE streaming, FastAPI ASGI and Pydantic V2 — with SVG & Mermaid diagrams, animated simulations, interactive labs, worked exercises and 600+ interview questions.',
  searchPlaceholder: 'Search — event loop, Zod, getByRole, page.route, Gherkin, MCP, JWT, BOLA, SSE, ASGI, Pydantic…',
  phases: [
    {
      id: 'learn',
      title: 'Learn',
      blurb: 'Twelve structured modules from JavaScript & TypeScript to Playwright, REST APIs, FastAPI & Full Capstone.',
      accent: '#2563eb',
      moduleIds: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    },
    { id: 'exercises', title: 'Exercises', blurb: 'Hands-on JavaScript, TypeScript, Playwright (Python & TS), REST & FastAPI coding challenges with solutions.', accent: '#0f766e', moduleIds: ['20'] },
    { id: 'projects', title: 'Projects & Labs', blurb: 'Integrated FastAPI + TS + Zod + Playwright labs, Resume Extractor, Enterprise RAG API & 8-Phase Capstone.', accent: '#b45309', moduleIds: ['21'] },
    { id: 'interview', title: 'Interview', blurb: '600+ conceptual, scenario-based, output-prediction, debugging and system design Q&As across all modules.', accent: '#db2777', moduleIds: ['22'] },
  ],
  modules: {
    '01': { icon: '🟨', color: '#ca8a04', blurb: 'JS runtime (Browser vs Node), var/let/const hoisting & TDZ, coercion, arrays, objects, destructuring & closures.' },
    '02': { icon: '🌀', color: '#2563eb', blurb: 'Call stack, microtasks vs macrotasks, Promises, combinators, Fetch, retries with jitter, timeouts & concurrency limits.' },
    '03': { icon: '🔷', color: '#0284c7', blurb: 'tsconfig strict mode, any vs unknown vs never, Zod runtime boundary, typed functions, overloads & closures.' },
    '04': { icon: '🧩', color: '#4f46e5', blurb: 'Interfaces vs types, discriminated unions, generics, keyof/infer, utility & branded types, OOP, SOLID & DI adapters.' },
    '05': { icon: '🛡️', color: '#7c3aed', blurb: 'Env/secrets, custom errors, correlation logging, circuit breakers, LLM structured outputs, mocking & CI quality gates.' },
    '06': { icon: '🎭', color: '#16a34a', blurb: 'Playwright WebSocket/CDP architecture, BrowserContext, sync/async Python & TS, Accessibility locators, auto-wait & assertions.' },
    '07': { icon: '🏗️', color: '#0d9488', blurb: 'Tabs, popups, iframes, uploads/downloads, Shadow DOM, pytest conftest vs test.extend, POM, factories & sharding.' },
    '08': { icon: '🧪', color: '#ea580c', blurb: 'APIRequestContext, page.route() 429/500 mocking, HAR replay, Cucumber/Gherkin BDD, Docker Compose & Trace Viewer.' },
    '09': { icon: '🤖', color: '#9333ea', blurb: 'AI browser agents, Accessibility snapshots, Playwright MCP, ReAct, self-healing limits, LangGraph & Google ADK + HITL.' },
    '10': { icon: '🔐', color: '#dc2626', blurb: 'HTTP/DNS/TCP/TLS, HTTPX, pagination, RFC 9457, idempotency & ETag, JWT RS256, OAuth2 PKCE, BOLA & multi-tenant RAG ACLs.' },
    '11': { icon: '🌊', color: '#0891b2', blurb: 'API Gateways, Redis cache-aside & stampede, token bucket rate limiting, SSE streaming, WebSockets, Celery, RabbitMQ & DLQs.' },
    '12': { icon: '⚡', color: '#059669', blurb: 'FastAPI vs Flask/Django, ASGI scope/receive/send, sync vs async threadpool, Depends(), Pydantic V2 & 8-Phase Capstone.' },
  },
  sims: PROJECT_GALLERY,
  simModuleOf: (s) => s.module,
  visualizerBase: '/project/visualizer',
  demoSimId: 'proj-js-event-loop',
  labs: PROJECT_LABS,
}
