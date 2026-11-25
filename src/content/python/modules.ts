import type { PyLabMeta, PyLesson, PyModule } from './types'

export const PYTHON_LABS: PyLabMeta[] = [
  {
    id: 'name-vs-object',
    title: 'Name vs object',
    blurb: 'Assign and rebind names. Watch ids change and predict is vs ==.',
    simulation: true,
  },
  {
    id: 'mutable-trap',
    title: 'Mutable default trap',
    blurb: 'See shared class attrs and mutable default arguments surprise you.',
    simulation: true,
  },
  {
    id: 'decorator-unwrap',
    title: 'Decorator unwrap',
    blurb: 'Animate @a @b call order — bottom wraps first, call top-down.',
    simulation: true,
  },
  {
    id: 'generator-stepper',
    title: 'Generator stepper',
    blurb: 'Step yield/resume and see the timeline of a suspended function.',
    simulation: true,
  },
  {
    id: 'gil-vs-async',
    title: 'GIL vs asyncio',
    blurb: 'Compare CPU-bound threads under the GIL with async I/O interleaving.',
    simulation: true,
  },
  {
    id: 'mro-tracer',
    title: 'MRO tracer',
    blurb: 'Walk diamond inheritance and watch C3 linearization resolve methods.',
    simulation: true,
  },
]

function lesson(partial: PyLesson): PyLesson {
  return partial
}

