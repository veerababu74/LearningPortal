import { Link, useSearchParams } from 'react-router-dom'
import { PYTHON_LABS } from '@/content/python/modules'
import { DOCKER_LABS } from '@/content/docker/modules'
import { AGENT_GALLERY, PYTHON_GALLERY, simGroup, simHref } from '@/content/sims/registry'
import type { AgentSim } from '@/content/agents/visualizer'
import './LabsIndex.css'

type LabKind = 'playground' | 'simulator' | 'lab'
type Lab = { id: string; title: string; blurb: string; to: string; kind: LabKind; tags?: string[]; sub?: string }
type GroupId = 'agent-labs' | 'agent-sims' | 'python-sims' | 'python' | 'async' | 'docker' | 'genai'
type Group = {
  id: GroupId
  title: string
  blurb: string
  accent: string
  course: { to: string; label: string }
  labs: Lab[]
  isNew?: boolean
}

/** Labs that belong to the Async & Concurrency subject even though they live under /python/labs. */
const ASYNC_LAB_IDS = new Set(['gil-vs-async'])

const fromSim = (s: AgentSim): Lab => ({
  id: s.id,
  title: s.title,
  blurb: s.summary,
  to: simHref(s),
  kind: 'simulator',
  tags: [s.framework, `${s.steps.length} steps`, `${s.steps.filter((x) => x.predict).length} predictions`],
  sub: simGroup(s),
})

const AGENT_PLAYGROUNDS: Lab[] = [
  {
    id: 'agent-playground',
    title: 'Agent Loop Playground',
    blurb: 'Enable tools, inject timeouts, 500s and repeat-call loops, switch guards on/off — then run the agent and read the timeline, tokens, cost and latency.',
    to: '/labs/agent-playground',
    kind: 'playground',
    tags: ['ReAct', 'guards', 'cost'],
  },
  {
    id: 'tool-selection',
    title: 'Tool Selection Lab',
    blurb: 'Edit tool names and descriptions, type a request, and see how confidently the model picks a tool — vague vs clear descriptions.',
    to: '/labs/tool-selection',
    kind: 'playground',
    tags: ['tool calling', 'schemas'],
  },
  {
    id: 'graph-state',
    title: 'LangGraph State & Reducers',
    blurb: 'Toggle reducers, fan-out, a looping agent and the checkpointer. Watch state per super-step — or InvalidUpdateError / GraphRecursionError.',
    to: '/labs/graph-state',
    kind: 'playground',
    tags: ['LangGraph', 'reducers', 'memory'],
  },
  {
    id: 'context-budget',
    title: 'Context Window Budget',
    blurb: 'Size the system prompt, tools, history and retrieved chunks against an 8K–200K window; compare truncation vs summarization and cost per chat.',
    to: '/labs/context-budget',
    kind: 'playground',
    tags: ['context engineering', 'cost'],
  },
  {
    id: 'guardrails',
    title: 'Guardrail Tester',
    blurb: 'Fire direct and indirect prompt injections, PII leaks, jailbreaks and destructive tool calls at layered defenses and see which layer stops each one.',
    to: '/labs/guardrails',
    kind: 'playground',
    tags: ['security', 'injection', 'PII'],
  },
  {
    id: 'multiagent-planner',
    title: 'Multi-Agent Topology Planner',
    blurb: 'Compare single agent, sequential, parallel and supervisor designs on a Gantt chart: latency, LLM calls, tokens and cost — with a straggler toggle.',
    to: '/labs/multiagent-planner',
    kind: 'playground',
    tags: ['orchestration', 'latency'],
  },
  { id: 'agent-loop', title: 'Agent ReAct loop', blurb: 'Click through Thought → Action → Observation cycles.', to: '/labs/agent-loop', kind: 'lab', tags: ['basics'] },
  { id: 'multi-agent', title: 'Multi-agent handoff', blurb: 'See orchestration, specialist work, and deadlock risk.', to: '/labs/multi-agent', kind: 'lab', tags: ['basics'] },
]

