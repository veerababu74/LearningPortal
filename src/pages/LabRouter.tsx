import { useParams } from 'react-router-dom'
import { ChunkingLab } from './labs/ChunkingLab'
import { CosineLab } from './labs/CosineLab'
import { RetrievalLab } from './labs/RetrievalLab'
import { InjectionLab } from './labs/InjectionLab'
import { RateLimitLab } from './labs/RateLimitLab'
import { AgentLoopLab } from './labs/AgentLoopLab'
import { MultiAgentLab } from './labs/MultiAgentLab'

const MAP = {
  chunking: ChunkingLab,
  cosine: CosineLab,
  retrieval: RetrievalLab,
  injection: InjectionLab,
  'rate-limit': RateLimitLab,
  'agent-loop': AgentLoopLab,
  'multi-agent': MultiAgentLab,
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