const m1Lessons: PyLesson[] = [
  lesson({
    id: 'how-python-runs',
    moduleId: 'm1',
    order: 1,
    title: 'How Python runs your code',
    duration: '20 min',
    sourceHint: '01_Python_Fundamentals_Complete.md',
    story: {
      title: 'The script that “worked until line 40”',
      scene:
        'A teammate says their FastAPI startup script “randomly” fails. Lines 1–39 printed fine; then ZeroDivisionError. They ask: “If Python is compiled, why did earlier lines run?”',
      pain: 'Without the source → bytecode → PVM mental model, debugging and interviews both feel fuzzy.',
    },
    flow: {
      title: 'Source to running process',
      nodes: [
        { id: 'src', label: '.py source', kind: 'start' },
        { id: 'compile', label: 'Compile', kind: 'process' },
        { id: 'pyc', label: 'Bytecode', kind: 'data' },
        { id: 'pvm', label: 'PVM', kind: 'process' },
        { id: 'out', label: 'Output', kind: 'success' },
      ],
      edges: [
        { id: 'e1', source: 'src', target: 'compile' },
        { id: 'e2', source: 'compile', target: 'pyc' },
        { id: 'e3', source: 'pyc', target: 'pvm' },
        { id: 'e4', source: 'pvm', target: 'out' },
      ],
      steps: [
        {
          id: 's1',
          label: 'Read source',
          narration: 'Python reads your .py file as text — not machine code yet.',
          activeNodeIds: ['src'],
          activeEdgeIds: [],
        },
        {
          id: 's2',
          label: 'Compile',
          narration: 'CPython compiles the module to bytecode (often cached under __pycache__).',
          activeNodeIds: ['src', 'compile'],
          activeEdgeIds: ['e1'],
        },
        {
          id: 's3',
          label: 'Bytecode',
          narration: '.pyc stores portable bytecode — not your OS machine instructions.',
          activeNodeIds: ['compile', 'pyc'],
          activeEdgeIds: ['e2'],
        },
        {
          id: 's4',
          label: 'PVM executes',
          narration: 'The Python Virtual Machine walks bytecode. Earlier ops can finish before a later crash.',
          activeNodeIds: ['pyc', 'pvm'],
          activeEdgeIds: ['e3'],
        },
        {
          id: 's5',
          label: 'Result',
          narration: 'Side effects (prints, network) already happened when a later line raises.',
          activeNodeIds: ['pvm', 'out'],
          activeEdgeIds: ['e4'],
        },
      ],
    },
    concept: {
      definition:
        'Python is both compiled and interpreted: source becomes bytecode, then the PVM executes that bytecode. That is why earlier lines can run before a later error.',
      internals: [
        'Compilation is usually automatic on import/run.',
        'Deleting __pycache__ is safe — Python regenerates .pyc files.',
        'Dynamic typing means names can point to different types over time.',
      ],
      terms: [
        { term: 'Bytecode', meaning: 'Intermediate instructions stored in .pyc / __pycache__.' },
        { term: 'PVM', meaning: 'Python Virtual Machine that executes bytecode.' },
        { term: 'CPython', meaning: 'Default Python implementation written in C.' },
      ],
      analogyLimit:
        '“Interpreted” does not mean “no compile step.” Interviews expect the bytecode + PVM nuance.',
    },
    code: [
      {
        id: 'c1',
        title: 'Line-by-line failure',
        language: 'python',
        code: `print("Line 1 executes")
print("Line 2 executes")
print(1 / 0)               # crash here
print("Line 4 never runs")`,
        notes: ['Lines 1–2 already ran when the ZeroDivisionError raises.'],
      },
      {
        id: 'c2',
        title: 'Dynamic typing',
        language: 'python',
        code: `x = 10
print(type(x))   # <class 'int'>
x = "hello"
print(type(x))   # <class 'str'>`,
      },
    ],
    scenario: {
      title: 'Junior deletes __pycache__',
      situation: 'A junior deletes all .pyc files before deploy and panics. What do you say?',
      choices: [
        {
          id: 'a',
          label: 'Ship is broken forever — restore from backup',
          outcome: 'failure',
          explanation: '.pyc are caches. Python regenerates them.',
        },
        {
          id: 'b',
          label: 'Safe to delete; only cold-start import speed may dip briefly',
          outcome: 'success',
          explanation: 'Correct. Bytecode cache is optional performance, not source of truth.',
        },
        {
          id: 'c',
          label: 'Must recompile with gcc first',
          outcome: 'failure',
          explanation: 'CPython compiles to bytecode automatically — no gcc step for pure Python.',
        },
      ],
    },
    interview: [
      {
        id: 'i1',
        kind: 'concept',
        question: 'Is Python compiled or interpreted?',
        answer: {
          concept: 'Both: compile to bytecode, then PVM interprets bytecode.',
          syntax: 'Running/importing a module triggers compile + execute.',
          example: 'print(1); print(1/0) — first print runs, then error.',
          tradeoff: 'Faster iteration than ahead-of-time languages; CPU-bound loops can be slower.',
        },
      },
      {
        id: 'i2',
        kind: 'scenario',
        question: 'Script works locally but fails on a teammate machine. Top causes?',
        answer: {
          concept: 'Environment drift beats “Python is broken.”',
          syntax: 'Check python -V, pip freeze, OS paths, env vars.',
          example: 'Different minor versions or missing package pins.',
          tradeoff: 'Containers/venv lockfiles reduce this class of bugs.',
        },
      },
    ],
  }),
  lesson({
    id: 'names-and-objects',
    moduleId: 'm1',
    order: 2,
    title: 'Names point at objects — not boxes',
    duration: '25 min',
    labId: 'name-vs-object',
    sourceHint: '13_memory.md',
    story: {
      title: 'The shared shopping cart bug',
      scene:
        'In a resume RAG demo, two API requests somehow share the same list of retrieved chunks. A junior wrote `results = default_results` thinking it copied the list.',
      pain: 'They confused names (references) with deep copies — classic Python footgun.',
    },
    flow: {
      title: 'Assignment creates a reference',
      nodes: [
        { id: 'name_a', label: 'name a', kind: 'data' },
        { id: 'obj', label: 'list obj', kind: 'process' },
        { id: 'name_b', label: 'name b', kind: 'data' },
        { id: 'mutate', label: 'b.append', kind: 'danger' },
        { id: 'see_a', label: 'a sees it', kind: 'success' },
      ],
      edges: [
        { id: 'e1', source: 'name_a', target: 'obj', label: 'points' },
        { id: 'e2', source: 'name_b', target: 'obj', label: 'alias' },
        { id: 'e3', source: 'obj', target: 'mutate' },
        { id: 'e4', source: 'mutate', target: 'see_a' },
      ],
      steps: [
        {
          id: 's1',
          label: 'Create list',
          narration: 'a = [1,2,3] binds name a to a list object in memory.',
          activeNodeIds: ['name_a', 'obj'],
          activeEdgeIds: ['e1'],
          codeHighlightLines: [1],
        },
        {
          id: 's2',
          label: 'Alias',
          narration: 'b = a does not copy. Both names point to the same object.',
          activeNodeIds: ['name_a', 'obj', 'name_b'],
          activeEdgeIds: ['e1', 'e2'],
          codeHighlightLines: [2],
        },
        {
          id: 's3',
          label: 'Mutate via b',
          narration: 'b.append(4) mutates the one shared list.',
          activeNodeIds: ['obj', 'mutate'],
          activeEdgeIds: ['e3'],
          codeHighlightLines: [3],
        },
        {
          id: 's4',
          label: 'a sees change',
          narration: 'Reading a shows [1,2,3,4]. Identity (is) is True; values match too.',
          activeNodeIds: ['see_a', 'name_a', 'name_b'],
          activeEdgeIds: ['e4'],
          codeHighlightLines: [4, 5],
        },
      ],
    },
    concept: {
      definition:
        'Variables are names bound to objects. Assignment rebinds a name. Mutating a mutable object is visible through every name that points at it.',
      internals: [
        'id(obj) is the object identity (CPython: memory-related).',
        'is compares identity; == compares value via __eq__.',
        'Immutables (int, str, tuple) cannot change in place — “change” means rebind.',
      ],
      terms: [
        { term: 'Name', meaning: 'A reference in a namespace pointing at an object.' },
        { term: 'Object', meaning: 'Heap value with type, identity, and value.' },
        { term: 'Alias', meaning: 'Two names pointing at the same object.' },
      ],
    },
    code: [
      {
        id: 'c1',
        title: 'Shared list',
        language: 'python',
        code: `a = [1, 2, 3]
b = a
b.append(4)
print(a)      # [1, 2, 3, 4]
print(a is b) # True`,
      },
      {
        id: 'c2',
        title: 'is vs ==',
        language: 'python',
        code: `x = [1, 2]
y = [1, 2]
print(x == y)  # True  (same value)
print(x is y)  # False (different objects)`,
      },
    ],
    scenario: {
      title: 'Copy the retrieval list',
      situation: 'You need an independent copy of retrieved chunks before mutating scores.',
      choices: [
        {
          id: 'a',
          label: 'other = chunks',
          outcome: 'failure',
          explanation: 'Alias — both names share one list.',
        },
        {
          id: 'b',
          label: 'other = chunks.copy() or list(chunks) / copy.deepcopy for nested',
          outcome: 'success',
          explanation: 'Shallow copy for flat lists; deepcopy when nested mutables matter.',
        },
        {
          id: 'c',
          label: 'other = id(chunks)',
          outcome: 'failure',
          explanation: 'id returns an integer identity, not a copy.',
        },
      ],
    },
    interview: [
      {
        id: 'i1',
        kind: 'concept',
        question: 'Difference between is and ==?',
        answer: {
          concept: 'is = identity; == = equality.',
          syntax: 'Use `x is None`; prefer == for values.',
          example: '[1]==[1] True, [1] is [1] False.',
          tradeoff: 'Relying on int interning with is is a bug waiting to happen.',
        },
      },
    ],
  }),
]

