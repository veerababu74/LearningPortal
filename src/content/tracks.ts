import type { TrackId, TrackMeta } from '@/types/curriculum'

export const TRACKS: TrackMeta[] = [
  {
    id: 'llm-concepts',
    title: 'LLM Concepts',
    tagline: 'Reliability, prompting, drift, adaptation',
    description:
      'Core LLM fundamentals: hallucinations, grounded generation, production drift monitoring, prompt engineering, and fine-tuning.',
    accent: '#1d4ed8',
    lessonCount: 0,
  },
  {
    id: 'rag',
    title: 'RAG Engineering',
    tagline: 'Ingestion to production-grade retrieval',
    description:
      'Document loading, chunking, embeddings, vector indexes, hybrid retrieval, agentic RAG, evaluation, and governance.',
    accent: '#1e3a8a',
    lessonCount: 0,
  },
  {
    id: 'agentic-ai',
    title: 'Agentic AI',
    tagline: 'Loops, tools, LangGraph, MCP & A2A',
    description:
      'Build agents from scratch and with frameworks: reasoning loops, tools, memory, MCP, A2A, HITL, and production ops.',
    accent: '#3b82f6',
    lessonCount: 0,
  },
  {
    id: 'multi-agent',
    title: 'Multi-Agent Orchestration',
    tagline: 'Teams of agents that coordinate',
    description:
      'Orchestration patterns, shared state, consensus, scheduling, Google ADK and cross-framework multi-agent systems.',
    accent: '#f97316',
    lessonCount: 0,
  },
  {
    id: 'llm-security',
    title: 'LLM Security',
    tagline: 'OWASP, injection, guardrails, tenancy',
    description:
      'Attack surfaces, prompt injection, jailbreaks, PII, RAG leakage, vector DB security, and enterprise guardrails.',
    accent: '#dc2626',
    lessonCount: 0,
  },
  {
    id: 'llm-gateways',
    title: 'LLM Gateways',
    tagline: 'Routing, quotas, cache, reliability',
    description:
      'Provider abstraction, rate limits, virtual keys, cost control, semantic cache, streaming, and multi-tenant gateways.',
    accent: '#0ea5e9',
    lessonCount: 0,
  },
  {
    id: 'production-failures',
    title: 'Production Failures',
    tagline: 'Detect, diagnose, and recover',
    description:
      'API, agent, state, database, reliability, cost, safety, and disaster-recovery failure catalogue with fix playbooks.',
    accent: '#ea580c',
    lessonCount: 0,
  },
]

export const TRACK_MAP = Object.fromEntries(TRACKS.map((t) => [t.id, t])) as Record<
  TrackId,
  TrackMeta
>
