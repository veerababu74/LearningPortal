/**
 * Python execution simulations: what the interpreter does, line by line.
 */
import type { AgentSim } from '@/content/agents/visualizer'

const py = (module: string) => `/python/learn/${module}`

/* ================================================================ call stack / recursion */

const CALL_STACK: AgentSim = {
  id: 'py-call-stack',
  title: 'Call stack: how recursion pushes and pops frames',
  framework: 'Python',
  group: 'Core Python',
  module: '03',
  home: py('03'),
  level: 'Beginner',
  summary: 'Every call creates a frame with its own local variables. Watch factorial(3) push three frames, hit the base case, and unwind.',
  scenario: 'Compute factorial(3) recursively and print the result.',
  nodes: [
    { id: 'mod', label: '<module>', sub: 'global frame', x: 110, y: 60, kind: 'agent' },
    { id: 'f3', label: 'factorial(3)', sub: 'n = 3', x: 300, y: 145, kind: 'agent' },
    { id: 'f2', label: 'factorial(2)', sub: 'n = 2', x: 490, y: 230, kind: 'agent' },
    { id: 'f1', label: 'factorial(1)', sub: 'n = 1 · base case', x: 680, y: 315, kind: 'agent' },
    { id: 'out', label: 'stdout', x: 110, y: 320, kind: 'service' },
  ],
  edges: [
    { id: 'm-3', from: 'mod', to: 'f3', bend: -20 },
    { id: '3-2', from: 'f3', to: 'f2', bend: -20 },
    { id: '2-1', from: 'f2', to: 'f1', bend: -20 },
    { id: '1-2', from: 'f1', to: 'f2', bend: -20 },
    { id: '2-3', from: 'f2', to: 'f3', bend: -20 },
    { id: '3-m', from: 'f3', to: 'mod', bend: -20 },
    { id: 'm-o', from: 'mod', to: 'out' },
  ],
  code: `def factorial(n):
    if n == 1:
        return 1
    return n * factorial(n - 1)

result = factorial(3)
print(result)`,
  steps: [
    {
      title: 'Call factorial(3)',
      edge: 'm-3',
      packet: 'n=3',
      narration: 'Calling a function pushes a new frame on the call stack. The frame holds the local variable n = 3 and where to return to.',
      state: { 'call stack (top last)': ['<module>', 'factorial(n=3)'], waiting: [], result: '—' },
      changed: ['call stack (top last)'],
      log: 'push factorial(3)',
      hl: ['result = factorial(3)', 'def factorial(n):'],
    },
    {
      title: 'Not the base case → call factorial(2)',
      edge: '3-2',
      packet: 'n=2',
      narration: 'n == 1 is False, so line 4 runs. Python must evaluate factorial(2) before it can multiply, so frame 3 pauses at “3 * ?”.',
      state: { 'call stack (top last)': ['<module>', 'factorial(n=3)', 'factorial(n=2)'], waiting: ['factorial(3): 3 * ?'], result: '—' },
      changed: ['call stack (top last)', 'waiting'],
      log: 'push factorial(2)',
      hl: ['if n == 1:', 'return n * factorial(n - 1)'],
    },
    {
      title: 'Call factorial(1)',
      edge: '2-1',
      packet: 'n=1',
      narration: 'Same again. Each frame has its own n — they do not overwrite each other.',
      state: { 'call stack (top last)': ['<module>', 'factorial(n=3)', 'factorial(n=2)', 'factorial(n=1)'], waiting: ['factorial(3): 3 * ?', 'factorial(2): 2 * ?'], result: '—' },
      changed: ['call stack (top last)', 'waiting'],
      log: 'push factorial(1)',
      predict: {
        question: 'How many factorial frames are on the stack right now?',
        options: ['1 — each call replaces the previous', '3 — every call is still waiting', '2', 'Python has no call stack'],
        answer: 1,
        explain: 'factorial(3) and factorial(2) are paused mid-expression, waiting for the call they made to return.',
      },
    },
    {
      title: 'Base case returns 1',
      edge: '1-2',
      packet: 'return 1',
      node: 'f2',
      tone: 'ok',
      narration: 'n == 1 is True: return 1 without recursing. The frame is popped and the value goes to the caller.',
      state: { 'call stack (top last)': ['<module>', 'factorial(n=3)', 'factorial(n=2)'], waiting: ['factorial(3): 3 * ?', 'factorial(2): 2 * 1'], result: '—' },
      changed: ['call stack (top last)', 'waiting'],
      log: 'pop factorial(1) → 1',
      hl: ['if n == 1:', 'return 1'],
    },
    {
      title: 'factorial(2) returns 2',
      edge: '2-3',
      packet: 'return 2',
      node: 'f3',
      narration: 'factorial(2) resumes, computes 2 * 1 = 2, returns and is popped.',
      state: { 'call stack (top last)': ['<module>', 'factorial(n=3)'], waiting: ['factorial(3): 3 * 2'], result: '—' },
      changed: ['call stack (top last)', 'waiting'],
      log: 'pop factorial(2) → 2',
      hl: ['return n * factorial(n - 1)'],
    },
    {
      title: 'factorial(3) returns 6',
      edge: '3-m',
      packet: 'return 6',
      node: 'mod',
      narration: '3 * 2 = 6. Only the module frame is left; result is bound to 6.',
      state: { 'call stack (top last)': ['<module>'], waiting: [], result: '6' },
      changed: ['call stack (top last)', 'waiting', 'result'],
      log: 'pop factorial(3) → 6',
      hl: ['result = factorial(3)'],
    },
    {
      title: 'print',
      edge: 'm-o',
      packet: '6',
      node: 'out',
      tone: 'ok',
      narration: 'CPython limits the depth (sys.getrecursionlimit() is 1000 by default) — without a base case you get RecursionError instead of an infinite stack.',
      log: 'stdout: 6',
      hl: ['print(result)'],
    },
  ],
  match: /recursion|call stack|backtracking|functions?\b|stack frame/i,
  takeaways: ['Each call gets its own frame and locals.', 'Callers pause mid-expression until the callee returns.', 'Every recursion needs a base case; depth is limited.'],
}

/* ================================================================ names and objects */

