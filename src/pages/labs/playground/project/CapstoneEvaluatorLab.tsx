import { useMemo, useState } from 'react'
import { Check, PgHeader, Range, Stat } from '../common'

export function CapstoneEvaluatorLab() {
  const [hybridSearch, setHybridSearch] = useState(true)
  const [zodStrict, setZodStrict] = useState(true)
  const [mockExternalInPR, setMockExternalInPR] = useState(true)
  const [stepCap, setStepCap] = useState(8)
  const [minFaithfulness, setMinFaithfulness] = useState(0.85)
  const [minPassRate, setMinPassRate] = useState(0.95)

  const metrics = useMemo(() => {
    const faithfulness = hybridSearch ? (zodStrict ? 0.94 : 0.87) : 0.74
    const passRate = mockExternalInPR ? 0.98 : 0.86
    const p95Ms = (mockExternalInPR ? 140 : 1450) + (hybridSearch ? 95 : 40) + stepCap * 18
    const costPerRun = Number(((mockExternalInPR ? 0.004 : 0.068) + stepCap * 0.003).toFixed(3))
    const approved = faithfulness >= minFaithfulness && passRate >= minPassRate && zodStrict && p95Ms <= 2000
    return { faithfulness, passRate, p95Ms, costPerRun, approved }
  }, [hybridSearch, zodStrict, mockExternalInPR, stepCap, minFaithfulness, minPassRate])

  return (
    <div className="pg">
      <PgHeader kicker="VeeraProject + VeeraRAG + VeeraAgents" title="Integrated Capstone: AI Testing, RAG & Evaluation Gate Lab">
        Configure every architectural layer of the 8-phase capstone — Hybrid RAG retrieval, Zod/Pydantic strict contracts,
        Playwright route mocking, LangGraph step budget, and Evaluation thresholds — and see whether the CI Release Gate ships or blocks.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Platform Architecture Knobs</h2>
          <Check label="Hybrid Search + Reranking on Spec RAG (VeeraRAG)" checked={hybridSearch} onChange={setHybridSearch} />
          <Check label="Strict Zod + Pydantic V2 Contracts (VeeraProject)" checked={zodStrict} onChange={setZodStrict} />
          <Check label="Mock non-deterministic LLM calls with page.route() in PR CI" checked={mockExternalInPR} onChange={setMockExternalInPR} />
          <Range label="LangGraph / Playwright MCP step budget" value={stepCap} min={3} max={20} onChange={setStepCap} />
          <Range label="Gate: Min RAG Faithfulness" value={minFaithfulness} min={0.6} max={0.98} step={0.01} onChange={setMinFaithfulness} fmt={(v) => v.toFixed(2)} />
          <Range label="Gate: Min Playwright Pass Rate" value={minPassRate} min={0.7} max={1} step={0.01} onChange={setMinPassRate} fmt={(v) => `${Math.round(v * 100)}%`} />
        </div>

        <div className="pg-stack">
          <div className="pg-stats">
            <Stat label="RAG Faithfulness" value={metrics.faithfulness.toFixed(2)} tone={metrics.faithfulness >= minFaithfulness ? 'ok' : 'bad'} />
            <Stat label="E2E Pass Rate" value={`${Math.round(metrics.passRate * 100)}%`} tone={metrics.passRate >= minPassRate ? 'ok' : 'bad'} />
            <Stat label="p95 Run Latency" value={`${metrics.p95Ms} ms`} tone={metrics.p95Ms <= 2000 ? 'ok' : 'warn'} />
            <Stat label="Cost / PR Run" value={`$${metrics.costPerRun}`} />
          </div>

          <div className="pg-card">
            <h2>Evaluation Gate & OpenTelemetry Summary</h2>
            <p className={`pg-note ${metrics.approved ? 'ok' : 'bad'}`} style={{ fontWeight: 700 }}>
              {metrics.approved
                ? 'RELEASE GATE APPROVED: Grounded RAG specs, strict Pydantic/Zod contracts, deterministic Playwright checks, and SLOs all green.'
                : 'RELEASE GATE BLOCKED: Either faithfulness dropped (disable hybrid search?), Playwright flaked against live LLMs, or strict schema guard was turned off.'}
            </p>
            <ul className="pg-list" style={{ marginTop: '0.6rem' }}>
              <li className="ok">span.rag.hybrid_retrieve: {hybridSearch ? 'BM25 + Dense + RRF (95 ms)' : 'Dense-only miss risk (40 ms)'}</li>
              <li className={zodStrict ? 'ok' : 'bad'}>span.contract.validate: {zodStrict ? 'Pydantic V2 + Zod strict=True passed' : 'Warning: extra fields unguarded'}</li>
              <li className={mockExternalInPR ? 'ok' : 'warn'}>span.playwright.mcp: {mockExternalInPR ? 'page.route() deterministic suite' : 'Live LLM non-determinism warning'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