const m2Lessons: PyLesson[] = [
  lesson({
    id: 'lists-vs-dicts',
    moduleId: 'm2',
    order: 1,
    title: 'Lists vs dictionaries in real APIs',
    duration: '22 min',
    sourceHint: 'Python_Lists_Complete_Guide.md / Python_Dictionaries_Complete_Guide.md',
    story: {
      title: 'O(n) lookup in a hot path',
      scene:
        'A FastAPI ranking endpoint scans a list of 50k resume ids with `if rid in results` on every request. Latency spikes under load.',
      pain: 'Wrong collection choice turns a fine algorithm into a production incident.',
    },
    flow: {
      title: 'Membership check cost',
      nodes: [
        { id: 'req', label: 'Request', kind: 'start' },
        { id: 'list', label: 'list scan', kind: 'danger' },
        { id: 'set', label: 'set/dict', kind: 'process' },
        { id: 'ok', label: 'Fast path', kind: 'success' },
      ],
      edges: [
        { id: 'e1', source: 'req', target: 'list' },
        { id: 'e2', source: 'req', target: 'set' },
        { id: 'e3', source: 'set', target: 'ok' },
      ],
      steps: [
        {
          id: 's1',
          label: 'Incoming id',
          narration: 'API receives a resume id and must check membership.',
          activeNodeIds: ['req'],
          activeEdgeIds: [],
        },
        {
          id: 's2',
          label: 'List membership',
          narration: '`id in big_list` walks elements — average O(n).',
          activeNodeIds: ['req', 'list'],
          activeEdgeIds: ['e1'],
        },
        {
          id: 's3',
          label: 'Set/dict',
          narration: 'Convert once to a set/dict; membership is average O(1).',
          activeNodeIds: ['req', 'set'],
          activeEdgeIds: ['e2'],
        },
        {
          id: 's4',
          label: 'Win',
          narration: 'Hot path stays fast; list still wins for ordered sequences.',
          activeNodeIds: ['set', 'ok'],
          activeEdgeIds: ['e3'],
        },
      ],
    },
    concept: {
      definition:
        'Lists are ordered sequences. Dicts map keys to values with hash-based lookup. Sets store unique hashed elements. Pick the structure that matches access patterns.',
      internals: [
        'list: contiguous array of pointers — great for index/order.',
        'dict: hash table — keys must be hashable (immutable).',
        'Comprehensions build new collections eagerly (except generator expressions).',
      ],
      terms: [
        { term: 'Hashable', meaning: 'Stable hash(); required for dict keys/set items.' },
        { term: 'Amortized O(1)', meaning: 'Average dict/set lookup cost.' },
      ],
    },
    code: [
      {
        id: 'c1',
        title: 'Fix the hot path',
        language: 'python',
        code: `ids = [r["id"] for r in resumes]          # slow membership
id_set = {r["id"] for r in resumes}      # build once
if resume_id in id_set:                  # O(1) average
    ...`,
      },
    ],
    scenario: {
      title: 'Need order and fast lookup',
      situation: 'You must preserve insertion order and check membership often.',
      choices: [
        {
          id: 'a',
          label: 'Only a list',
          outcome: 'warning',
          explanation: 'Order yes; membership becomes O(n).',
        },
        {
          id: 'b',
          label: 'dict/Ordered approach or list + set sidecar',
          outcome: 'success',
          explanation: 'Keep order in a list (or dict keys since 3.7) and a set for membership if needed.',
        },
        {
          id: 'c',
          label: 'Only a set',
          outcome: 'warning',
          explanation: 'Fast membership, but sets are unordered (order not guaranteed as API contract).',
        },
      ],
    },
    interview: [
      {
        id: 'i1',
        kind: 'concept',
        question: 'Why can’t a list be a dict key?',
        answer: {
          concept: 'Dict keys must be hashable; lists are mutable.',
          syntax: 'Use tuple(...) if a sequence key is needed.',
          example: '{[1]: "x"} raises TypeError.',
          tradeoff: 'Immutability enables reliable hashing.',
        },
      },
    ],
  }),
]