const REFERENCES: AgentSim = {
  id: 'py-references',
  title: 'Names, objects and mutation (aliasing)',
  framework: 'Python',
  group: 'Core Python',
  module: '01',
  home: py('01'),
  level: 'Beginner',
  summary: 'Assignment never copies — it binds another name to the same object. See why b.append() changes a, and how .copy() breaks the link.',
  scenario: 'Two variables, one list. Then a shallow copy.',
  nodes: [
    { id: 'a', label: 'name a', x: 110, y: 80, kind: 'user' },
    { id: 'b', label: 'name b', x: 110, y: 200, kind: 'user' },
    { id: 'c', label: 'name c', x: 110, y: 320, kind: 'user' },
    { id: 'L1', label: 'list @0x7f10', sub: 'refcount varies', x: 430, y: 140, kind: 'memory' },
    { id: 'L2', label: 'list @0x7f88', sub: 'the copy', x: 430, y: 320, kind: 'memory' },
    { id: 'out', label: 'stdout', x: 700, y: 220, kind: 'service' },
  ],
  edges: [
    { id: 'a-L1', from: 'a', to: 'L1' },
    { id: 'b-L1', from: 'b', to: 'L1' },
    { id: 'c-L2', from: 'c', to: 'L2' },
    { id: 'L1-L2', from: 'L1', to: 'L2' },
    { id: 'L1-o', from: 'L1', to: 'out' },
    { id: 'L2-o', from: 'L2', to: 'out' },
  ],
  code: `a = [1, 2]
b = a              # no copy: a second name for the same object
b.append(3)        # mutate the shared object
print(a, a is b)   # [1, 2, 3] True
c = a.copy()       # new list object (shallow copy)
c.append(4)
print(a, c)        # [1, 2, 3] [1, 2, 3, 4]`,
  steps: [
    {
      title: 'a = [1, 2]',
      edge: 'a-L1',
      packet: 'bind',
      narration: 'Python creates a list object on the heap and binds the name a to it. Names are labels; objects live separately.',
      state: { a: '→ list@0x7f10', b: '—', c: '—', 'list@0x7f10': '[1, 2]  (refs: 1)', 'list@0x7f88': '—' },
      changed: ['a', 'list@0x7f10'],
      log: 'create list@0x7f10, bind a',
      hl: ['a = [1, 2]'],
    },
    {
      title: 'b = a',
      edge: 'b-L1',
      packet: 'bind (no copy)',
      narration: 'Assignment binds b to the same object. No new list exists; the reference count goes to 2.',
      state: { a: '→ list@0x7f10', b: '→ list@0x7f10', c: '—', 'list@0x7f10': '[1, 2]  (refs: 2)', 'list@0x7f88': '—' },
      changed: ['b', 'list@0x7f10'],
      log: 'bind b to list@0x7f10',
      hl: ['b = a'],
      predict: {
        question: 'After b.append(3), what is a?',
        options: ['[1, 2]', '[1, 2, 3]', 'An error', '[3]'],
        answer: 1,
        explain: 'a and b are the same object, so a mutation through either name is visible through both.',
      },
    },
    {
      title: 'b.append(3) mutates the shared list',
      edge: 'b-L1',
      packet: 'append(3)',
      node: 'L1',
      tone: 'warn',
      narration: 'Lists are mutable: append changes the object in place. Both names see the change.',
      state: { a: '→ list@0x7f10', b: '→ list@0x7f10', c: '—', 'list@0x7f10': '[1, 2, 3]  (refs: 2)', 'list@0x7f88': '—' },
      changed: ['list@0x7f10'],
      log: 'list@0x7f10.append(3)',
      hl: ['b.append(3)'],
    },
    {
      title: 'print(a, a is b)',
      edge: 'L1-o',
      packet: '[1, 2, 3] True',
      node: 'out',
      narration: '`is` compares identity (same object), `==` compares value. Here both are True.',
      log: 'stdout: [1, 2, 3] True',
      hl: ['print(a, a is b)'],
    },
    {
      title: 'c = a.copy()',
      edge: 'L1-L2',
      packet: 'shallow copy',
      node: 'L2',
      narration: '.copy() creates a new list object containing the same element references. c is bound to the new object.',
      state: { a: '→ list@0x7f10', b: '→ list@0x7f10', c: '→ list@0x7f88', 'list@0x7f10': '[1, 2, 3]  (refs: 2)', 'list@0x7f88': '[1, 2, 3]  (refs: 1)' },
      changed: ['c', 'list@0x7f88'],
      log: 'create list@0x7f88 (copy), bind c',
      hl: ['c = a.copy()'],
    },
    {
      title: 'c.append(4) only changes the copy',
      edge: 'c-L2',
      packet: 'append(4)',
      node: 'L2',
      tone: 'ok',
      narration: 'Different objects, so a is unaffected. But it is a shallow copy: nested lists inside would still be shared — use copy.deepcopy for those.',
      state: { a: '→ list@0x7f10', b: '→ list@0x7f10', c: '→ list@0x7f88', 'list@0x7f10': '[1, 2, 3]  (refs: 2)', 'list@0x7f88': '[1, 2, 3, 4]  (refs: 1)' },
      changed: ['list@0x7f88'],
      log: 'list@0x7f88.append(4)',
      hl: ['c.append(4)'],
    },
    {
      title: 'print(a, c)',
      edge: 'L2-o',
      packet: '[1,2,3] [1,2,3,4]',
      node: 'out',
      narration: 'The same rule explains the mutable-default-argument bug: def f(x=[]) shares one list across all calls.',
      log: 'stdout: [1, 2, 3] [1, 2, 3, 4]',
      hl: ['print(a, c)'],
    },
  ],
  match: /mutable|immutable|memory|reference|variables|refcount|copy|identity|garbage|default arg/i,
  takeaways: ['Assignment binds a name; it never copies.', 'Mutating an object is visible through every name bound to it.', 'copy() is shallow; deepcopy() copies nested objects.'],
}

/* ================================================================ generators */

const GENERATOR: AgentSim = {
  id: 'py-generator',
  title: 'Generators: pause at yield, resume on next()',
  framework: 'Python',
  group: 'Core Python',
  module: '05',
  home: py('05'),
  level: 'Intermediate',
  summary: 'Calling a generator function runs nothing. Each next() resumes the frame until the next yield; the frame keeps its locals between calls.',
  scenario: 'A countdown generator consumed with next().',
  nodes: [
    { id: 'caller', label: 'caller', sub: '<module>', x: 130, y: 200, kind: 'agent' },
    { id: 'gen', label: 'generator frame', sub: 'countdown(n)', x: 470, y: 120, kind: 'router' },
    { id: 'out', label: 'stdout', x: 470, y: 330, kind: 'service' },
  ],
  edges: [
    { id: 'c-g', from: 'caller', to: 'gen', bend: -25 },
    { id: 'g-c', from: 'gen', to: 'caller', bend: -25 },
    { id: 'g-o', from: 'gen', to: 'out' },
    { id: 'c-o', from: 'caller', to: 'out' },
  ],
  code: `def countdown(n):
    print("start")
    while n > 0:
        yield n
        n -= 1
    print("done")

gen = countdown(2)
print(next(gen))
print(next(gen))
next(gen)          # StopIteration`,
  steps: [
    {
      title: 'gen = countdown(2)',
      node: 'gen',
      narration: 'Because the function contains yield, calling it returns a generator object. Not a single line of the body has run yet.',
      state: { 'gen state': 'GEN_CREATED', n: '2', 'paused at': '—', output: [] },
      changed: ['gen state'],
      log: 'create generator (body not started)',
      hl: ['gen = countdown(2)'],
      predict: {
        question: 'Has "start" been printed yet?',
        options: ['Yes, calling the function runs it', 'No — the body starts on the first next()', 'Only if n > 0', 'It printed "done"'],
        answer: 1,
        explain: 'Generator bodies are lazy. The first next() starts execution.',
      },
    },
    {
      title: 'first next()',
      edge: 'c-g',
      packet: 'next(gen)',
      narration: 'The frame starts running from the top.',
      state: { 'gen state': 'GEN_RUNNING', n: '2', 'paused at': '—', output: [] },
      changed: ['gen state'],
      log: 'next() → resume frame',
      hl: ['print(next(gen))'],
    },
    {
      title: 'prints start, yields 2',
      edge: 'g-c',
      packet: 'yield 2',
      narration: 'It prints "start", enters the loop and hits yield n. The value goes to the caller and the frame is suspended — locals and position are kept.',
      state: { 'gen state': 'GEN_SUSPENDED', n: '2', 'paused at': 'yield n (line 4)', output: ['start', '2'] },
      changed: ['gen state', 'paused at', 'output'],
      log: 'yield 2 (frame suspended)',
      hl: ['print("start")', 'while n > 0:', 'yield n'],
    },
    {
      title: 'second next() resumes after yield',
      edge: 'c-g',
      packet: 'next(gen)',
      node: 'gen',
      narration: 'Execution continues on the line after yield: n -= 1 → n = 1. No "start" this time.',
      state: { 'gen state': 'GEN_RUNNING', n: '1', 'paused at': '—', output: ['start', '2'] },
      changed: ['gen state', 'n'],
      log: 'resume at n -= 1',
      hl: ['n -= 1'],
    },
    {
      title: 'yields 1',
      edge: 'g-c',
      packet: 'yield 1',
      narration: 'Loop condition 1 > 0 is true, so it yields 1 and suspends again.',
      state: { 'gen state': 'GEN_SUSPENDED', n: '1', 'paused at': 'yield n (line 4)', output: ['start', '2', '1'] },
      changed: ['gen state', 'paused at', 'output'],
      log: 'yield 1',
      hl: ['yield n'],
    },
    {
      title: 'third next(): loop ends',
      edge: 'g-o',
      packet: 'done',
      node: 'out',
      narration: 'n becomes 0, the loop exits, "done" is printed and the function returns.',
      state: { 'gen state': 'GEN_RUNNING', n: '0', 'paused at': '—', output: ['start', '2', '1', 'done'] },
      changed: ['gen state', 'n', 'output'],
      log: 'loop exits, prints done',
      hl: ['print("done")'],
    },
    {
      title: 'StopIteration',
      edge: 'g-c',
      packet: 'StopIteration',
      node: 'caller',
      tone: 'warn',
      narration: 'Returning from a generator raises StopIteration in the caller. A for loop catches it for you — that is how `for x in countdown(2)` knows when to stop. Memory stays O(1) no matter how many values are produced.',
      state: { 'gen state': 'GEN_CLOSED', n: '0', 'paused at': '—', output: ['start', '2', '1', 'done'] },
      changed: ['gen state'],
      log: 'StopIteration',
      hl: ['next(gen)          # StopIteration'],
    },
  ],
  match: /generator|yield|iterator|lazy|itertools/i,
  takeaways: ['Calling a generator function only creates the generator.', 'yield suspends the frame and keeps its locals.', 'Exhaustion raises StopIteration, which for-loops handle.'],
}

