import { useParams } from 'react-router-dom'
import { ChunkingLab } from './labs/ChunkingLab'
import { CosineLab } from './labs/CosineLab'
import { RetrievalLab } from './labs/RetrievalLab'
import { InjectionLab } from './labs/InjectionLab'
import { RateLimitLab } from './labs/RateLimitLab'
import { AgentLoopLab } from './labs/AgentLoopLab'
import { MultiAgentLab } from './labs/MultiAgentLab'
import { AgentPlaygroundLab } from './labs/playground/AgentPlaygroundLab'
import { ToolSelectionLab } from './labs/playground/ToolSelectionLab'
import { GraphStateLab } from './labs/playground/GraphStateLab'
import { ContextBudgetLab } from './labs/playground/ContextBudgetLab'
import { GuardrailLab } from './labs/playground/GuardrailLab'
import { MultiAgentPlannerLab } from './labs/playground/MultiAgentPlannerLab'
import { ConcurrencyPlaygroundLab } from './labs/playground/ConcurrencyPlaygroundLab'
import { HashTableLab } from './labs/playground/HashTableLab'
import { BM25Lab } from './labs/playground/rag/BM25Lab'
import { ChunkingStrategyLab } from './labs/playground/rag/ChunkingStrategyLab'
import { HybridRetrievalLab } from './labs/playground/rag/HybridRetrievalLab'
import { RagEvalLab } from './labs/playground/rag/RagEvalLab'
import { RagObservabilityLab } from './labs/playground/rag/RagObservabilityLab'
import { JsEventLoopLab } from './labs/playground/project/JsEventLoopLab'
import { TsContractLab } from './labs/playground/project/TsContractLab'
import { PlaywrightLab } from './labs/playground/project/PlaywrightLab'
import { HttpLifecycleLab } from './labs/playground/project/HttpLifecycleLab'
import { FastApiPydanticLab } from './labs/playground/project/FastApiPydanticLab'
import { CapstoneEvaluatorLab } from './labs/playground/project/CapstoneEvaluatorLab'
import { GradientDescentLab } from './labs/playground/ml/GradientDescentLab'
import { BiasVarianceLab } from './labs/playground/ml/BiasVarianceLab'
import { ThresholdLab } from './labs/playground/ml/ThresholdLab'
import { KMeansLab } from './labs/playground/ml/KMeansLab'
import { CapacityLab } from './labs/playground/system/CapacityLab'
import { LoadBalancerLab } from './labs/playground/system/LoadBalancerLab'
import { ConsistentHashLab } from './labs/playground/system/ConsistentHashLab'
import { CacheEvictionLab } from './labs/playground/system/CacheEvictionLab'
import { RateLimiterLab } from './labs/playground/system/RateLimiterLab'

const MAP = {
  chunking: ChunkingLab,
  cosine: CosineLab,
  retrieval: RetrievalLab,
  injection: InjectionLab,
  'rate-limit': RateLimitLab,
  'agent-loop': AgentLoopLab,
  'multi-agent': MultiAgentLab,
  'agent-playground': AgentPlaygroundLab,
  'tool-selection': ToolSelectionLab,
  'graph-state': GraphStateLab,
  'context-budget': ContextBudgetLab,
  guardrails: GuardrailLab,
  'multiagent-planner': MultiAgentPlannerLab,
  'concurrency-playground': ConcurrencyPlaygroundLab,
  'hash-table': HashTableLab,
  bm25: BM25Lab,
  'chunking-strategy': ChunkingStrategyLab,
  'hybrid-retrieval': HybridRetrievalLab,
  'rag-eval': RagEvalLab,
  'rag-observability': RagObservabilityLab,
  'js-event-loop': JsEventLoopLab,
  'ts-contract': TsContractLab,
  'playwright-lab': PlaywrightLab,
  'http-lifecycle': HttpLifecycleLab,
  'fastapi-pydantic': FastApiPydanticLab,
  'capstone-evaluator': CapstoneEvaluatorLab,
  'gradient-descent': GradientDescentLab,
  'bias-variance': BiasVarianceLab,
  threshold: ThresholdLab,
  kmeans: KMeansLab,
  'capacity-estimation': CapacityLab,
  'load-balancer': LoadBalancerLab,
  'consistent-hashing': ConsistentHashLab,
  'cache-eviction': CacheEvictionLab,
  'rate-limiter-algorithms': RateLimiterLab,
} as const

export function LabRouter() {
  const { labId = '' } = useParams()
  const Comp = MAP[labId as keyof typeof MAP]
  if (!Comp) {
    return (
      <div className="lab">
        <h1>Lab not found</h1>
      </div>
    )
  }
  return <Comp />
}