const GENAI_LABS: Lab[] = [
  { id: 'chunking', title: 'Chunking simulator', blurb: 'Tune chunk size and overlap and watch how text splits.', to: '/labs/chunking', kind: 'lab' },
  { id: 'cosine', title: 'Cosine similarity', blurb: 'See how vector angle becomes a relevance score.', to: '/labs/cosine', kind: 'lab' },
  { id: 'retrieval', title: 'Hybrid retrieval / RRF', blurb: 'Fuse dense and sparse rankings step by step.', to: '/labs/retrieval', kind: 'lab' },
  { id: 'injection', title: 'Prompt injection path', blurb: 'Animate how untrusted text hijacks a prompt.', to: '/labs/injection', kind: 'lab' },
  { id: 'rate-limit', title: 'Token bucket rate limit', blurb: 'Watch tokens refill and requests get admitted or rejected.', to: '/labs/rate-limit', kind: 'lab' },
]

const GROUPS: Group[] = [
  {
    id: 'agent-labs',
    title: 'AI Agent playgrounds',
    blurb: 'Hands-on: change the configuration, run it, and compare outcomes. Nothing is scripted to one answer.',
    accent: '#7c3aed',
    course: { to: '/agents', label: 'VeeraAgents course' },
    labs: AGENT_PLAYGROUNDS,
    isNew: true,
  },
  {
    id: 'agent-sims',
    title: 'AI Agent simulators',
    blurb: 'Animated step-by-step runs of agents, multi-agent systems and RAG: moving packets, live state, highlighted code and predict-the-next-step questions.',
    accent: '#9333ea',
    course: { to: '/agents/visualizer', label: 'Agent Visualizer gallery' },
    labs: AGENT_GALLERY.map(fromSim),
    isNew: true,
  },
  {
    id: 'python-sims',
    title: 'Python simulators',
    blurb: 'What the interpreter does, line by line: frames, objects, generators, decorators, exceptions, the event loop and the GIL.',
    accent: '#2563eb',
    course: { to: '/python/visualizer', label: 'Python Visualizer gallery' },
    labs: PYTHON_GALLERY.map(fromSim),
    isNew: true,
  },
  {
    id: 'python',
    title: 'Python',
    blurb: 'Names and objects, mutable defaults, decorators, generators, MRO and a live dict hash table — predict, then watch it happen.',
    accent: '#1f6feb',
    course: { to: '/python', label: 'Python Mastery course' },
    labs: [
      {
        id: 'hash-table',
        title: 'Dict Hash Table Playground',
        blurb: 'Insert, look up and delete your own keys; watch probing on collisions, tombstones and the resize at 2/3 full.',
        to: '/labs/hash-table',
        kind: 'playground',
        tags: ['dict', 'hashing'],
      },
      ...PYTHON_LABS.filter((l) => !ASYNC_LAB_IDS.has(l.id)).map((l) => ({ id: l.id, title: l.title, blurb: l.blurb, to: `/python/labs/${l.id}`, kind: 'lab' as const })),
    ],
  },
  {
    id: 'async',
    title: 'Async & Concurrency',
    blurb: 'See how the GIL serialises CPU-bound threads while asyncio interleaves I/O on one thread.',
    accent: '#0f766e',
    course: { to: '/async', label: 'Async & Concurrency course' },
    labs: [
      {
        id: 'concurrency-playground',
        title: 'Concurrency Playground',
        blurb: 'Build your own I/O + CPU task mix and run it sequentially, with threads, asyncio (and the blocking-call bug) and processes — on a Gantt chart.',
        to: '/labs/concurrency-playground',
        kind: 'playground',
        tags: ['GIL', 'asyncio', 'processes'],
      },
      ...PYTHON_LABS.filter((l) => ASYNC_LAB_IDS.has(l.id)).map((l) => ({ id: l.id, title: l.title, blurb: l.blurb, to: `/python/labs/${l.id}`, kind: 'lab' as const })),
    ],
  },
  {
    id: 'docker',
    title: 'Docker',
    blurb: 'Image layers, port mapping, volumes, Compose networking and debugging a broken container.',
    accent: '#0369a1',
    course: { to: '/docker', label: 'Docker course' },
    labs: DOCKER_LABS.map((l) => ({ id: l.id, title: l.title, blurb: l.blurb, to: `/docker/labs/${l.id}`, kind: 'lab' as const })),
  },
  {
    id: 'genai',
    title: 'Generative AI',
    blurb: 'Chunking, embeddings, retrieval fusion, prompt injection and rate limits.',
    accent: '#c026d3',
    course: { to: '/tracks', label: 'Generative AI tracks' },
    labs: GENAI_LABS,
  },
]