/* ================================================================ decorators */

const DECORATOR: AgentSim = {
  id: 'py-decorator',
  title: 'Decorators: definition time vs call time',
  framework: 'Python',
  group: 'Core Python',
  module: '05',
  home: py('05'),
  level: 'Intermediate',
  summary: '@timer runs once when the function is defined and replaces it with wrapper. Every later call goes through wrapper, which calls the original via a closure.',
  scenario: 'Time a slow function with a decorator.',
  nodes: [
    { id: 'deco', label: 'timer(func)', sub: 'decorator', x: 130, y: 80, kind: 'router' },
    { id: 'wrap', label: 'wrapper', sub: 'closure: func', x: 420, y: 80, kind: 'agent' },
    { id: 'orig', label: 'original slow_add', x: 680, y: 210, kind: 'tool' },
    { id: 'caller', label: 'caller', x: 130, y: 320, kind: 'user' },
    { id: 'out', label: 'stdout', x: 420, y: 330, kind: 'service' },
  ],
  edges: [
    { id: 'o-d', from: 'orig', to: 'deco', bend: -40 },
    { id: 'd-w', from: 'deco', to: 'wrap' },
    { id: 'c-w', from: 'caller', to: 'wrap' },
    { id: 'w-o', from: 'wrap', to: 'orig', bend: -20 },
    { id: 'o-w', from: 'orig', to: 'wrap', bend: -20 },
    { id: 'w-out', from: 'wrap', to: 'out' },
    { id: 'w-c', from: 'wrap', to: 'caller', bend: 40 },
  ],
  code: `def timer(func):
    print(f"decorating {func.__name__}")
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.perf_counter() - start:.2f}s")
        return result
    return wrapper

@timer
def slow_add(a, b):
    time.sleep(0.1)
    return a + b

print(slow_add(2, 3))`,
  steps: [
    {
      title: 'def slow_add runs → passed to timer',
      edge: 'o-d',
      packet: 'func = slow_add',
      node: 'deco',
      narration: '@timer is shorthand for slow_add = timer(slow_add). It runs once, at definition time, when the module is imported.',
      state: { 'name slow_add': '→ original function', 'wrapper.func (closure)': '—', output: [] },
      log: 'timer(slow_add) called at definition time',
      hl: ['@timer', 'def slow_add(a, b):', 'def timer(func):'],
    },
    {
      title: 'timer builds wrapper',
      edge: 'd-w',
      packet: 'return wrapper',
      node: 'wrap',
      narration: 'timer prints, defines wrapper (which closes over func) and returns it. functools.wraps copies the name and docstring onto wrapper.',
      state: { 'name slow_add': '→ wrapper', 'wrapper.func (closure)': '→ original slow_add', output: ['decorating slow_add'] },
      changed: ['name slow_add', 'wrapper.func (closure)', 'output'],
      log: 'slow_add is now wrapper',
      hl: ['print(f"decorating', '@functools.wraps(func)', 'def wrapper', 'return wrapper'],
      predict: {
        question: 'When the module is imported but slow_add is never called, is "decorating slow_add" printed?',
        options: ['No, decorators run on each call', 'Yes — the decorator runs at definition time', 'Only in debug mode', 'Only if functools.wraps is used'],
        answer: 1,
        explain: 'The decorator itself runs once when def executes. Only wrapper runs on each call.',
      },
    },
    {
      title: 'Call slow_add(2, 3)',
      edge: 'c-w',
      packet: 'args (2, 3)',
      narration: 'The name slow_add now points to wrapper, so the call enters wrapper. The timer starts.',
      log: 'wrapper(2, 3)',
      hl: ['print(slow_add(2, 3))', 'start = time.perf_counter()'],
    },
    {
      title: 'wrapper calls the original',
      edge: 'w-o',
      packet: 'func(2, 3)',
      node: 'orig',
      narration: 'func is the original slow_add, kept alive by the closure. It sleeps 0.1 s and computes 5.',
      log: 'original slow_add(2, 3)',
      hl: ['result = func(*args, **kwargs)', 'time.sleep(0.1)', 'return a + b'],
    },
    {
      title: 'Result back to wrapper',
      edge: 'o-w',
      packet: '5',
      node: 'wrap',
      narration: 'wrapper receives 5 and measures the elapsed time.',
      log: 'result = 5',
    },
    {
      title: 'wrapper logs the timing',
      edge: 'w-out',
      packet: 'took 0.10s',
      node: 'out',
      narration: 'Because of functools.wraps, func.__name__ is still "slow_add" (and so is slow_add.__name__ from outside).',
      state: { 'name slow_add': '→ wrapper', 'wrapper.func (closure)': '→ original slow_add', output: ['decorating slow_add', 'slow_add took 0.10s'] },
      changed: ['output'],
      log: 'stdout: slow_add took 0.10s',
      hl: ['print(f"{func.__name__} took'],
    },
    {
      title: 'Return to the caller',
      edge: 'w-c',
      packet: 'return 5',
      node: 'caller',
      tone: 'ok',
      narration: 'wrapper must return result — forgetting `return result` is the most common decorator bug (the call returns None).',
      state: { 'name slow_add': '→ wrapper', 'wrapper.func (closure)': '→ original slow_add', output: ['decorating slow_add', 'slow_add took 0.10s', '5'] },
      changed: ['output'],
      log: 'stdout: 5',
      hl: ['return result'],
    },
  ],
  match: /decorator|closure|wrapper|functools|higher-order/i,
  takeaways: ['@d above def f means f = d(f), run once at definition.', 'wrapper runs on every call and reaches the original through a closure.', 'Use functools.wraps and always return the result.'],
}

/* ================================================================ context managers */