function shellLesson(
  partial: Partial<PyLesson> & Pick<PyLesson, 'id' | 'moduleId' | 'order' | 'title'>,
): PyLesson {
  const base: PyLesson = {
    id: partial.id,
    moduleId: partial.moduleId,
    order: partial.order,
    title: partial.title,
    duration: '18 min',
    story: {
      title: partial.title,
      scene: `You hit “${partial.title}” while shipping a Python/FastAPI GenAI service.`,
      pain: 'Surface knowledge fails in interviews and production debugging.',
    },
    flow: {
      title: `${partial.title} flow`,
      nodes: [
        { id: 'a', label: 'Situation', kind: 'start' },
        { id: 'b', label: 'Mechanism', kind: 'process' },
        { id: 'c', label: 'Verify', kind: 'success' },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ],
      steps: [
        {
          id: 's1',
          label: 'Frame',
          narration: `Start from a concrete bug or interview prompt about ${partial.title}.`,
          activeNodeIds: ['a'],
          activeEdgeIds: [],
        },
        {
          id: 's2',
          label: 'Mechanism',
          narration: 'Name the Python rule or runtime behavior that explains it.',
          activeNodeIds: ['a', 'b'],
          activeEdgeIds: ['e1'],
        },
        {
          id: 's3',
          label: 'Prove it',
          narration: 'Run a 5-line experiment and state the tradeoff.',
          activeNodeIds: ['b', 'c'],
          activeEdgeIds: ['e2'],
        },
      ],
    },
    concept: {
      definition: partial.title,
      internals: ['Learn the rule', 'Connect to FastAPI/GenAI code', 'Verify with a tiny experiment'],
      terms: [],
    },
    code: [
      {
        id: 'c1',
        title: 'Minimal sketch',
        language: 'python',
        code: `# Explore: ${partial.title}\nprint("replace with the lesson experiment")\n`,
      },
    ],
    scenario: {
      title: 'Choose the sound approach',
      situation: `Which response shows mastery of ${partial.title}?`,
      choices: [
        {
          id: 'a',
          label: 'Memorize a buzzword and move on',
          outcome: 'failure',
          explanation: 'Interviews probe mechanism and tradeoffs.',
        },
        {
          id: 'b',
          label: 'Define → show syntax → tiny example → tradeoff (C-S-E-T)',
          outcome: 'success',
          explanation: 'That is the senior answer pattern from the interview pack.',
        },
        {
          id: 'c',
          label: 'Only paste StackOverflow',
          outcome: 'warning',
          explanation: 'Might work once; fails follow-ups.',
        },
      ],
    },
    interview: [
      {
        id: 'i1',
        kind: 'concept',
        question: `Explain ${partial.title} using C-S-E-T.`,
        answer: {
          concept: `One-line definition of ${partial.title}.`,
          syntax: 'Show the idiomatic Python form.',
          example: '3–8 lines that prove the point.',
          tradeoff: 'When not to use it.',
        },
      },
    ],
  }
  return {
    ...base,
    ...partial,
    story: { ...base.story, ...partial.story },
    flow: partial.flow ?? base.flow,
    concept: { ...base.concept, ...partial.concept },
    code: partial.code ?? base.code,
    scenario: partial.scenario ?? base.scenario,
    interview: partial.interview ?? base.interview,
  }
}

