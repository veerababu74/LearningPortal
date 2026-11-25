import type { FlowSpec } from '@/types/curriculum'

const TEMPLATES: Record<string, FlowSpec> = {
  injection: {
    title: 'Prompt injection path',
    nodes: [
      { id: 'n0', label: 'User input', x: 20, y: 70, kind: 'start' },
      { id: 'n1', label: 'Untrusted', x: 160, y: 70, kind: 'danger' },
      { id: 'n2', label: 'Prompt merge', x: 300, y: 70, kind: 'process' },
      { id: 'n3', label: 'Model', x: 440, y: 70, kind: 'process' },
      { id: 'n4', label: 'Unsafe action', x: 580, y: 70, kind: 'danger' },
    ],
    edges: [
      { id: 'e0', source: 'n0', target: 'n1' },
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
    ],
    steps: [
      {
        id: 's0',
        label: 'User input',
        activeNodeIds: ['n0'],
        activeEdgeIds: [],
        narration: 'Attacker crafts malicious natural-language instructions.',
      },
      {
        id: 's1',
        label: 'Untrusted content',
        activeNodeIds: ['n1'],
        activeEdgeIds: ['e0'],
        narration: 'Payload may sit in a document, tool result, or webpage.',
      },
      {
        id: 's2',
        label: 'Prompt merge',
        activeNodeIds: ['n2'],
        activeEdgeIds: ['e1'],
        narration: 'Trusted system prompt and untrusted text are combined.',
      },
      {
        id: 's3',
        label: 'Model',
        activeNodeIds: ['n3'],
        activeEdgeIds: ['e2'],
        narration: 'Model follows the injected instruction.',
      },
      {
        id: 's4',
        label: 'Unsafe action',
        activeNodeIds: ['n4'],
        activeEdgeIds: ['e3'],
        narration: 'App may leak secrets or take a harmful tool action.',
      },
    ],
  },
  agent: {
    title: 'Agent loop',
    nodes: [
      { id: 'n0', label: 'Goal', x: 30, y: 70, kind: 'start' },
      { id: 'n1', label: 'Plan', x: 170, y: 70 },
      { id: 'n2', label: 'Act', x: 310, y: 70 },
      { id: 'n3', label: 'Observe', x: 450, y: 70 },
      { id: 'n4', label: 'Decide', x: 590, y: 70, kind: 'end' },
    ],
    edges: [
      { id: 'e0', source: 'n0', target: 'n1' },
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
    ],
    steps: [
      { id: 's0', label: 'Goal', activeNodeIds: ['n0'], activeEdgeIds: [], narration: 'User goal enters the agent runtime.' },
      { id: 's1', label: 'Plan', activeNodeIds: ['n1'], activeEdgeIds: ['e0'], narration: 'Agent reasons about the next step.' },
      { id: 's2', label: 'Act', activeNodeIds: ['n2'], activeEdgeIds: ['e1'], narration: 'A tool or function call is executed.' },
      { id: 's3', label: 'Observe', activeNodeIds: ['n3'], activeEdgeIds: ['e2'], narration: 'Tool output returns as observation.' },
      { id: 's4', label: 'Decide', activeNodeIds: ['n4'], activeEdgeIds: ['e3'], narration: 'Continue, ask a human, or finish.' },
    ],
  },
  multiagent: {
    title: 'Multi-agent handoff',
    nodes: [
      { id: 'n0', label: 'Orchestrator', x: 20, y: 70, kind: 'start' },
      { id: 'n1', label: 'Specialist A', x: 180, y: 70 },
      { id: 'n2', label: 'Specialist B', x: 340, y: 70 },
      { id: 'n3', label: 'Merge', x: 500, y: 70 },
      { id: 'n4', label: 'Result', x: 640, y: 70, kind: 'success' },
    ],
    edges: [
      { id: 'e0', source: 'n0', target: 'n1' },
      { id: 'e1', source: 'n0', target: 'n2' },
      { id: 'e2', source: 'n1', target: 'n3' },
      { id: 'e3', source: 'n2', target: 'n3' },
      { id: 'e4', source: 'n3', target: 'n4' },
    ],
    steps: [
      { id: 's0', label: 'Orchestrator', activeNodeIds: ['n0'], activeEdgeIds: [], narration: 'Task is decomposed.' },
      { id: 's1', label: 'Specialists', activeNodeIds: ['n1', 'n2'], activeEdgeIds: ['e0', 'e1'], narration: 'Specialists work in parallel.' },
      { id: 's2', label: 'Merge', activeNodeIds: ['n3'], activeEdgeIds: ['e2', 'e3'], narration: 'Results merge; conflicts resolved.' },
      { id: 's3', label: 'Result', activeNodeIds: ['n4'], activeEdgeIds: ['e4'], narration: 'Final answer returned.' },
    ],
  },
}

export function pickFlowClient(name: keyof typeof TEMPLATES): FlowSpec {
  return structuredClone(TEMPLATES[name])
}