const CONTEXT: AgentSim = {
  id: 'py-context-manager',
  title: 'Context managers: __enter__, __exit__ and exceptions',
  framework: 'Python',
  group: 'Core Python',
  module: '05',
  home: py('05'),
  level: 'Intermediate',
  summary: 'A with block guarantees cleanup. Watch __exit__ receive the exception, roll back, and decide whether the exception keeps propagating.',
  scenario: 'A database-style transaction where the body raises ValueError.',
  nodes: [
    { id: 'with', label: 'with block', sub: 'caller code', x: 130, y: 200, kind: 'user' },
    { id: 'enter', label: '__enter__', x: 420, y: 70, kind: 'agent' },
    { id: 'exit', label: '__exit__', sub: 'gets the exception', x: 420, y: 330, kind: 'guard' },
    { id: 'out', label: 'stdout', x: 700, y: 200, kind: 'service' },
  ],
  edges: [
    { id: 'w-en', from: 'with', to: 'enter', bend: -20 },
    { id: 'en-w', from: 'enter', to: 'with', bend: -20 },
    { id: 'w-ex', from: 'with', to: 'exit', bend: -20 },
    { id: 'ex-w', from: 'exit', to: 'with', bend: -20 },
    { id: 'en-o', from: 'enter', to: 'out' },
    { id: 'ex-o', from: 'exit', to: 'out' },
  ],
  code: `class Transaction:
    def __enter__(self):
        print("BEGIN")
        return self
    def insert(self, row):
        print("INSERT", row)
    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            print("COMMIT")
        else:
            print(f"ROLLBACK ({exc_type.__name__})")
        return False            # False → re-raise the exception

try:
    with Transaction() as tx:
        tx.insert("order 1")
        raise ValueError("bad price")
except ValueError:
    print("caller handles it")`,
  steps: [
    {
      title: '__enter__ runs first',
      edge: 'w-en',
      packet: 'Transaction()',
      narration: 'The with statement creates the object and calls __enter__. Whatever it returns is bound to the `as` name.',
      state: { tx: '—', exception: 'None', output: [] },
      log: 'call __enter__',
      hl: ['with Transaction() as tx:', 'def __enter__(self):'],
    },
    {
      title: 'BEGIN, tx bound',
      edge: 'en-o',
      packet: 'BEGIN',
      narration: '__enter__ prints BEGIN and returns self, so tx is the Transaction object.',
      state: { tx: '→ Transaction', exception: 'None', output: ['BEGIN'] },
      changed: ['tx', 'output'],
      log: 'stdout: BEGIN',
      hl: ['print("BEGIN")', 'return self'],
    },
    {
      title: 'Body runs, then raises',
      edge: 'en-w',
      packet: 'tx',
      node: 'with',
      tone: 'bad',
      narration: 'The insert happens, then ValueError is raised in the middle of the block.',
      state: { tx: '→ Transaction', exception: 'ValueError("bad price")', output: ['BEGIN', 'INSERT order 1'] },
      changed: ['exception', 'output'],
      log: 'INSERT, then raise ValueError',
      hl: ['tx.insert("order 1")', 'raise ValueError("bad price")'],
      predict: {
        question: 'An exception was raised inside the with block. Does __exit__ still run?',
        options: ['No, the exception skips it', 'Yes — __exit__ always runs, and receives the exception', 'Only if there is a finally', 'Only for KeyboardInterrupt'],
        answer: 1,
        explain: 'That guarantee is the whole point of context managers: cleanup runs on success and on failure.',
      },
    },
    {
      title: '__exit__ receives the exception',
      edge: 'w-ex',
      packet: '(ValueError, exc, tb)',
      node: 'exit',
      narration: 'Python calls __exit__(exc_type, exc, tb). With no exception all three would be None.',
      log: '__exit__(ValueError, …)',
      hl: ['def __exit__(self, exc_type, exc, tb):', 'if exc_type is None:'],
    },
    {
      title: 'ROLLBACK',
      edge: 'ex-o',
      packet: 'ROLLBACK',
      node: 'out',
      tone: 'warn',
      narration: 'The cleanup path for failure.',
      state: { tx: '→ Transaction', exception: 'ValueError("bad price")', output: ['BEGIN', 'INSERT order 1', 'ROLLBACK (ValueError)'] },
      changed: ['output'],
      log: 'stdout: ROLLBACK (ValueError)',
      hl: ['print(f"ROLLBACK'],
    },
    {
      title: 'return False → exception continues',
      edge: 'ex-w',
      packet: 're-raise',
      node: 'with',
      tone: 'ok',
      narration: 'Returning False (or None) lets the exception propagate to the caller\'s except. Returning True would silently swallow it — rarely what you want.',
      state: { tx: '→ Transaction', exception: 'handled by caller', output: ['BEGIN', 'INSERT order 1', 'ROLLBACK (ValueError)', 'caller handles it'] },
      changed: ['exception', 'output'],
      log: 'except ValueError → caller handles it',
      hl: ['return False', 'except ValueError:', 'print("caller handles it")'],
    },
  ],
  match: /context manager|with statement|__enter__|__exit__|contextlib|file handling/i,
  takeaways: ['__exit__ always runs, even on exceptions.', 'It receives (exc_type, exc, tb).', 'Return False to propagate; True suppresses.'],
}

/* ================================================================ exceptions */

const EXCEPTIONS: AgentSim = {
  id: 'py-exceptions',
  title: 'Exceptions: unwinding the stack until someone catches',
  framework: 'Python',
  group: 'Core Python',
  module: '08',
  home: py('08'),
  level: 'Beginner',
  summary: 'An exception travels up through the call stack, running finally blocks on the way, until an except clause matches.',
  scenario: 'Parsing “12,50” as a float fails three calls deep.',
  nodes: [
    { id: 'main', label: 'main()', sub: 'try / except', x: 120, y: 80, kind: 'agent' },
    { id: 'load', label: 'load_order()', sub: 'try / finally', x: 330, y: 170, kind: 'agent' },
    { id: 'parse', label: 'parse_price()', sub: 'no handler', x: 540, y: 260, kind: 'agent' },
    { id: 'float', label: 'float("12,50")', x: 720, y: 350, kind: 'tool' },
    { id: 'out', label: 'stdout', x: 120, y: 330, kind: 'service' },
  ],
  edges: [
    { id: 'm-l', from: 'main', to: 'load', bend: -20 },
    { id: 'l-p', from: 'load', to: 'parse', bend: -20 },
    { id: 'p-f', from: 'parse', to: 'float', bend: -20 },
    { id: 'f-p', from: 'float', to: 'parse', bend: -20 },
    { id: 'p-l', from: 'parse', to: 'load', bend: -20 },
    { id: 'l-m', from: 'load', to: 'main', bend: -20 },
    { id: 'l-o', from: 'load', to: 'out' },
    { id: 'm-o', from: 'main', to: 'out' },
  ],
  code: `def parse_price(text):
    return float(text)                  # raises ValueError

def load_order(row):
    try:
        price = parse_price(row["price"])
    finally:
        print("close row")              # always runs
    return price

def main():
    try:
        load_order({"price": "12,50"})
    except ValueError as e:
        print("bad price:", e)

main()`,
  steps: [
    {
      title: 'Calls go down the stack',
      edge: 'm-l',
      packet: 'row',
      narration: 'main → load_order → parse_price → float. Four frames are active.',
      state: { stack: ['main', 'load_order'], exception: '—', output: [] },
      log: 'main → load_order',
      hl: ['main()', 'load_order({"price": "12,50"})'],
    },
    {
      title: 'parse_price',
      edge: 'l-p',
      packet: '"12,50"',
      state: { stack: ['main', 'load_order', 'parse_price'], exception: '—', output: [] },
      changed: ['stack'],
      narration: 'load_order is inside a try block with a finally.',
      log: 'load_order → parse_price',
      hl: ['price = parse_price(row["price"])'],
    },
    {
      title: 'float() raises',
      edge: 'p-f',
      packet: 'float("12,50")',
      node: 'float',
      tone: 'bad',
      narration: 'A comma is not a valid decimal point for float(), so ValueError is raised.',
      state: { stack: ['main', 'load_order', 'parse_price', 'float'], exception: 'ValueError: could not convert string to float: \'12,50\'', output: [] },
      changed: ['stack', 'exception'],
      log: 'raise ValueError',
      hl: ['return float(text)'],
    },
    {
      title: 'No handler in parse_price',
      edge: 'f-p',
      packet: 'ValueError',
      node: 'parse',
      tone: 'bad',
      narration: 'parse_price has no try, so its frame is abandoned and the exception moves up.',
      state: { stack: ['main', 'load_order', 'parse_price'], exception: 'ValueError (unwinding)', output: [] },
      changed: ['stack', 'exception'],
      log: 'unwind parse_price',
      predict: {
        question: 'load_order has try/finally but no except. What happens there?',
        options: ['It catches the ValueError', 'finally runs, then the exception keeps going up', 'finally is skipped', 'return price runs with price = None'],
        answer: 1,
        explain: 'finally always runs, but without an except the exception is re-raised after it.',
      },
    },
    {
      title: 'finally runs',
      edge: 'l-o',
      packet: 'close row',
      node: 'out',
      tone: 'warn',
      narration: 'load_order\'s finally prints "close row". return price never runs.',
      state: { stack: ['main', 'load_order'], exception: 'ValueError (unwinding)', output: ['close row'] },
      changed: ['stack', 'output'],
      log: 'finally: close row',
      hl: ['finally:', 'print("close row")'],
    },
    {
      title: 'Up to main',
      edge: 'l-m',
      packet: 'ValueError',
      node: 'main',
      narration: 'The exception leaves load_order and reaches main, whose except ValueError matches.',
      state: { stack: ['main'], exception: 'ValueError (caught by main)', output: ['close row'] },
      changed: ['stack', 'exception'],
      log: 'main: except ValueError matches',
      hl: ['except ValueError as e:'],
    },
    {
      title: 'Handled',
      edge: 'm-o',
      packet: 'bad price: …',
      node: 'out',
      tone: 'ok',
      narration: 'Catch exceptions where you can actually do something about them — here, at the top where you can report the bad row. Catching too low hides bugs.',
      state: { stack: ['main'], exception: 'handled', output: ['close row', 'bad price: could not convert string to float: \'12,50\''] },
      changed: ['exception', 'output'],
      log: 'stdout: bad price: …',
      hl: ['print("bad price:", e)'],
    },
  ],
  match: /exception|error handling|try|finally|raise|traceback|errors/i,
  takeaways: ['Exceptions unwind frames until an except matches.', 'finally always runs on the way out.', 'Catch where you can handle the error.'],
}