export const PYTHON_MODULES: PyModule[] = [
  {
    id: 'm1',
    number: 1,
    title: 'Python fundamentals',
    goal: 'Explain how Python executes code and how names relate to objects.',
    lessons: m1Lessons,
    mastery: {
      concept: {
        q: 'What runs between your .py file and visible output?',
        a: 'Compile to bytecode, then the PVM executes that bytecode.',
      },
      scenario: {
        q: 'Two variables “share” a list unexpectedly. Why?',
        a: 'Assignment aliased the same object; mutation is visible through every name.',
      },
      interview: {
        q: 'is vs == — when do you use each?',
        a: 'is for identity/sentinels (None); == for value equality.',
      },
    },
  },
  {
    id: 'm2',
    number: 2,
    title: 'Collections',
    goal: 'Choose list/dict/set/tuple and comprehensions for real access patterns.',
    lessons: m2Lessons,
    mastery: {
      concept: {
        q: 'Why are dict keys hashable?',
        a: 'Hash tables need stable hashes; mutable keys would break buckets.',
      },
      scenario: {
        q: 'Membership checks on 50k ids are slow. Fix?',
        a: 'Use a set/dict for O(1) average membership after a one-time build.',
      },
      interview: {
        q: 'List vs generator comprehension?',
        a: 'List builds eagerly in memory; generator yields lazily.',
      },
    },
  },
  {
    id: 'm3',
    number: 3,
    title: 'Functions',
    goal: 'Master args/kwargs, LEGB, closures, and functional tools.',
    lessons: [
      shellLesson({
        id: 'legb-and-closures',
        moduleId: 'm3',
        order: 1,
        title: 'LEGB scope and closures',
        labId: 'mutable-trap',
        concept: {
          definition:
            'Name lookup walks Local → Enclosing → Global → Builtins. Closures remember enclosing vars; mutable default args are evaluated once at definition time.',
          internals: [
            'def create_bumps into a function object.',
            'Default argument objects are created once and reused.',
            'nonlocal rebinds enclosing names; global rebinds module names.',
          ],
          terms: [
            { term: 'LEGB', meaning: 'Python name resolution order.' },
            { term: 'Closure', meaning: 'Function that carries enclosing state.' },
          ],
        },
        code: [
          {
            id: 'c1',
            title: 'Mutable default trap',
            language: 'python',
            code: `def add_item(item, bucket=[]):  # BUG: shared default
    bucket.append(item)
    return bucket

print(add_item("a"))  # ['a']
print(add_item("b"))  # ['a', 'b']  surprise`,
          },
        ],
      }),
      shellLesson({
        id: 'args-kwargs',
        moduleId: 'm3',
        order: 2,
        title: '*args, **kwargs, and call patterns',
        sourceHint: '11_args_kwargs_functional.md',
      }),
    ],
    mastery: {
      concept: {
        q: 'Why is `def f(x=[])` dangerous?',
        a: 'The default list is created once and shared across calls.',
      },
      scenario: {
        q: 'Factory must remember config without a class. Tool?',
        a: 'Closure or functools.partial — carry enclosing state.',
      },
      interview: {
        q: 'Explain LEGB with an enclosing nested function.',
        a: 'Inner reads enclosing vars; nonlocal required to rebind them.',
      },
    },
  },
  {
    id: 'm4',
    number: 4,
    title: 'Object-oriented Python',
    goal: 'Use classes, inheritance, MRO, and composition like a backend engineer.',
    lessons: [
      shellLesson({
        id: 'oop-pillars',
        moduleId: 'm4',
        order: 1,
        title: 'Four pillars with Python examples',
        sourceHint: '01_oop.md',
        concept: {
          definition:
            'Encapsulation bundles state; abstraction hides how; inheritance reuses; polymorphism lets one call work across types (often via duck typing).',
          internals: [
            'Instance attrs live in obj.__dict__ unless __slots__.',
            'Attribute lookup uses descriptors + MRO.',
          ],
          terms: [
            { term: 'Duck typing', meaning: 'Behavior matters more than nominal type.' },
            { term: 'MRO', meaning: 'Method Resolution Order (C3).' },
          ],
        },
        code: [
          {
            id: 'c1',
            title: 'Class vs instance attribute trap',
            language: 'python',
            code: `class A:
    items = []          # SHARED across instances

a, b = A(), A()
a.items.append(1)
print(b.items)          # [1]`,
          },
        ],
        labId: 'mutable-trap',
      }),
      shellLesson({
        id: 'mro-super',
        moduleId: 'm4',
        order: 2,
        title: 'MRO and super()',
        labId: 'mro-tracer',
        sourceHint: 'topics/01-oop/mro-and-super.md',
        concept: {
          definition:
            'Python uses C3 linearization to order base classes. super() cooperates with that order — it does not mean “my parent only.”',
          internals: ['Inspect with Class.__mro__', 'Diamond inheritance needs cooperative super calls'],
          terms: [{ term: 'C3', meaning: 'Linearization algorithm for MRO.' }],
        },
      }),
      shellLesson({
        id: 'composition-vs-inheritance',
        moduleId: 'm4',
        order: 3,
        title: 'Composition vs inheritance',
        sourceHint: 'topics/01-oop/composition-vs-inheritance.md',
      }),
    ],
    mastery: {
      concept: {
        q: 'What does super() actually do?',
        a: 'Delegates along the MRO, enabling cooperative multiple inheritance.',
      },
      scenario: {
        q: 'Shared mutable class attribute bites production. Fix?',
        a: 'Initialize mutables in __init__ per instance.',
      },
      interview: {
        q: 'When prefer composition?',
        a: 'Has-a relationships, swapping strategies, avoiding deep fragile hierarchies.',
      },
    },
  },
  {
    id: 'm5',
    number: 5,
    title: 'Advanced Python',
    goal: 'Decorators, generators, context managers, and dunder methods.',
    lessons: [
      shellLesson({
        id: 'decorators',
        moduleId: 'm5',
        order: 1,
        title: 'Decorators as wrappers',
        labId: 'decorator-unwrap',
        sourceHint: '05_Python_Decorators_Generators_Iterators.md',
        concept: {
          definition:
            'A decorator is a callable that takes a function and returns a wrapped function. `@a` above `@b` means `f = a(b(f))`.',
          internals: ['Preserve metadata with functools.wraps', 'Decorator factories take arguments'],
          terms: [{ term: 'Wrapper', meaning: 'Inner function that adds behavior around the original.' }],
        },
        code: [
          {
            id: 'c1',
            title: 'Stack order',
            language: 'python',
            code: `@a
@b
def f():
    ...
# equivalent to f = a(b(f))`,
          },
        ],
      }),
      shellLesson({
        id: 'generators',
        moduleId: 'm5',
        order: 2,
        title: 'Generators and lazy pipelines',
        labId: 'generator-stepper',
        sourceHint: '12_generators_iterators.md',
      }),
      shellLesson({
        id: 'context-managers',
        moduleId: 'm5',
        order: 3,
        title: 'Context managers and with',
        sourceHint: '06_context_managers.md',
      }),
    ],
    mastery: {
      concept: {
        q: 'What does yield do to a function?',
        a: 'Turns it into a generator; execution suspends and resumes.',
      },
      scenario: {
        q: 'Streaming a large resume corpus — list or generator?',
        a: 'Generator/iterator pipeline to bound memory.',
      },
      interview: {
        q: 'Why functools.wraps on decorators?',
        a: 'Keeps __name__/__doc__ for debugging, OpenAPI, and tests.',
      },
    },
  },
  {
    id: 'm6',
    number: 6,
    title: 'Typing and data models',
    goal: 'Dataclasses, enums, typing, and Pydantic for API boundaries.',
    lessons: [
      shellLesson({
        id: 'dataclasses-enums',
        moduleId: 'm6',
        order: 1,
        title: 'Dataclasses and enums',
        sourceHint: '10_dataclass_enum.md',
      }),
      shellLesson({
        id: 'pydantic-boundaries',
        moduleId: 'm6',
        order: 2,
        title: 'Pydantic at API boundaries',
        sourceHint: '16_pydantic.md',
        concept: {
          definition:
            'Pydantic validates and parses data at trust boundaries (HTTP bodies, env, tool outputs) so invalid shapes fail fast.',
          internals: ['v2 is rust-core faster', 'Use model_validate / model_dump'],
          terms: [{ term: 'Trust boundary', meaning: 'Where untrusted data enters your system.' }],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'Dataclass vs Pydantic model?',
        a: 'Dataclass is lightweight structure; Pydantic adds validation/parsing for external data.',
      },
      scenario: {
        q: 'LLM returns messy JSON for resume fields. Where validate?',
        a: 'At the boundary with a Pydantic model before business logic.',
      },
      interview: {
        q: 'Why type hints if Python is dynamic?',
        a: 'Readable contracts, editor help, mypy/pyright, and runtime validators.',
      },
    },
  },
  {
    id: 'm7',
    number: 7,
    title: 'Concurrency',
    goal: 'Choose threads, processes, or asyncio with the GIL in mind.',
    lessons: [
      shellLesson({
        id: 'gil-mental-model',
        moduleId: 'm7',
        order: 1,
        title: 'GIL mental model',
        labId: 'gil-vs-async',
        sourceHint: '07_concurrency.md',
        concept: {
          definition:
            'The GIL allows one thread to execute Python bytecode at a time in CPython. Threads help I/O waits; CPU-bound work needs multiprocessing or native extensions.',
          internals: [
            'asyncio interleaves awaits on one thread',
            'Process pool bypasses GIL with separate interpreters',
          ],
          terms: [{ term: 'GIL', meaning: 'Global Interpreter Lock in CPython.' }],
        },
      }),
      shellLesson({
        id: 'asyncio-fastapi',
        moduleId: 'm7',
        order: 2,
        title: 'Asyncio for FastAPI I/O',
        sourceHint: '07_Python_Concurrency_Threading.md',
      }),
    ],
    mastery: {
      concept: {
        q: 'When do threads not speed CPU work?',
        a: 'Under CPython GIL, bytecode still serializes; use processes or C extensions.',
      },
      scenario: {
        q: '100 parallel LLM HTTP calls — threads or asyncio?',
        a: 'asyncio (or async HTTP client) usually fits I/O-bound fan-out best.',
      },
      interview: {
        q: 'Blocking call inside async route — risk?',
        a: 'Blocks the event loop; wrap in threadpool or use async driver.',
      },
    },
  },
  {
    id: 'm8',
    number: 8,
    title: 'Files and errors',
    goal: 'Exceptions, files, and pathlib done the production way.',
    lessons: [
      shellLesson({
        id: 'exceptions',
        moduleId: 'm8',
        order: 1,
        title: 'Exception strategy',
        sourceHint: '05_exceptions.md',
      }),
      shellLesson({
        id: 'files-pathlib',
        moduleId: 'm8',
        order: 2,
        title: 'Files, JSON, CSV, pathlib',
        sourceHint: '03_file_handling.md',
      }),
    ],
    mastery: {
      concept: {
        q: 'bare except: — why bad?',
        a: 'Swallows KeyboardInterrupt/SystemExit and hides bugs.',
      },
      scenario: {
        q: 'Need to process a 5GB JSONL resume dump.',
        a: 'Stream line-by-line; never json.load the entire file into RAM.',
      },
      interview: {
        q: 'with open(...) as f benefits?',
        a: 'Guaranteed close via context manager even on errors.',
      },
    },
  },
  {
    id: 'm9',
    number: 9,
    title: 'Backend Python',
    goal: 'Apply Python to FastAPI performance, data, and API design scenarios.',
    lessons: [
      shellLesson({
        id: 'fastapi-perf',
        moduleId: 'm9',
        order: 1,
        title: 'Diagnosing a slow FastAPI endpoint',
        sourceHint: 'python_backend_interview_guide.md',
        concept: {
          definition:
            'Profile before guessing. Common wins: fix N+1 queries, add caching, avoid sync I/O in async routes, shrink payloads.',
          internals: ['Timing middleware', 'explain/analyze SQL', 'Redis for hot dashboards'],
          terms: [{ term: 'N+1', meaning: 'One query plus one per child row — death by chatter.' }],
        },
        code: [
          {
            id: 'c1',
            title: 'Timing middleware sketch',
            language: 'python',
            code: `@app.middleware("http")
async def timing(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter()-start:.4f}s"
    return response`,
          },
        ],
      }),
      shellLesson({
        id: 'api-boundaries',
        moduleId: 'm9',
        order: 2,
        title: 'Validation and trust boundaries',
        sourceHint: 'python_backend_interview_guide.md',
      }),
    ],
    mastery: {
      concept: {
        q: 'First step on a 3s endpoint?',
        a: 'Measure: middleware timings + profiler — then fix the hottest span.',
      },
      scenario: {
        q: 'Healthy /health but slow RAG answers.',
        a: 'Trace embed/search/LLM timings; health ≠ end-to-end latency.',
      },
      interview: {
        q: 'Sync SQLAlchemy in async FastAPI?',
        a: 'Can block the loop; prefer async session or run_in_threadpool carefully.',
      },
    },
  },
  {
    id: 'm10',
    number: 10,
    title: 'Interview arena',
    goal: 'Drill C-S-E-T answers and coding challenges from the pack.',
    lessons: [
      shellLesson({
        id: 'cset-method',
        moduleId: 'm10',
        order: 1,
        title: 'Answer every question with C-S-E-T',
        sourceHint: '00_README.md',
        concept: {
          definition:
            'C-S-E-T: Concept, Syntax, Example, Tradeoff. This is the senior interview pattern from the Python copy pack.',
          internals: ['Speak concept in one line', 'Show idiomatic syntax', 'Tiny example', 'When NOT to use'],
          terms: [{ term: 'C-S-E-T', meaning: 'Concept · Syntax · Example · Tradeoff' }],
        },
      }),
      shellLesson({
        id: 'coding-challenges-warmup',
        moduleId: 'm10',
        order: 2,
        title: 'Coding challenge warmup',
        sourceHint: '19_coding_challenges.md',
      }),
    ],
    mastery: {
      concept: {
        q: 'What are the four C-S-E-T parts?',
        a: 'Concept, Syntax, Example, Tradeoff.',
      },
      scenario: {
        q: 'Interviewer says “tell me about GIL.” Outline your answer.',
        a: 'Define → where it lives → I/O vs CPU example → processes/asyncio tradeoff.',
      },
      interview: {
        q: 'How do you practice without memorizing?',
        a: 'Explain aloud daily; write 5-line proofs; revisit weak topics weekly.',
      },
    },
  },
]

export function getPyModule(id: string) {
  return PYTHON_MODULES.find((m) => m.id === id)
}

export function getPyLesson(moduleId: string, lessonId: string) {
  return getPyModule(moduleId)?.lessons.find((l) => l.id === lessonId)
}

export function getFirstPyLesson() {
  return PYTHON_MODULES[0]?.lessons[0]
}