const KIND_LABEL: Record<LabKind, string> = { playground: 'Playground', simulator: 'Simulator', lab: 'Lab' }

function LabCard({ lab, n }: { lab: Lab; n: number }) {
  return (
    <Link to={lab.to} className={`lab-card kind-${lab.kind}`}>
      <span className="lab-num">
        {KIND_LABEL[lab.kind]} {String(n).padStart(2, '0')}
      </span>
      <h3>{lab.title}</h3>
      <p>{lab.blurb}</p>
      {lab.tags?.length ? (
        <div className="lab-tags">
          {lab.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      ) : null}
      <span className="lab-open">{lab.kind === 'simulator' ? '▶ Play simulation →' : 'Open lab →'}</span>
    </Link>
  )
}

export function LabsIndex() {
  const [params, setParams] = useSearchParams()
  const active = GROUPS.find((g) => g.id === params.get('topic'))?.id ?? 'all'
  const shown = active === 'all' ? GROUPS : GROUPS.filter((g) => g.id === active)
  const total = GROUPS.reduce((n, g) => n + g.labs.length, 0)
  const sims = AGENT_GALLERY.length + PYTHON_GALLERY.length
  const playgrounds = GROUPS.flatMap((g) => g.labs).filter((l) => l.kind === 'playground').length

  const select = (id: string) => {
    if (id === 'all') setParams({}, { replace: true })
    else setParams({ topic: id }, { replace: true })
  }

  return (
    <div className="labs-hub">
      <header className="labs-head">
        <p className="labs-kicker">Interactive labs</p>
        <h1>Learn by experimenting</h1>
        <p>
          {total} labs: {playgrounds} hands-on playgrounds, {sims} animated simulators and classic labs, grouped by subject.
          Predict what will happen, run it, change a setting, and run it again.
        </p>
      </header>

      <div className="labs-tabs" role="tablist" aria-label="Filter labs by subject">
        <button type="button" role="tab" aria-selected={active === 'all'} className={active === 'all' ? 'on' : ''} onClick={() => select('all')}>
          All <span>{total}</span>
        </button>
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={active === g.id}
            className={active === g.id ? 'on' : ''}
            style={{ ['--accent' as string]: g.accent }}
            onClick={() => select(g.id)}
          >
            {g.title} <span>{g.labs.length}</span>
          </button>
        ))}
      </div>

      {shown.map((g) => {
        const subs = Array.from(new Set(g.labs.map((l) => l.sub).filter(Boolean))) as string[]
        return (
          <section key={g.id} className="labs-group" style={{ ['--accent' as string]: g.accent }}>
            <header className="labs-group-head">
              <div>
                <h2>
                  {g.title} {g.isNew ? <span className="labs-new">new</span> : null}
                </h2>
                <p>{g.blurb}</p>
              </div>
              <Link to={g.course.to} className="labs-course-link">
                {g.course.label} →
              </Link>
            </header>
            {subs.length > 1 ? (
              subs.map((sub) => {
                const list = g.labs.filter((l) => l.sub === sub)
                return (
                  <div key={sub} className="labs-sub">
                    <h3 className="labs-sub-title">
                      {sub} <span>{list.length}</span>
                    </h3>
                    <div className="labs-grid">
                      {list.map((lab) => (
                        <LabCard key={lab.id} lab={lab} n={g.labs.indexOf(lab) + 1} />
                      ))}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="labs-grid">
                {g.labs.map((lab, i) => (
                  <LabCard key={lab.id} lab={lab} n={i + 1} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