/* ================================================================ asyncio event loop */

const EVENT_LOOP: AgentSim = {
  id: 'py-event-loop',
  title: 'asyncio event loop: two tasks, one thread',
  framework: 'asyncio',
  group: 'Concurrency',
  module: '07',
  home: py('07'),
  level: 'Intermediate',
  summary: 'await hands control back to the event loop. Two coroutines sleeping 2 s and 1 s finish in about 2 s total, on a single thread.',
  scenario: 'gather() two fake downloads: A takes 2 s, B takes 1 s.',
  nodes: [
    { id: 'A', label: 'Task A', sub: 'fetch("A", 2)', x: 130, y: 80, kind: 'agent' },
    { id: 'B', label: 'Task B', sub: 'fetch("B", 1)', x: 130, y: 320, kind: 'agent' },
    { id: 'loop', label: 'Event loop', sub: 'ready queue', x: 420, y: 200, kind: 'router' },
    { id: 'timers', label: 'Timers / selector', sub: 'OS waits', x: 700, y: 200, kind: 'tool' },
    { id: 'out', label: 'stdout', x: 700, y: 60, kind: 'service' },
  ],
  edges: [
    { id: 'l-A', from: 'loop', to: 'A', bend: -15 },
    { id: 'A-l', from: 'A', to: 'loop', bend: -15 },
    { id: 'l-B', from: 'loop', to: 'B', bend: -15 },
    { id: 'B-l', from: 'B', to: 'loop', bend: -15 },
    { id: 'l-t', from: 'loop', to: 'timers', bend: -20 },
    { id: 't-l', from: 'timers', to: 'loop', bend: -20 },
    { id: 'l-o', from: 'loop', to: 'out' },
  ],
  code: `async def fetch(name, delay):
    print(f"{name} start")
    await asyncio.sleep(delay)          # gives control back to the loop
    print(f"{name} done")
    return name

async def main():
    results = await asyncio.gather(fetch("A", 2), fetch("B", 1))
    print(results)

asyncio.run(main())`,
  steps: [
    {
      title: 'gather schedules two tasks',
      node: 'loop',
      narration: 'asyncio.run starts the loop; gather wraps both coroutines in Tasks and puts them in the ready queue. Nothing runs in parallel — one thread runs one task at a time.',
      state: { time: '0.0 s', ready: ['A', 'B'], waiting: [], output: [] },
      changed: ['ready'],
      log: 'gather: Task A, Task B scheduled',
      hl: ['asyncio.run(main())', 'results = await asyncio.gather'],
    },
    {
      title: 'Run A until its first await',
      edge: 'l-A',
      packet: 'run A',
      narration: 'A prints "A start" and reaches await asyncio.sleep(2).',
      state: { time: '0.0 s', ready: ['B'], waiting: [], output: ['A start'] },
      changed: ['ready', 'output'],
      log: 'A: start',
      hl: ['print(f"{name} start")'],
    },
    {
      title: 'A awaits → yields to the loop',
      edge: 'A-l',
      packet: 'sleep(2)',
      node: 'loop',
      narration: 'await suspends A and returns control to the loop, which registers a timer for t = 2 s.',
      state: { time: '0.0 s', ready: ['B'], waiting: ['A until 2.0 s'], output: ['A start'] },
      changed: ['waiting'],
      log: 'A suspended until t=2',
      hl: ['await asyncio.sleep(delay)'],
      predict: {
        question: 'A is waiting. What does the loop do now?',
        options: ['Block for 2 seconds', 'Run task B, which is ready', 'Start a new thread for B', 'Cancel A'],
        answer: 1,
        explain: 'While A waits, the single thread is free, so the loop runs the next ready task.',
      },
    },
    {
      title: 'Run B until its await',
      edge: 'l-B',
      packet: 'run B',
      narration: 'B prints "B start" and awaits sleep(1).',
      state: { time: '0.0 s', ready: [], waiting: ['A until 2.0 s', 'B until 1.0 s'], output: ['A start', 'B start'] },
      changed: ['ready', 'waiting', 'output'],
      log: 'B: start, suspended until t=1',
    },
    {
      title: 'Nothing ready → wait on timers',
      edge: 'l-t',
      packet: 'next deadline 1.0 s',
      node: 'timers',
      narration: 'With no ready tasks, the loop sleeps in the OS selector until the earliest deadline.',
      log: 'loop idle until t=1',
    },
    {
      title: 't = 1 s: B wakes',
      edge: 't-l',
      packet: 'B ready',
      node: 'loop',
      state: { time: '1.0 s', ready: ['B'], waiting: ['A until 2.0 s'], output: ['A start', 'B start'] },
      changed: ['time', 'ready', 'waiting'],
      narration: 'B\'s timer fires and B goes back to the ready queue.',
      log: 't=1: B ready',
    },
    {
      title: 'B finishes first',
      edge: 'l-B',
      packet: 'resume B',
      node: 'B',
      state: { time: '1.0 s', ready: [], waiting: ['A until 2.0 s'], output: ['A start', 'B start', 'B done'] },
      changed: ['ready', 'output'],
      narration: 'B resumes after its await, prints "B done" and returns "B".',
      log: 'B: done',
      hl: ['print(f"{name} done")', 'return name'],
    },
    {
      title: 't = 2 s: A finishes',
      edge: 'l-A',
      packet: 'resume A',
      node: 'A',
      state: { time: '2.0 s', ready: [], waiting: [], output: ['A start', 'B start', 'B done', 'A done'] },
      changed: ['time', 'waiting', 'output'],
      narration: 'A wakes at 2 s and finishes.',
      log: 't=2: A done',
    },
    {
      title: 'gather returns',
      edge: 'l-o',
      packet: "['A', 'B']",
      node: 'out',
      tone: 'ok',
      narration: 'Total ≈ 2 s, not 3 s. Results come back in argument order (A, B), not completion order. One blocking call like time.sleep(2) instead of await would freeze every task.',
      state: { time: '2.0 s', ready: [], waiting: [], output: ['A start', 'B start', 'B done', 'A done', "['A', 'B']"] },
      changed: ['output'],
      log: "stdout: ['A', 'B']",
      hl: ['print(results)'],
    },
  ],
  match: /asyncio|async|await|coroutine|event loop|gather|semaphore|run_in_executor|cancel|task group/i,
  takeaways: ['await yields control to the event loop.', 'I/O waits overlap; total time ≈ the longest wait.', 'gather keeps argument order; never block the loop.'],
}

