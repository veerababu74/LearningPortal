import { Link } from 'react-router-dom'
import '../Tracks.css'

const LABS = [
  {
    id: 'chunking',
    title: 'Chunking simulator',
    blurb: 'Tune chunk size and overlap and watch how text splits.',
  },
  {
    id: 'cosine',
    title: 'Cosine similarity',
    blurb: 'See how vector angle becomes a relevance score.',
  },
  {
    id: 'retrieval',
    title: 'Hybrid retrieval / RRF',
    blurb: 'Fuse dense and sparse rankings step by step.',
  },
  {
    id: 'injection',
    title: 'Prompt injection path',
    blurb: 'Animate how untrusted text hijacks a prompt.',
  },
  {
    id: 'rate-limit',
    title: 'Token bucket rate limit',
    blurb: 'Watch tokens refill and requests get admitted or rejected.',
  },
  {
    id: 'agent-loop',
    title: 'Agent ReAct loop',
    blurb: 'Follow Thought → Action → Observation cycles.',
  },
  {
    id: 'multi-agent',
    title: 'Multi-agent handoff',
    blurb: 'See orchestration, specialist work, and deadlock risk.',
  },
]

export function LabsIndex() {
  return (
    <div className="labs-page">
      <header className="page-head">
        <h1>Interactive labs</h1>
        <p>Hands-on visual simulators linked from lessons across every track.</p>
      </header>
      <div className="lesson-grid">
        {LABS.map((lab, i) => (
          <Link key={lab.id} to={`/labs/${lab.id}`} className="lesson-link">
            <span className="num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{lab.title}</h3>
              <p>{lab.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
