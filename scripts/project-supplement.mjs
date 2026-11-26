/**
 * Supplemental lessons, gap fills (for truncated ChatGPT turns), real coding exercises
 * (replacing hollow exported widget shells), output-prediction challenges, and the
 * full-stack AI Testing + RAG + Evaluation + Observability Capstone for VeeraProject.
 */

export const PROJECT_SUPPLEMENTS = [
  /* ============================================================== MOD 01: JS-1 Part 1 */
  {
    id: 'sup-js1-part1',
    mod: '01',
    series: 'JS-1: JavaScript Fundamentals',
    topic: 'Runtime, Variables (var/let/const), Types, Coercion & Array Pipelines',
    part: 1,
    kind: 'learn',
    objectives: [
      'Explain how V8 executes JavaScript in Chrome vs Node.js and compare JS, TypeScript, and Python',
      'Distinguish var, let, and const across scope, hoisting, Temporal Dead Zone (TDZ), and object mutability',
      'Avoid == coercion traps using ===, nullish coalescing (??), and optional chaining (?.)',
      'Transform LLM and test payloads immutably using map, filter, reduce, find, some, and every',
    ],
    sections: [
      {
        title: '1. Storytelling & Architecture: Browser vs Node.js Runtime',
        body: `### The Restaurant Kitchen Analogy
Think of the **V8 JavaScript engine** as the head chef who only knows how to execute JavaScript calculations and manage memory (Call Stack + Heap).

- **In the Browser**, the chef works inside a customer-facing dining room (**DOM, \`window\`, \`fetch\`, Web APIs, localStorage**). Playwright automates this environment.
- **In Node.js**, the same chef works in a backend warehouse (**\`fs\`, \`process.env\`, HTTP servers, \`crypto\`, test runners**). Your TypeScript AI scripts, Playwright test runner, and MCP servers run here.

\`\`\`mermaid
flowchart LR
  JS["Your JS / TS Code"] --> V8["V8 Engine (Call Stack + Heap)"]
  V8 -->|"Browser Host"| WEB["DOM · window · fetch · Timers"]
  V8 -->|"Node.js Host"| NODE["libuv Event Loop · fs · process · HTTP"]
\`\`\`

### Python vs JavaScript vs TypeScript at a Glance

| Dimension | Python | JavaScript | TypeScript |
|---|---|---|---|
| Typing | Dynamic, runtime type hints | Dynamic, runtime checks | Static structural types (erased at runtime) |
| Scope | Function + module | Block (\`let\`/\`const\`) + Function (\`var\`) | Same as JS + interfaces/types |
| Null values | \`None\` | \`null\` (intentional) & \`undefined\` (missing) | Same + \`strictNullChecks\` at compile time |
| Concurrency | GIL + \`asyncio\` + workers | Single-thread event loop + Web Workers | Same runtime as JS |
| AI / Testing role | FastAPI, LangGraph, pytest-playwright | Browser DOM, scripts | Playwright TS, Zod schemas, typed SDKs |`,
      },
      {
        title: '2. var vs let vs const, Scope, Hoisting & TDZ',
        body: `### Why \`var\` breaks Playwright & agent loops
- **\`var\`** is **function-scoped** and hoisted with an initial value of \`undefined\`. Inside a \`for (var i = 0; ...)\` loop with async callbacks, every callback shares the single \`i\` binding.
- **\`let\`** is **block-scoped** (\`{ ... }\`). It is hoisted into memory but stays in the **Temporal Dead Zone (TDZ)** until its declaration line runs — reading it earlier throws \`ReferenceError\`.
- **\`const\`** creates an immutable **binding** (you cannot reassign \`cfg = {}\`), **NOT** an immutable object! Mutating \`cfg.temperature = 0.9\` still mutates the shared object in memory.

\`\`\`javascript
// Python equivalent: binding reassignment vs list/dict mutation
// In JS: const locks the arrow (reference), not the heap object.
const agentConfig = { model: "gpt-4o", temperature: 0.2 };
agentConfig.temperature = 0.8; // ✅ Allowed (mutates object)
// agentConfig = { model: "gpt-4o" }; // ❌ TypeError: Assignment to constant variable

// Safe immutable copy:
const saferConfig = { ...agentConfig, temperature: 0.2 };
\`\`\`

> **Interactive Lab:** Experiment with live \`var\` vs \`let\` loop closures and shared config mutation in the [JS Event Loop & Closure Lab](/labs/js-event-loop).`,
      },
      {
        title: '3. Primitives vs References, Equality (=== vs ==) & Safe Operators',
        body: `### Value vs Reference Memory
- **Primitives** (\`string\`, \`number\`, \`boolean\`, \`undefined\`, \`null\`, \`bigint\`, \`symbol\`) are copied by **value**.
- **References** (\`Object\`, \`Array\`, \`Function\`, \`Map\`, \`Set\`, \`Date\`) store a pointer on the stack to a heap object. Copying \`const b = a\` copies the pointer, so \`b.x = 1\` mutates \`a.x\` too!

### Falsy Values & Coercion Traps
Exactly **7 falsy values** exist in JS: \`false\`, \`0\`, \`-0\`, \`0n\`, \`""\`, \`null\`, \`undefined\`, \`NaN\`.
Everything else — including \`[]\` and \`{}\` (unlike Python!) — is **truthy**!

\`\`\`javascript
// Danger with || when temperature = 0 is valid!
const tempBad = userInput.temperature || 0.7;   // 0 becomes 0.7 ❌
const tempGood = userInput.temperature ?? 0.7;  // Only null/undefined fall back ✅

// Optional chaining (?.) avoids TypeError on missing LLM metadata
const citations = response?.choices?.[0]?.message?.citations ?? [];

// Always prefer === over ==
console.log(0 == "");   // true  (coercion trap)
console.log(0 === "");  // false (no coercion)
\`\`\``,
      },
      {
        title: '4. Arrays & Immutable Pipelines (map, filter, reduce, find, some, every)',
        body: `In Playwright and AI backends, you constantly transform API payloads and test results without mutating the original response array.

\`\`\`javascript
const results = [
  { id: "rag-01", passed: true, latencyMs: 320, tokens: 410 },
  { id: "rag-02", passed: false, latencyMs: 1180, tokens: 950 },
  { id: "rag-03", passed: true, latencyMs: 490, tokens: 520 },
];

// filter + map: failed test IDs in uppercase
const failedIds = results.filter((r) => !r.passed).map((r) => r.id.toUpperCase());

// some / every: release gate checks
const hasSlowTest = results.some((r) => r.latencyMs > 1000);   // true
const allPassed = results.every((r) => r.passed);              // false

// find: first failing record
const firstFailure = results.find((r) => !r.passed);

// reduce: total tokens across run
const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
\`\`\`

\`\`\`python
# Python equivalent side-by-side
failed_ids = [r["id"].upper() for r in results if not r["passed"]]
has_slow = any(r["latencyMs"] > 1000 for r in results)
all_passed = all(r["passed"] for r in results)
total_tokens = sum(r["tokens"] for r in results)
\`\`\``,
      },
    ],
  },

  /* ============================================================== MOD 03: TS-1 Part 1 */
  {
    id: 'sup-ts1-part1',
    mod: '03',
    series: 'TS-1: TypeScript Fundamentals',
    topic: 'Why TypeScript, Compiler (tsc/tsconfig), Core Types, Narrowing & Strict Nulls',
    part: 1,
    kind: 'learn',
    objectives: [
      'Explain type erasure, transpilation, and why tsc catches bugs before Playwright or API servers run',
      'Configure tsconfig.json strict flags (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)',
      'Contrast any vs unknown vs never vs void and narrow unknown values safely',
      'Use arrays, tuples, unions, and strict null checking for LLM tool payloads',
    ],
    sections: [
      {
        title: '1. Why TypeScript Exists & The Compilation Pipeline',
        body: `### TypeScript is a Compile-Time Contract Layer
JavaScript runs everywhere, but a typo like \`response.choices[0].mesage\` only crashes **at runtime** — maybe 20 minutes into a CI suite or after an LLM call costs money.

TypeScript adds a static type checker (\`tsc\`) **before execution**, then **erases all type annotations** to emit clean JavaScript for Node.js or the browser.

\`\`\`mermaid
flowchart LR
  TS["agent.ts (Types + Logic)"] --> TSC["tsc Type Checker"]
  TSC -->|"Type Error"| FAIL["Build Blocked Before CI Runs"]
  TSC -->|"Valid Types"| JS["agent.js (Types Erased!)"]
  JS --> RT["Node.js / Browser Runtime"]
  RT --> ZOD["Zod Validates External JSON"]
\`\`\`

### Node.js, npm, npx & \`tsconfig.json\`
- **\`npm install\`**: installs dependencies and updates \`package-lock.json\`. Use **\`npm ci\`** in CI/CD so exact locked versions install reproducibly.
- **\`npx playwright test\`**: runs a package binary without polluting global packages.
- Essential **\`tsconfig.json\`** flags for senior interviews:
  - \`"strict": true\` (turns on \`strictNullChecks\`, \`noImplicitAny\`, \`strictFunctionTypes\`)
  - \`"noUncheckedIndexedAccess": true\` (makes \`arr[0]\` type \`T | undefined\` so missing elements can't crash silently!)`,
      },
      {
        title: '2. Annotations, Inference, Arrays, Tuples & Objects',
        body: `TypeScript infers obvious types automatically, so annotate **function parameters, public contracts, and empty arrays**, while letting locals infer cleanly.

\`\`\`typescript
// Type inference vs explicit contract
const model = "gpt-4o-mini";               // inferred: "gpt-4o-mini" or string
const scores: number[] = [0.91, 0.88];     // Array<number>

// Tuple: fixed-length, position-typed pair (like Python tuple[str, float])
type ScoredChunk = [chunkId: string, cosineScore: number];
const topHit: ScoredChunk = ["doc-14#p2", 0.94];

// Object shape
const request: { prompt: string; maxTokens?: number } = {
  prompt: "Summarize deployment risks",
};
\`\`\``,
      },
      {
        title: '3. any vs unknown vs never vs void & Type Narrowing',
        body: `### Interview Gold: \`any\` vs \`unknown\`
- **\`any\`** turns **OFF** the type checker. Anything compiles and crashes at runtime. Never use \`any\` for untrusted LLM or API JSON.
- **\`unknown\`** means *"we don't know the shape yet"* — TypeScript forces you to **narrow** it (via \`typeof\`, \`Array.isArray\`, \`in\`, or **Zod**) before accessing properties!
- **\`void\`**: a function returns nothing meaningful.
- **\`never\`**: a function **never returns normally** (always throws or loops forever), or represents an impossible branch in exhaustive \`switch\` checks.

\`\`\`typescript
function parseAgentMessage(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw !== null && "content" in raw) {
    const val = (raw as { content: unknown }).content;
    if (typeof val === "string") return val;
  }
  throw new Error("Invalid agent payload");
}

function failFast(reason: string): never {
  throw new Error(reason);
}
\`\`\``,
      },
    ],
  },

  /* ============================================================== MOD 08: PW-6 Section 1 + PW-2/PW-4 Interview Boosters */
  {
    id: 'sup-pw6-overview',
    mod: '08',
    series: 'PW-6: API Testing & Network Interception',
    topic: 'Combining UI, API & LLM Contract Testing (Architecture Overview)',
    part: 1,
    kind: 'learn',
    objectives: [
      'Design a 3-layer test pyramid combining APIRequestContext, page.route() mocks, and real Playwright UI assertions',
      'Know when to hit a real FastAPI backend vs mock slow or non-deterministic LLM responses',
    ],
    sections: [
      {
        title: '1. The 3-Layer AI Testing Pyramid: UI + API + Network Mock',
        body: `Pure E2E browser tests that hit real LLMs for every button click are slow, expensive, and flaky. Senior engineers combine three Playwright tools:

1. **\`APIRequestContext\`** (\`request.post('/v1/rag/ingest')\`) — seed test documents, verify Pydantic/Zod status codes, and clean up test tenants in milliseconds without opening a browser.
2. **\`page.route()\`** — intercept browser HTTP calls to \`/v1/chat\` or \`/v1/llm\` and inject deterministic JSON, HTTP \`429 Retry-After\`, or \`503\` timeouts to test UI resilience.
3. **Full E2E Smoke** — run a small tagged \`@smoke\` suite against the real FastAPI + Vector DB stack before release.

\`\`\`mermaid
flowchart TB
  SEED["1. APIRequestContext: Seed Tenant & Auth Cookie (40 ms)"] --> UI["2. Playwright Page: Open App with Pre-Authenticated State"]
  UI --> ROUTE{"3. page.route() Intercept?"}
  ROUTE -->|"Deterministic Suite"| MOCK["Return Fixture / Inject 429 or 500"]
  ROUTE -->|"Nightly Smoke"| REAL["Hit Live FastAPI + RAG Backend"]
  MOCK --> ASSERT["Web-First Expect + Schema Assertion"]
  REAL --> ASSERT
\`\`\``,
      },
    ],
  },

  /* ============================================================== MOD 10: REST-3 Part 1 & 2 */
  {
    id: 'sup-rest3-authn-jwt-oauth',
    mod: '10',
    series: 'REST-3: Production API Security',
    topic: 'AuthN vs AuthZ, JWT (HS256 vs RS256), Refresh Rotation, OAuth 2.0 PKCE, OIDC & RBAC/ABAC',
    part: 1,
    kind: 'learn',
    objectives: [
      'Separate Authentication (who you are) from Authorization (what you can do)',
      'Compare Basic Auth, API Keys, Sessions/Cookies, and stateless JWT Bearer tokens',
      'Explain JWT Header.Payload.Signature, HS256 vs RS256, refresh token rotation, and reuse detection',
      'Trace OAuth 2.0 Authorization Code + PKCE vs Client Credentials vs OpenID Connect (OIDC)',
      'Combine RBAC and ABAC for multi-tenant RAG and FastAPI services',
    ],
    sections: [
      {
        title: '1. Storytelling & Mental Model: Airport Security vs Boarding Gate',
        body: `### Authentication vs Authorization
- **Authentication (AuthN = \`401 Unauthorized\`)**: Passport control proves **who you are**.
- **Authorization (AuthZ = \`403 Forbidden\`)**: The boarding gate checks **whether you have a seat on THIS flight / access to THIS tenant's documents**.

| Mechanism | Where Stored / Sent | Best For | Key Risk |
|---|---|---|---|
| Basic Auth | \`Authorization: Basic base64(u:p)\` | Internal dev tools only (over TLS) | Credentials sent on every call |
| API Keys | \`X-API-Key\` header | Server-to-server billing & rate limits | No user identity or short expiry by default |
| Sessions + Cookies | \`HttpOnly; Secure; SameSite\` cookie | Browser web apps | Requires CSRF protection + shared session store |
| JWT Bearer | \`Authorization: Bearer <jwt>\` | Stateless microservices & SPAs | Hard to revoke before \`exp\` without blacklist |`,
      },
      {
        title: '2. JWT Structure, HS256 vs RS256 & Refresh Token Rotation',
        body: `A JWT is three Base64Url segments separated by dots: **\`Header.Payload.Signature\`**.
**Critical interview rule**: Base64Url is **encoding, NOT encryption**! Anyone can read \`payload\` claims (\`sub\`, \`tenant_id\`, \`roles\`, \`exp\`), so never put secrets inside a JWT.

\`\`\`mermaid
flowchart LR
  C["Client"] -->|"1. Login"| AUTH["Auth Service (Private Key)"]
  AUTH -->|"2. Access JWT (15m) + Refresh Token (7d)"| C
  C -->|"3. Bearer Access JWT"| API["FastAPI Service (Public JWKS Only!)"]
  API -->|"4. Verify RS256 Signature + exp + iss + aud"| OK["Extract sub & tenant_id"]
\`\`\`

### HS256 vs RS256
- **HS256 (Symmetric HMAC)**: Auth server and every API share the **same secret**. If any service leaks it, attackers can mint admin tokens.
- **RS256 / ES256 (Asymmetric)**: Only Auth holds the **private key** to sign tokens; FastAPI services fetch the **public key (JWKS)** to verify signatures!

### Refresh Token Rotation & Reuse Detection
Keep Access Tokens short (**5–15 min**). Store Refresh Tokens server-side hashed in Redis/DB. When the client exchanges \`refresh_1\`, issue \`access_2 + refresh_2\` and **revoke \`refresh_1\`**. If an attacker replays \`refresh_1\`, revoke the **entire token family** immediately!`,
      },
      {
        title: '3. OAuth 2.0 (PKCE & Client Credentials), OIDC, RBAC & ABAC',
        body: `### Which OAuth 2.0 Flow When?
- **Authorization Code + PKCE**: User signs in via browser (SPA, Mobile, Desktop CLI). Uses \`code_verifier\` + SHA-256 \`code_challenge\` so stolen authorization codes cannot be exchanged without the secret verifier.
- **Client Credentials**: Machine-to-machine (Playwright CI runner or ingestion worker calling a FastAPI RAG service — no human involved).
- **OpenID Connect (OIDC)**: Identity layer on top of OAuth 2.0 that adds an **ID Token** (JWT) + \`/userinfo\` endpoint.

### RBAC vs ABAC in FastAPI
- **RBAC (Role-Based)**: \`user.role in ["admin", "reviewer"]\` — simple coarse permissions.
- **ABAC (Attribute-Based)**: Checks **user attributes + resource attributes + environment** (e.g., \`doc.tenant_id == user.tenant_id and doc.clearance <= user.clearance\`). Essential for **RAG document chunk filtering**!

\`\`\`python
from fastapi import Depends, HTTPException, status
import jwt  # PyJWT

def require_tenant_role(required_role: str):
    def dependency(token: str = Depends(oauth2_scheme)):
        try:
            payload = jwt.decode(
                token,
                PUBLIC_KEY,
                algorithms=["RS256"],
                audience="veera-rag-api",
                issuer="https://auth.example.com",
            )
        except jwt.PyJWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        if required_role not in payload.get("roles", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing role")
        return payload
    return dependency
\`\`\``,
      },
    ],
  },

  /* ============================================================== MOD 12: FA-1 Part 1 + Core */
  {
    id: 'sup-fa1-part1',
    mod: '12',
    series: 'FA-1: FastAPI Fundamentals & Internals',
    topic: 'FastAPI vs Flask vs Django, WSGI vs ASGI (scope, receive, send), Sync vs Async & Depends()',
    part: 1,
    kind: 'learn',
    objectives: [
      'Compare FastAPI, Flask, and Django and explain why ASGI replaced WSGI for streaming and concurrent LLM workloads',
      'Explain the 3 ASGI callables: scope, receive, and send',
      'Trace what happens inside FastAPI when you write def vs async def (AnyIO threadpool vs event loop)',
      'Build clean Dependency Injection (Depends) pipelines with sub-dependencies and yield cleanup',
    ],
    sections: [
      {
        title: '1. FastAPI vs Flask vs Django & WSGI vs ASGI',
        body: `### Why WSGI Chokes on LLM Streaming & Concurrency
**WSGI** (classic Flask / Django) handles **one request per worker thread synchronously**. While waiting 4 seconds for an LLM API response, that thread sits idle — and long SSE token streams lock up workers fast.

**ASGI** (Starlette / FastAPI / Uvicorn) runs an **async event loop** inside each worker process so **thousands of waiting I/O connections** (SSE streams, HTTPX calls to OpenAI/Azure, pgvector queries) multiplex cleanly on one thread.

\`\`\`mermaid
flowchart TB
  CLI["Client HTTP / SSE Request"] --> UV["Uvicorn (Event Loop + HTTP Parser)"]
  UV -->|"ASGI: scope, receive, send"| ST["Starlette (Routing + Middleware + WebSockets)"]
  ST --> DI["FastAPI Depends() Graph + Pydantic V2 Validation"]
  DI -->|"async def"| LOOP["Runs Directly on Event Loop (Await Non-Blocking I/O!)"]
  DI -->|"sync def"| POOL["Dispatched to AnyIO Worker Threadpool (Safe for Sync DBs)"]
\`\`\`

### The 3 ASGI Arguments (\`scope, receive, send\`)
1. **\`scope\`**: dict of connection metadata (\`type: "http"\`, \`method\`, \`path\`, \`headers\`, \`client\`).
2. **\`receive\`**: async callable that yields incoming request body chunks.
3. **\`send\`**: async callable that pushes \`http.response.start\` (status + headers) and \`http.response.body\` (chunks/SSE events) back to Uvicorn.`,
      },
      {
        title: '2. CRITICAL Senior Interview Trap: def vs async def in FastAPI',
        body: `> **Golden Rule:**
> - Declare **\`async def\`** ONLY when all slow I/O inside uses \`await\` (\`httpx.AsyncClient\`, \`asyncpg\`, \`redis.asyncio\`). Calling synchronous \`requests.get()\` or \`time.sleep()\` inside \`async def\` **freezes the entire event loop for every user**!
> - Declare plain **\`def\`** if using blocking libraries (\`requests\`, \`pypdf\`, sync SQLAlchemy, CPU parsing) — FastAPI runs it inside an **AnyIO threadpool** so the event loop stays responsive.

\`\`\`python
import asyncio
import httpx
from fastapi import FastAPI, Depends, Header, HTTPException

app = FastAPI(title="VeeraProject AI Gateway", version="2.0.0")

# Sub-dependency + yield cleanup
async def get_http_client():
    async with httpx.AsyncClient(timeout=10.0) as client:
        yield client  # FastAPI closes client after response finishes!

async def get_tenant(x_tenant_id: str = Header(..., min_length=3)):
    if x_tenant_id == "blocked":
        raise HTTPException(status_code=403, detail="Tenant suspended")
    return x_tenant_id

@app.post("/v1/analyze")
async def analyze_endpoint(
    tenant: str = Depends(get_tenant),
    client: httpx.AsyncClient = Depends(get_http_client),
):
    await asyncio.sleep(0.05)  # Non-blocking async I/O
    return {"tenant": tenant, "status": "ok"}
\`\`\``,
      },
    ],
  },

  /* ============================================================== MOD 12: FA-2 Completion & Capstone */
  {
    id: 'sup-fa2-capstone',
    mod: '12',
    series: 'FA-2: Pydantic V2 & Capstone Architecture',
    topic: 'Complete Resume Schema, FastAPI + Playwright Verification & Full 8-Phase AI Testing Capstone',
    part: 2,
    kind: 'learn',
    objectives: [
      'Complete a strict Pydantic V2 nested ResumeExtraction schema with external field aliases ("from" / "to") and cross-field date validation',
      'Combine FastAPI, Pydantic V2, TypeScript/Zod, Playwright, RAG, LangGraph/ADK, Evaluation, and OpenTelemetry into the integrated Capstone platform',
    ],
    sections: [
      {
        title: '1. Complete Pydantic V2 Resume Extraction Contract (with "from" / "to" Aliases)',
        body: `Remember how \`FA-2 Section 26\` ended right inside \`YearMonth\`? Here is the complete, production-ready Pydantic V2 contract preserving external JSON keys \`"from"\` and \`"to"\` (reserved/awkward in Python) via \`Field(alias=...)\` + \`populate_by_name=True\`, \`model_validator(mode="after")\`, and \`TypeAdapter\` validation:

\`\`\`python
from typing import Annotated, Literal, Self
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    model_validator,
)

YearMonth = Annotated[
    str,
    StringConstraints(pattern=r"^\\d{4}-(0[1-9]|1[0-2])$"),
]

class StrictBase(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
        populate_by_name=True,
    )

class EmploymentRecord(StrictBase):
    company: str = Field(min_length=2, max_length=120)
    role: str = Field(min_length=2, max_length=120)
    from_date: YearMonth = Field(alias="from")
    to_date: YearMonth | Literal["present"] = Field(alias="to")
    highlights: list[str] = Field(min_length=1, max_length=8)

    @model_validator(mode="after")
    def validate_date_order(self) -> Self:
        if self.to_date != "present" and self.to_date < self.from_date:
            raise ValueError(f"'to' ({self.to_date}) cannot precede 'from' ({self.from_date})")
        return self

class ResumeExtraction(StrictBase):
    full_name: str = Field(min_length=2)
    email: EmailStr
    years_experience: float = Field(ge=0, le=60)
    skills: list[str] = Field(min_length=1)
    experience: list[EmploymentRecord] = Field(default_factory=list)
\`\`\`

When serializing back to JSON for your TypeScript frontend or Playwright assertion, pass \`model.model_dump(by_alias=True)\` so \`"from"\` and \`"to"\` round-trip cleanly!`,
      },
      {
        title: '2. Full Capstone Architecture: AI Testing, RAG & Evaluation Platform',
        body: `Every module in **VeeraProject** converges into one portfolio-ready platform that connects **TypeScript/Playwright** (\`VeeraProject\`), **RAG** (\`VeeraRAG\`), and **Multi-Agent Orchestration** (\`VeeraAgents\`):

\`\`\`mermaid
flowchart TB
  UI["TypeScript + Zod Control Plane"] -->|"POST /v1/runs + Idempotency-Key + RS256 JWT"| GW["FastAPI ASGI Gateway + Token Bucket"]
  GW -->|"HTTP 202 + Job ID"| QUEUE["RabbitMQ / Redis Queue"]
  GW -.->|"SSE Token & Progress Stream"| UI
  QUEUE --> ORC["LangGraph / Google ADK Supervisor"]
  ORC -->|"Hybrid BM25 + Vector Search"| RAG["RAG Spec & Codebase Knowledge Base"]
  ORC -->|"Tool Calls + HITL Guard"| MCP["Playwright MCP + Docker Browser Pool"]
  MCP -->|"Traces, HAR, Screenshots, Status"| EVAL["Eval Gate (RAGAS + Pass Rate + p95 + Cost)"]
  EVAL --> OTEL["OpenTelemetry Spans + Prometheus Alerts"]
\`\`\`

> **Interactive Capstone Lab:** Run the full platform simulation, tweak retrieval quality, flakiness, and token budgets, and watch the automated release gate approve or block deployment in the [Capstone Evaluator Lab](/labs/capstone-evaluator)!`,
      },
    ],
  },

  /* ============================================================== MOD 20: WORKED CODING EXERCISES */
  {
    id: 'sup-exercises-js-ts',
    mod: '20',
    series: 'VeeraProject Coding Exercises',
    topic: 'JavaScript & TypeScript Worked Exercises (JS-1 to TS-6)',
    part: 1,
    kind: 'exercise',
    objectives: [
      'Fix shared-state mutation and var-vs-let loop closure bugs in JavaScript',
      'Implement bounded async concurrency, jittered retry with AbortController, and exhaustive TS discriminated unions',
      'Build a generic TypeScript + Zod LLM Tool Registry that catches malformed runtime payloads',
    ],
    sections: [
      {
        title: 'JS-1 & JS-2 Exercises: Immutability, Bounded Concurrency & Jittered Retry',
        body: `### Exercise 1: Fix the Shared Agent Configuration Bug
**Task:** Write \`createAgentConfig(overrides)\` so mutating one agent's \`tools\` array or \`temperature\` never mutates \`BASE_CONFIG\` or sibling agents.

\`\`\`javascript
const BASE_CONFIG = Object.freeze({
  model: "gpt-4o",
  temperature: 0.2,
  tools: ["search_docs"],
});

function createAgentConfig(overrides = {}) {
  return {
    ...BASE_CONFIG,
    ...overrides,
    tools: [...(overrides.tools ?? BASE_CONFIG.tools)],
  };
}
\`\`\`

### Exercise 2: Bounded Concurrency Runner (\`runWithLimit\`)
**Task:** Run async LLM tasks with at most \`limit\` in-flight simultaneously (preventing HTTP 429 burst overload), preserving input index order.

\`\`\`javascript
async function runWithLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const idx = next++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
\`\`\`

### Exercise 3: Retry with Exponential Backoff, Full Jitter & AbortController
**Task:** Retry transient 429/502/503/504 responses up to \`maxRetries\`, respecting \`signal\` cancellation.

\`\`\`javascript
async function fetchWithRetry(url, { maxRetries = 3, baseMs = 200, signal } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { signal });
    if (res.ok) return res;
    if (![429, 502, 503, 504].includes(res.status) || attempt === maxRetries) {
      throw new Error(\`HTTP \${res.status}\`);
    }
    const cap = baseMs * 2 ** attempt;
    const delay = Math.random() * cap; // full jitter avoids thundering herd
    await new Promise((r, rej) => {
      const id = setTimeout(r, delay);
      signal?.addEventListener("abort", () => {
        clearTimeout(id);
        rej(signal.reason ?? new Error("Aborted"));
      }, { once: true });
    });
  }
}
\`\`\``,
      },
      {
        title: 'TS-1 to TS-6 Exercises: Narrowing, Exhaustive Unions, Zod Registry & Circuit Breaker',
        body: `### Exercise 4: Exhaustive Discriminated Union Event Reducer
**Task:** Handle every \`AgentEvent\` branch safely and guarantee compile-time failure if a new event type is added later.

\`\`\`typescript
type AgentEvent =
  | { type: "thinking"; step: number }
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | { type: "final"; answer: string };

function formatEvent(ev: AgentEvent): string {
  switch (ev.type) {
    case "thinking":
      return \`Step \${ev.step}: planning...\`;
    case "tool_call":
      return \`Calling \${ev.tool}\`;
    case "final":
      return ev.answer;
    default: {
      const _exhaustive: never = ev;
      return _exhaustive;
    }
  }
}
\`\`\`

### Exercise 5: Typed Generic LLM Tool Registry with Zod Runtime Guard
**Task:** Pair compile-time generics with runtime \`zod\` validation so bad LLM arguments fail safely before tool execution.

\`\`\`typescript
import { z } from "zod";

class ToolRegistry {
  private tools = new Map<string, { schema: z.ZodTypeAny; run: (args: any) => Promise<unknown> }>();

  register<S extends z.ZodTypeAny>(name: string, schema: S, run: (args: z.infer<S>) => Promise<unknown>) {
    this.tools.set(name, { schema, run });
  }

  async invoke(name: string, rawArgs: unknown) {
    const entry = this.tools.get(name);
    if (!entry) throw new Error(\`Unknown tool: \${name}\`);
    const parsed = entry.schema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new Error(\`Validation failed for \${name}: \${parsed.error.message}\`);
    }
    return entry.run(parsed.data);
  }
}
\`\`\`

### Exercise 6: TypeScript Circuit Breaker Wrapper
**Task:** Trip open after 3 consecutive provider failures and fail fast during \`cooldownMs\` before allowing one half-open probe.

\`\`\`typescript
class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  constructor(private readonly threshold = 3, private readonly cooldownMs = 5000) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.failures >= this.threshold && Date.now() - this.openedAt < this.cooldownMs) {
      throw new Error("CircuitOpen: failing fast without hitting provider");
    }
    try {
      const out = await fn();
      this.failures = 0;
      return out;
    } catch (err) {
      this.failures++;
      if (this.failures >= this.threshold) this.openedAt = Date.now();
      throw err;
    }
  }
}
\`\`\``,
      },
    ],
  },

  {
    id: 'sup-exercises-pw-rest-fa',
    mod: '20',
    series: 'VeeraProject Coding Exercises',
    topic: 'Playwright (Python & TS), BDD, REST Security & FastAPI/Pydantic V2 Worked Exercises',
    part: 2,
    kind: 'exercise',
    objectives: [
      'Write semantic Playwright locators, iframe/Shadow DOM tests, and web-first assertions in Python & TypeScript',
      'Mock LLM HTTP 429/500 flows with page.route() and express BDD rules cleanly in Gherkin',
      'Implement FastAPI idempotency keys, Redis token-bucket checks, and Pydantic V2 PATCH contracts',
    ],
    sections: [
      {
        title: 'PW-1 to PW-5 Exercises: Semantic Locators, Iframes & POM Fixtures',
        body: `### Exercise 1 (Playwright Python + TS): Semantic Role & Table Filtering with \`set_content\`
**Task:** Locate the *"Delete"* button strictly inside the row belonging to \`"rag-policy.pdf"\` without fragile XPath indexes.

\`\`\`python
# Python pytest-playwright
def test_delete_specific_document(page):
    page.set_content("""
      <table>
        <tr><td>billing.pdf</td><td><button>Delete</button></td></tr>
        <tr><td>rag-policy.pdf</td><td><button>Delete</button></td></tr>
      </table>
    """)
    row = page.get_by_role("row").filter(has_text="rag-policy.pdf")
    row.get_by_role("button", name="Delete").click()
\`\`\`

\`\`\`typescript
// TypeScript Playwright Test
import { test, expect } from "@playwright/test";

test("deletes only matching document row", async ({ page }) => {
  await page.setContent(\`
    <table>
      <tr><td>billing.pdf</td><td><button>Delete</button></td></tr>
      <tr><td>rag-policy.pdf</td><td><button>Delete</button></td></tr>
    </table>
  \`);
  const row = page.getByRole("row").filter({ hasText: "rag-policy.pdf" });
  await expect(row.getByRole("button", { name: "Delete" })).toBeEnabled();
  await row.getByRole("button", { name: "Delete" }).click();
});
\`\`\`

### Exercise 2: Handling an Embedded \`<iframe>\` Chat Widget
\`\`\`typescript
const frame = page.frameLocator('iframe[title="Assistant Widget"]');
await frame.getByLabel("Prompt").fill("Summarize incident #42");
await frame.getByRole("button", { name: "Run" }).click();
await expect(frame.getByRole("status")).toContainText("Resolved");
\`\`\``,
      },
      {
        title: 'PW-6 to PW-9 Exercises: Route Mocking (429 Retry), BDD & MCP Safety Guard',
        body: `### Exercise 3 (Playwright TS): Deterministic LLM Response & 429 Retry Test
**Task:** First return HTTP 429, then HTTP 200 JSON on retry, asserting citation visibility with zero \`waitForTimeout\`.

\`\`\`typescript
import { test, expect } from "@playwright/test";

test("retries LLM 429 and renders grounded answer", async ({ page }) => {
  let calls = 0;
  await page.route("**/v1/chat", async (route) => {
    calls++;
    if (calls === 1) {
      return route.fulfill({ status: 429, headers: { "Retry-After": "0" }, body: '{"detail":"rate limited"}' });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer: "Refunds expire in 30 days.", citations: ["policy.pdf#p4"] }),
    });
  });

  await page.goto("/chat");
  await page.getByRole("textbox", { name: /ask/i }).fill("Refund policy?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("policy.pdf#p4")).toBeVisible();
  expect(calls).toBe(2);
});
\`\`\`

### Exercise 4 (Gherkin BDD + Playwright MCP Budget Guard)
\`\`\`gherkin
Feature: Grounded Citation Verification
  Scenario Outline: Verified documents render clickable citations
    Given an authenticated tenant "<tenant>"
    When the user asks "<question>"
    Then the response contains citation "<source>" within 3000 ms

    Examples:
      | tenant   | question               | source          |
      | acme-qa  | What is the SLA?       | sla-2026.pdf#p2 |
      | globex   | Max upload size?       | limits.md#s1    |
\`\`\``,
      },
      {
        title: 'REST & FastAPI Exercises (REST-1 to REST-5, FA-1, FA-2)',
        body: `### Exercise 5: FastAPI Idempotency-Key Endpoint + Pydantic V2 PATCH Contract
**Task:** Prevent duplicate async job creation when a client retries \`POST /v1/jobs\` with the same \`Idempotency-Key\`, and safely apply partial updates via \`exclude_unset=True\`.

\`\`\`python
from fastapi import FastAPI, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI()
IDEMPOTENCY_STORE: dict[str, tuple[int, dict]] = {}

@app.post("/v1/jobs", status_code=202)
async def create_job(payload: dict, idempotency_key: str = Header(..., alias="Idempotency-Key")):
    if idempotency_key in IDEMPOTENCY_STORE:
        status_code, cached = IDEMPOTENCY_STORE[idempotency_key]
        return JSONResponse(status_code=status_code, content={**cached, "replayed": True})
    job = {"job_id": "job_901", "status": "queued", "doc": payload.get("doc")}
    IDEMPOTENCY_STORE[idempotency_key] = (202, job)
    return job

class AgentPatch(BaseModel):
    model: str | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    max_steps: int | None = Field(default=None, ge=1, le=20)

def apply_patch(existing: dict, patch: AgentPatch) -> dict:
    # Only updates keys explicitly provided by the caller!
    return {**existing, **patch.model_dump(exclude_unset=True)}
\`\`\``,
      },
    ],
  },

  /* ============================================================== MOD 21: INTEGRATED CAPSTONE PROJECT */
  {
    id: 'sup-project-capstone',
    mod: '21',
    series: 'VeeraProject Integrated Projects',
    topic: 'Capstone Project: AI Software Testing, RAG & Evaluation Platform (Phases 1–8)',
    part: 1,
    kind: 'project',
    objectives: [
      'Architect and wire the full 8-phase capstone linking TypeScript, Playwright, FastAPI, Pydantic V2, RAG, LangGraph/ADK, and Evaluation',
      'Enforce tenant isolation, Zod/Pydantic schema boundaries, trace IDs, and release evaluation gates',
    ],
    sections: [
      {
        title: 'End-to-End Blueprint & Deliverable Checklist',
        body: `### What You Build in the Capstone
1. **FastAPI + Pydantic V2 Control Service (\`api/\`)**:
   - JWT RS256 + Tenant ABAC guard
   - \`POST /v1/test-runs\` (HTTP 202 + \`Idempotency-Key\` + RabbitMQ queue)
   - \`GET /v1/test-runs/{id}/stream\` (SSE progress & LLM token streaming with \`Last-Event-ID\` resume)
2. **TypeScript + Zod Frontend & SDK (\`web/\`)**:
   - Strict runtime validation of backend responses and SSE events
   - Exponential backoff + full jitter + \`AbortController\` cancel button
3. **Playwright + BDD + MCP Runner (\`tests/\`)**:
   - Gherkin feature specs mapped to Page Object Model + \`APIRequestContext\` seeding
   - \`page.route()\` fault injection (429/503) + Trace Viewer artifacts on failure
4. **RAG + Multi-Agent Test Planner + Evaluation Gate**:
   - Retrieves relevant product specs and git diffs (\`VeeraRAG\`)
   - LangGraph / Google ADK planner generates structured Pydantic V2 test plans (\`VeeraAgents\`)
   - Blocks CI deployment whenever faithfulness \`< 0.85\`, pass rate \`< 95%\`, or p95 latency exceeds SLO.`,
      },
    ],
  },

  /* ============================================================== MOD 22: INTERVIEW BOOSTERS (PW-2, PW-4, REST-3, REST-4, FA-1, FA-2 & Output Labs) */
  {
    id: 'sup-interview-qa-gaps',
    mod: '22',
    series: 'VeeraProject Supplemental Interview Banks',
    topic: 'Playwright DOM/Ops, REST Caching/Rate-Limiting, Auth/JWT/OAuth2, FastAPI & Output-Prediction Q&As',
    part: 1,
    kind: 'interview',
    objectives: [
      'Answer JavaScript output-prediction and event-loop ordering traps accurately out loud',
      'Master Playwright locator, frame, Shadow DOM, auth, JWT/PKCE, Redis caching, and FastAPI ASGI interview questions',
    ],
    sections: [
      {
        title: 'JavaScript & TypeScript Output Prediction Drills',
        body: `### Q1: What is the exact console output of this Event Loop snippet?
\`\`\`javascript
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
(async () => {
  console.log("4");
  await null;
  console.log("5");
})();
console.log("6");
\`\`\`
**Expected answer:** \`1\`, \`4\`, \`6\`, \`3\`, \`5\`, \`2\`. Synchronous code (\`1\`, \`4\`, \`6\`) finishes on the call stack first; then the **microtask queue** drains in FIFO order (\`3\` from \`Promise.then\`, then \`5\` from \`await null\`); finally the **macrotask queue** runs \`setTimeout\` (\`2\`).

### Q2: Why does \`var\` print \`3, 3, 3\` while \`let\` prints \`0, 1, 2\`?
\`\`\`javascript
for (var i = 0; i < 3; i++) setTimeout(() => console.log("var:", i), 0);
for (let j = 0; j < 3; j++) setTimeout(() => console.log("let:", j), 0);
\`\`\`
**Expected answer:** \`var\` creates **one function-scoped variable** mutated to \`3\` before callbacks run. \`let\` creates a **fresh block-scoped binding per iteration**, so each closure captures its own \`j\`.

### Q3: Why does \`temperature: 0\` break with \`||\`, and what happens with \`??\`?
\`\`\`javascript
const tempA = 0 || 0.7;
const tempB = 0 ?? 0.7;
console.log(tempA, tempB);
\`\`\`
**Expected answer:** \`0.7 0\`. \`||\` falls back on any falsy value (including \`0\`, \`""\`, \`false\`), whereas \`??\` (nullish coalescing) falls back **only** on \`null\` or \`undefined\`.

### Q4: Can \`readonly\` in TypeScript prevent array mutation at runtime?
**Expected answer:** **No.** TypeScript \`readonly\` and \`as const\` are erased during compilation; at runtime \`Object.freeze()\` only shallow-freezes one level, so nested objects require deep immutability or Zod cloning.`,
      },
      {
        title: 'Playwright Locators, Frames, Shadow DOM & Auth Interview Q&As',
        body: `### Q5: Why should Playwright tests prefer \`getByRole\` and \`getByLabel\` over fragile XPath?
**Expected answer:** \`getByRole\` queries the browser **accessibility tree**, matching how screen readers and real users perceive controls while catching missing ARIA labels/roles. Deep CSS/XPath chains (\`div > div:nth-child(3)\`) break on minor layout refactoring.

### Q6: What is the difference between a \`Locator\` and an \`ElementHandle\`?
**Expected answer:** A \`Locator\` is **lazy and re-queried on every action** (auto-waiting and surviving DOM re-renders without throwing stale element errors). \`ElementHandle\` points to a fixed DOM node snapshot and goes stale if React/Vue re-renders; Playwright discourages \`ElementHandle\`.

### Q7: How does Playwright handle Shadow DOM vs \`<iframe>\` elements?
**Expected answer:** Playwright's CSS and semantic locators **pierce open Shadow DOM automatically**. Cross-origin or embedded \`<iframe>\` documents require \`page.frameLocator('#checkout-frame').getByRole(...)\` to enter the frame boundary.

### Q8: How do you avoid logging into the UI before every Playwright test?
**Expected answer:** Authenticate once in a setup project (preferably via \`APIRequestContext\`), save cookies + \`localStorage\` with \`storageState('auth.json')\`, and load that file per \`BrowserContext\` in parallel workers.`,
      },
      {
        title: 'REST Security, Caching, Rate Limiting & FastAPI ASGI Interview Q&As',
        body: `### Q9: What is BOLA (Broken Object Level Authorization) and why doesn't valid JWT stop it?
**Expected answer:** Validating a JWT only proves **Authentication** (who the caller is). **BOLA** occurs when User A requests \`GET /v1/documents/doc_99\` belonging to User B and the endpoint never verifies \`doc.tenant_id == current_user.tenant_id\`.

### Q10: How do you prevent Cache Stampede (Thundering Herd) when a popular RAG cache key expires?
**Expected answer:** Combine **probabilistic early expiration / soft TTL**, a **distributed mutex / singleflight lock** so only one worker recomputes the origin query while others wait or receive slightly stale data, and **randomized jitter** on TTLs.

### Q11: Compare Token Bucket vs Sliding Window Log rate limiting for LLM APIs.
**Expected answer:** **Token Bucket** allows controlled short bursts up to bucket capacity while enforcing a steady refill rate (ideal for conversational UX). **Sliding Window** enforces strict request/token limits across any rolling 60-second interval without the boundary-spike bug of Fixed Window.

### Q12: What happens if you call \`requests.get()\` inside a FastAPI \`async def\` route?
**Expected answer:** \`requests.get()\` blocks the OS thread running the asyncio event loop, stalling every other concurrent coroutine on that worker until the HTTP call finishes. Use \`await httpx.AsyncClient().get(...)\` inside \`async def\`, or define the endpoint as synchronous \`def\` so FastAPI dispatches it to its AnyIO worker threadpool.

### Q13: Why is \`model_dump(exclude_unset=True)\` critical for Pydantic V2 \`PATCH\` endpoints?
**Expected answer:** Without \`exclude_unset=True\`, optional fields with default values (like \`None\` or \`temperature=0.7\`) overwrite existing database values even though the client never sent them in the \`PATCH\` payload.

### Q14: Compare OAuth 2.0 Authorization Code + PKCE vs Client Credentials.
**Expected answer:** **Authorization Code + PKCE** authenticates a **human user** through a browser redirect and binds token exchange to a SHA-256 \`code_challenge\`. **Client Credentials** authenticates a **backend service or CI worker** directly using client credentials with zero human UI.`,
      },
    ],
  },
]