/* ================================================================ GIL */

const GIL: AgentSim = {
  id: 'py-gil',
  title: 'The GIL: threads for I/O, processes for CPU',
  framework: 'threading',
  group: 'Concurrency',
  module: '07',
  home: py('07'),
  level: 'Intermediate',
  summary: 'Only one thread runs Python bytecode at a time. CPU-bound threads take turns; I/O-bound threads release the GIL while waiting.',
  scenario: 'Two threads doing CPU work, then two threads doing network calls.',
  nodes: [
    { id: 't1', label: 'Thread 1', x: 130, y: 90, kind: 'agent' },
    { id: 't2', label: 'Thread 2', x: 130, y: 310, kind: 'agent' },
    { id: 'gil', label: 'GIL', sub: 'one holder', x: 420, y: 200, kind: 'guard' },
    { id: 'cpu', label: 'CPU core', sub: 'bytecode', x: 700, y: 90, kind: 'tool' },
    { id: 'net', label: 'Network', sub: 'socket wait', x: 700, y: 310, kind: 'service' },
  ],
  edges: [
    { id: '1-g', from: 't1', to: 'gil', bend: -15 },
    { id: 'g-1', from: 'gil', to: 't1', bend: -15 },
    { id: '2-g', from: 't2', to: 'gil', bend: -15 },
    { id: 'g-2', from: 'gil', to: 't2', bend: -15 },
    { id: 'g-c', from: 'gil', to: 'cpu' },
    { id: 'g-n', from: 'gil', to: 'net' },
  ],
  code: `def cpu_work():            # pure-Python loop: needs the GIL the whole time
    return sum(i * i for i in range(10_000_000))

def io_work():             # waiting on a socket: GIL released during the wait
    return requests.get("https://api.example.com/slow").status_code

with ThreadPoolExecutor(max_workers=2) as ex:     # CPU: ~no speed-up
    list(ex.map(lambda _: cpu_work(), range(2)))
with ThreadPoolExecutor(max_workers=2) as ex:     # I/O: ~2x faster
    list(ex.map(lambda _: io_work(), range(2)))
with ProcessPoolExecutor(max_workers=2) as ex:    # CPU: ~2x faster (one GIL per process)
    list(ex.map(cpu_work_task, range(2)))`,
  steps: [
    {
      title: 'Thread 1 acquires the GIL',
      edge: '1-g',
      packet: 'acquire',
      narration: 'CPython\'s Global Interpreter Lock protects interpreter state. A thread must hold it to execute Python bytecode.',
      state: { holder: 'Thread 1', 'Thread 1': 'running cpu_work', 'Thread 2': 'waiting for GIL', 'wall time': '0 ms' },
      changed: ['holder'],
      log: 'T1 acquires GIL',
      hl: ['def cpu_work()'],
    },
    {
      title: 'Thread 1 computes',
      edge: 'g-c',
      packet: 'bytecode',
      node: 'cpu',
      narration: 'Thread 2 is ready but cannot run Python code while T1 holds the GIL.',
      log: 'T1 running on CPU',
    },
    {
      title: 'Forced switch every ~5 ms',
      edge: 'g-2',
      packet: 'switch interval',
      node: 't2',
      narration: 'After sys.getswitchinterval() (5 ms) T1 is asked to drop the GIL and T2 gets a turn. They alternate — they never compute at the same moment.',
      state: { holder: 'Thread 2', 'Thread 1': 'waiting for GIL', 'Thread 2': 'running cpu_work', 'wall time': '5 ms' },
      changed: ['holder', 'Thread 1', 'Thread 2', 'wall time'],
      log: 'switch → T2',
      hl: ['with ThreadPoolExecutor(max_workers=2) as ex:     # CPU'],
      predict: {
        question: 'Two CPU-bound threads each need 1 s of work. Roughly how long does it take with threads?',
        options: ['0.5 s', '1 s', '≈2 s — they take turns', '4 s'],
        answer: 2,
        explain: 'With the GIL only one runs bytecode at a time, so CPU-bound work does not speed up (plus some switching overhead).',
      },
    },
    {
      title: 'CPU-bound result: no speed-up',
      node: 'gil',
      tone: 'warn',
      narration: 'Total ≈ 2 s. For CPU-bound pure Python use processes (each has its own interpreter and GIL), or C extensions like NumPy that release the GIL. Python 3.13+ also has an optional free-threaded build.',
      state: { holder: '—', 'Thread 1': 'done', 'Thread 2': 'done', 'wall time': '≈ 2.0 s' },
      changed: ['holder', 'Thread 1', 'Thread 2', 'wall time'],
      log: 'CPU threads: ≈2.0 s',
      hl: ['with ProcessPoolExecutor'],
    },
    {
      title: 'I/O: Thread 1 sends a request',
      edge: 'g-n',
      packet: 'socket recv',
      node: 'net',
      narration: 'Now the I/O version. T1 starts a network call; blocking I/O functions release the GIL while they wait.',
      state: { holder: '— (released)', 'Thread 1': 'waiting on socket', 'Thread 2': 'ready', 'wall time': '0 ms' },
      changed: ['holder', 'Thread 1', 'Thread 2', 'wall time'],
      log: 'T1 waits on network, GIL released',
      hl: ['def io_work()', 'requests.get'],
    },
    {
      title: 'Thread 2 runs during the wait',
      edge: 'g-2',
      packet: 'acquire',
      node: 't2',
      tone: 'ok',
      narration: 'T2 grabs the free GIL and sends its own request. Both waits now overlap.',
      state: { holder: 'Thread 2 (briefly)', 'Thread 1': 'waiting on socket', 'Thread 2': 'waiting on socket', 'wall time': '1 ms' },
      changed: ['holder', 'Thread 2', 'wall time'],
      log: 'T2 sends request; both waiting',
    },
    {
      title: 'I/O-bound result: ~2× faster',
      edge: 'g-1',
      packet: 'responses',
      node: 't1',
      tone: 'ok',
      narration: 'Two 1-second requests finish in ≈1 s. Rule of thumb: threads (or asyncio) for I/O-bound work, processes for CPU-bound work.',
      state: { holder: '—', 'Thread 1': 'done', 'Thread 2': 'done', 'wall time': '≈ 1.0 s' },
      changed: ['holder', 'Thread 1', 'Thread 2', 'wall time'],
      log: 'I/O threads: ≈1.0 s',
      hl: ['with ThreadPoolExecutor(max_workers=2) as ex:     # I/O'],
    },
  ],
  match: /\bgil\b|thread|cpu-bound|i\/o-bound|multiprocessing|process vs thread|threadpool|processpool/i,
  takeaways: ['One thread runs Python bytecode at a time.', 'Blocking I/O releases the GIL, so I/O threads overlap.', 'Use processes for CPU-bound pure Python.'],
}

/* ================================================================ race condition */

const RACE: AgentSim = {
  id: 'py-race',
  title: 'Race condition: a lost update, then the lock fix',
  framework: 'threading',
  group: 'Concurrency',
  module: '07',
  home: py('07'),
  level: 'Intermediate',
  summary: 'counter += 1 is read-modify-write. If a thread switch lands between the read and the write, one increment disappears.',
  scenario: 'Two threads each increment a shared counter once. Expected result: 2.',
  nodes: [
    { id: 'A', label: 'Thread A', x: 130, y: 90, kind: 'agent' },
    { id: 'B', label: 'Thread B', x: 130, y: 310, kind: 'agent' },
    { id: 'mem', label: 'counter', sub: 'shared memory', x: 450, y: 200, kind: 'memory' },
    { id: 'lock', label: 'Lock', sub: 'one owner', x: 710, y: 200, kind: 'guard' },
  ],
  edges: [
    { id: 'A-m', from: 'A', to: 'mem', bend: -15 },
    { id: 'm-A', from: 'mem', to: 'A', bend: -15 },
    { id: 'B-m', from: 'B', to: 'mem', bend: -15 },
    { id: 'm-B', from: 'mem', to: 'B', bend: -15 },
    { id: 'A-l', from: 'A', to: 'lock', bend: -60 },
    { id: 'B-l', from: 'B', to: 'lock', bend: 60 },
  ],
  code: `counter = 0
lock = threading.Lock()

def unsafe_increment():
    global counter
    value = counter        # 1. read
    value += 1             # 2. modify
    counter = value        # 3. write

def safe_increment():
    global counter
    with lock:             # only one thread inside at a time
        counter += 1`,
  steps: [
    {
      title: 'A reads 0',
      edge: 'm-A',
      packet: 'read 0',
      node: 'A',
      narration: 'Thread A copies the current value into its local variable.',
      state: { counter: '0', 'A.value': '0', 'B.value': '—', 'lock owner': '—' },
      changed: ['A.value'],
      log: 'A: value = counter (0)',
      hl: ['def unsafe_increment', 'value = counter'],
    },
    {
      title: 'Thread switch!',
      edge: 'm-B',
      packet: 'read 0',
      node: 'B',
      tone: 'warn',
      narration: 'The OS/GIL switches to B before A writes. B also reads 0. Even `counter += 1` is several bytecodes, so this can happen with it too.',
      state: { counter: '0', 'A.value': '0', 'B.value': '0', 'lock owner': '—' },
      changed: ['B.value'],
      log: 'switch → B: value = counter (0)',
      predict: {
        question: 'Both threads read 0. After both finish, what is counter?',
        options: ['2', '1 — one update is lost', '0', 'It raises an error'],
        answer: 1,
        explain: 'Both compute 0 + 1 = 1 and write 1. The second write overwrites the first.',
      },
    },
    {
      title: 'B writes 1',
      edge: 'B-m',
      packet: 'write 1',
      node: 'mem',
      state: { counter: '1', 'A.value': '0', 'B.value': '1', 'lock owner': '—' },
      changed: ['counter', 'B.value'],
      narration: 'B finishes its increment.',
      log: 'B: counter = 1',
      hl: ['value += 1', 'counter = value'],
    },
    {
      title: 'A writes 1 — update lost',
      edge: 'A-m',
      packet: 'write 1',
      node: 'mem',
      tone: 'bad',
      narration: 'A resumes with its stale local value 0 + 1 = 1 and overwrites. Two increments, counter = 1. Bugs like this appear rarely and under load.',
      state: { counter: '1  ✗ expected 2', 'A.value': '1', 'B.value': '1', 'lock owner': '—' },
      changed: ['counter', 'A.value'],
      log: 'A: counter = 1 (lost update)',
    },
    {
      title: 'Fix: A takes the lock',
      edge: 'A-l',
      packet: 'acquire',
      node: 'lock',
      narration: 'Reset to 0 and use safe_increment. A acquires the lock before reading.',
      state: { counter: '0', 'A.value': '—', 'B.value': '—', 'lock owner': 'A' },
      changed: ['counter', 'lock owner'],
      log: 'A acquires lock',
      hl: ['def safe_increment', 'with lock:'],
    },
    {
      title: 'B must wait',
      edge: 'B-l',
      packet: 'acquire (blocked)',
      node: 'lock',
      tone: 'warn',
      narration: 'Even if the scheduler switches to B now, B blocks on the lock and cannot enter the critical section.',
      log: 'B blocked on lock',
    },
    {
      title: 'A increments and releases',
      edge: 'A-m',
      packet: 'counter = 1',
      node: 'mem',
      state: { counter: '1', 'A.value': '—', 'B.value': '—', 'lock owner': 'B (after A released)' },
      changed: ['counter', 'lock owner'],
      narration: 'Leaving the with block releases the lock (even if an exception happens).',
      log: 'A: counter = 1, release',
      hl: ['counter += 1'],
    },
    {
      title: 'B increments → 2',
      edge: 'B-m',
      packet: 'counter = 2',
      node: 'mem',
      tone: 'ok',
      narration: 'B reads the up-to-date value. Correct result. Keep critical sections tiny, and always acquire multiple locks in the same order to avoid deadlocks.',
      state: { counter: '2  ✓', 'A.value': '—', 'B.value': '—', 'lock owner': '—' },
      changed: ['counter', 'lock owner'],
      log: 'B: counter = 2',
    },
  ],
  match: /race condition|lock|thread safety|synchroni[sz]ation|mutex|deadlock/i,
  takeaways: ['Read-modify-write on shared data is not atomic.', 'Protect it with a Lock (with lock: …).', 'Keep critical sections small; order locks consistently.'],
}

/* ================================================================ dict hashing */

const DICT: AgentSim = {
  id: 'py-dict-hash',
  title: 'How a dict finds a key: hashing and collisions',
  framework: 'Python',
  group: 'Core Python',
  module: '02',
  home: py('02'),
  level: 'Intermediate',
  summary: 'A key\'s hash picks a slot; on a collision Python probes another slot; lookups compare hash then equality. Unhashable keys are rejected.',
  scenario: 'Insert "apple" and "kiwi" into an 8-slot table, look up "kiwi", then try a list as a key. (Slot numbers are illustrative — string hashes are randomized per process.)',
  nodes: [
    { id: 'key', label: 'key', x: 100, y: 200, kind: 'user' },
    { id: 'hash', label: 'hash(key)', sub: '% table size', x: 300, y: 200, kind: 'tool' },
    { id: 's3', label: 'slot 3', x: 540, y: 90, kind: 'memory' },
    { id: 's6', label: 'slot 6', x: 540, y: 310, kind: 'memory' },
    { id: 'out', label: 'result', x: 730, y: 200, kind: 'end' },
  ],
  edges: [
    { id: 'k-h', from: 'key', to: 'hash' },
    { id: 'h-3', from: 'hash', to: 's3' },
    { id: '3-6', from: 's3', to: 's6' },
    { id: 'h-6', from: 'hash', to: 's6' },
    { id: '6-o', from: 's6', to: 'out' },
    { id: 'h-o', from: 'hash', to: 'out', bend: 70 },
  ],
  code: `d = {}
d["apple"] = 1      # hash("apple") % 8 → slot 3
d["kiwi"] = 2       # hash("kiwi")  % 8 → slot 3 too: collision → probe → slot 6
print(d["kiwi"])    # slot 3: hash differs → probe → slot 6: hash and key match → 2
d[[1, 2]] = 3       # TypeError: unhashable type: 'list'`,
  steps: [
    {
      title: 'Hash "apple"',
      edge: 'k-h',
      packet: '"apple"',
      narration: 'hash() turns the key into a large integer; the low bits choose a slot in the table.',
      state: { 'slot 3': 'empty', 'slot 6': 'empty', len: '0' },
      log: 'hash("apple") → slot 3',
      hl: ['d["apple"] = 1'],
    },
    {
      title: 'Store in slot 3',
      edge: 'h-3',
      packet: 'slot 3',
      node: 's3',
      narration: 'The slot stores (hash, key, value). Insert is O(1) on average.',
      state: { 'slot 3': '(h₁, "apple", 1)', 'slot 6': 'empty', len: '1' },
      changed: ['slot 3', 'len'],
      log: 'slot 3 ← apple',
    },
    {
      title: '"kiwi" collides',
      edge: 'h-3',
      packet: '"kiwi" → slot 3',
      node: 's3',
      tone: 'warn',
      narration: 'kiwi\'s hash also maps to slot 3, which is taken.',
      log: 'hash("kiwi") → slot 3 (occupied)',
      hl: ['d["kiwi"] = 2'],
      predict: {
        question: 'Slot 3 is taken by "apple". What does Python do?',
        options: ['Overwrite apple', 'Raise KeyError', 'Probe another slot in a pseudo-random sequence', 'Store a linked list in slot 3'],
        answer: 2,
        explain: 'CPython uses open addressing: it probes other slots (using a perturbed sequence) until it finds an empty one.',
      },
    },
    {
      title: 'Probe → slot 6',
      edge: '3-6',
      packet: 'probe',
      node: 's6',
      narration: 'The next probed slot is free, so kiwi goes there.',
      state: { 'slot 3': '(h₁, "apple", 1)', 'slot 6': '(h₂, "kiwi", 2)', len: '2' },
      changed: ['slot 6', 'len'],
      log: 'slot 6 ← kiwi',
    },
    {
      title: 'Lookup "kiwi"',
      edge: 'h-6',
      packet: 'probe sequence',
      node: 's6',
      narration: 'Lookup follows the same path: slot 3 has a different hash → skip; slot 6 has the same hash and key == "kiwi" → found. Comparing hashes first keeps it fast.',
      log: 'lookup kiwi: slot 3 ✗, slot 6 ✓',
      hl: ['print(d["kiwi"])'],
    },
    {
      title: 'Return 2',
      edge: '6-o',
      packet: '2',
      node: 'out',
      tone: 'ok',
      narration: 'The table resizes when it is about 2/3 full, so probe chains stay short.',
      log: 'stdout: 2',
    },
    {
      title: 'A list as key → TypeError',
      edge: 'h-o',
      packet: 'hash([1, 2])',
      node: 'out',
      tone: 'bad',
      narration: 'Lists are mutable and unhashable: if a key could change after insertion, its hash would point to the wrong slot. Use a tuple (1, 2) instead.',
      log: "TypeError: unhashable type: 'list'",
      hl: ['d[[1, 2]] = 3'],
    },
  ],
  match: /dict|hash|set\b|sets|hashable|collections/i,
  takeaways: ['hash(key) chooses the slot; equality confirms the match.', 'Collisions are resolved by probing other slots.', 'Keys must be hashable (immutable): tuple yes, list no.'],
}

/* ================================================================ MRO */

const MRO: AgentSim = {
  id: 'py-mro',
  title: 'Multiple inheritance: super() follows the MRO',
  framework: 'Python',
  group: 'Core Python',
  module: '04',
  home: py('04'),
  level: 'Advanced',
  summary: 'super() does not mean “my parent” — it means “the next class in the instance\'s MRO”. That is why Logged.save() calls Validated.save().',
  scenario: 'class Order(Logged, Validated), where both mixins extend Base and call super().save().',
  nodes: [
    { id: 'order', label: 'Order', sub: 'no save()', x: 420, y: 50, kind: 'agent' },
    { id: 'logged', label: 'Logged', sub: 'save → log', x: 220, y: 190, kind: 'agent' },
    { id: 'valid', label: 'Validated', sub: 'save → check', x: 620, y: 190, kind: 'agent' },
    { id: 'base', label: 'Base', sub: 'save', x: 420, y: 330, kind: 'agent' },
    { id: 'out', label: 'stdout', x: 120, y: 340, kind: 'service' },
  ],
  edges: [
    { id: 'o-l', from: 'order', to: 'logged' },
    { id: 'l-v', from: 'logged', to: 'valid' },
    { id: 'v-b', from: 'valid', to: 'base' },
    { id: 'l-o', from: 'logged', to: 'out' },
    { id: 'b-o', from: 'base', to: 'out' },
  ],
  code: `class Base:
    def save(self):
        print("Base.save")

class Logged(Base):
    def save(self):
        print("Logged.save → log")
        super().save()

class Validated(Base):
    def save(self):
        print("Validated.save → check")
        super().save()

class Order(Logged, Validated):
    pass

Order().save()
print([c.__name__ for c in Order.__mro__])
# ['Order', 'Logged', 'Validated', 'Base', 'object']`,
  steps: [
    {
      title: 'Compute the MRO',
      node: 'order',
      narration: 'Python linearizes the class hierarchy with the C3 algorithm: Order, Logged, Validated, Base, object. Every attribute lookup follows this list.',
      state: { MRO: ['Order', 'Logged', 'Validated', 'Base', 'object'], 'current class': 'Order', output: [] },
      changed: ['MRO'],
      log: 'Order.__mro__ computed',
      hl: ['class Order(Logged, Validated):', "# ['Order', 'Logged', 'Validated', 'Base', 'object']"],
    },
    {
      title: 'Order has no save → Logged',
      edge: 'o-l',
      packet: 'lookup save',
      node: 'logged',
      narration: 'Order().save() searches the MRO; the first class defining save is Logged.',
      state: { MRO: ['Order', 'Logged', 'Validated', 'Base', 'object'], 'current class': 'Logged', output: ['Logged.save → log'] },
      changed: ['current class', 'output'],
      log: 'Logged.save runs',
      hl: ['Order().save()', 'print("Logged.save → log")'],
      predict: {
        question: 'Logged.save calls super().save(). Which class runs next?',
        options: ['Base — Logged\'s parent', 'Validated — next in Order\'s MRO', 'Order', 'object'],
        answer: 1,
        explain: 'super() uses the MRO of the instance (an Order), and the class after Logged in that list is Validated.',
      },
    },
    {
      title: 'super() → Validated',
      edge: 'l-v',
      packet: 'super().save()',
      node: 'valid',
      narration: 'Surprise for many: Logged\'s super() reaches its sibling Validated, not Base. This is what lets mixins cooperate.',
      state: { MRO: ['Order', 'Logged', 'Validated', 'Base', 'object'], 'current class': 'Validated', output: ['Logged.save → log', 'Validated.save → check'] },
      changed: ['current class', 'output'],
      log: 'Validated.save runs',
      hl: ['print("Validated.save → check")'],
    },
    {
      title: 'super() → Base',
      edge: 'v-b',
      packet: 'super().save()',
      node: 'base',
      tone: 'ok',
      narration: 'Next in the MRO is Base. Base.save runs exactly once — the diamond problem is solved.',
      state: { MRO: ['Order', 'Logged', 'Validated', 'Base', 'object'], 'current class': 'Base', output: ['Logged.save → log', 'Validated.save → check', 'Base.save'] },
      changed: ['current class', 'output'],
      log: 'Base.save runs once',
      hl: ['print("Base.save")'],
    },
    {
      title: 'Output',
      edge: 'b-o',
      packet: '3 lines',
      node: 'out',
      narration: 'If any class in the chain forgot to call super(), the chain would stop there. Cooperative classes should all call super() and accept **kwargs.',
      log: 'stdout: Logged → Validated → Base',
      hl: ['print([c.__name__ for c in Order.__mro__])'],
    },
  ],
  match: /inheritance|mro|super\(|mixin|polymorphism|oop|class(es)?\b|design patterns/i,
  takeaways: ['Attribute lookup follows __mro__ (C3 linearization).', 'super() means “next in the MRO”, not “parent”.', 'Cooperative classes all call super().'],
}

export const PYTHON_SIMS: AgentSim[] = [CALL_STACK, REFERENCES, DICT, GENERATOR, DECORATOR, CONTEXT, EXCEPTIONS, MRO, EVENT_LOOP, GIL, RACE]
