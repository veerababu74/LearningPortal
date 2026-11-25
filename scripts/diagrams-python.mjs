/**
 * Curated Mermaid diagrams for the Python track. Placed on the first Learn lesson (in course
 * order) whose title matches `where.topic`, next to the section matching `where.section`.
 * Validated by scripts/validate-diagrams.mjs.
 */
export const PYTHON_DIAGRAMS = [
  /* ---------------------------------------------------------- fundamentals */
  {
    id: 'names-objects',
    where: { module: '01', topic: /variables|data types|names|memory model/i, section: /variable|reference|identity|object|assign/i, fallbackFirst: true },
    title: 'Names point to objects',
    mermaid: `
flowchart LR
  a["name a"] --> L[("list object [1, 2, 3] — id 0x7f…")]
  b["name b = a"] --> L
  L -.-> m["b.append(4) mutates the one shared object — a sees it too"]
  c["name c = a.copy()"] --> L2[("new list object [1, 2, 3]")]`,
    explain: `Assignment never copies: it binds a **name** to an **object**. After \`b = a\` both names refer to the same list, so a mutation through either name is visible through both; \`is\` compares identity (same object), \`==\` compares values. Make a copy explicitly when you need an independent object.`,
  },
  {
    id: 'mutable-immutable',
    where: { module: '01', topic: /mutab|data types|variables/i, section: /mutab/i, fallbackFirst: true },
    title: 'Rebinding an immutable vs mutating a mutable',
    mermaid: `
flowchart TB
  subgraph I["Immutable: x = 5; x += 1"]
    x1["x"] -.->|"before"| o5(("int 5"))
    x1 -->|"after: rebound"| o6(("new int 6"))
  end
  subgraph M["Mutable: items = []; items.append(1)"]
    i1["items"] --> lst[("same list, now [1]")]
  end`,
    explain: `Ints, strings, tuples and frozensets cannot change, so "modifying" one creates a new object and rebinds the name. Lists, dicts and sets change in place. This is why a mutable default argument is shared across calls and why tuples can be dict keys but lists cannot.`,
  },
  {
    id: 'string-immutability',
    where: { module: '01', topic: /string/i, section: /concat|immutab|join|creation|basics/i, fallbackFirst: true },
    title: 'Why "".join() beats += in a loop',
    mermaid: `
flowchart LR
  subgraph P["s += piece in a loop"]
    s1["'a'"] --> s2["new 'ab'"] --> s3["new 'abc'"] --> s4["new 'abcd' … each step copies everything"]
  end
  subgraph J["''.join(pieces)"]
    parts["['a','b','c','d']"] --> one["measure total size once, copy once → 'abcd'"]
  end`,
    explain: `Strings are immutable, so \`+=\` builds a brand-new string each time and copies all previous characters — quadratic work in a loop. \`''.join(list)\` computes the final size once and copies each piece once. (CPython sometimes optimises \`+=\` in place, but do not rely on it.)`,
  },
  {
    id: 'memory-refcount',
    where: { topic: /memory|garbage|reference count/i, section: /reference count|garbage|gc|memory/i, fallbackFirst: true },
    title: 'Reference counting plus the cyclic garbage collector',
    mermaid: `
flowchart TD
  new["object created — refcount 1"] --> inc["new reference: assign, append, pass as argument — refcount +1"]
  inc --> dec["reference removed: del, rebind, scope ends — refcount −1"]
  dec --> z{"refcount == 0?"}
  z -->|yes| free["freed immediately"]
  z -->|"no, but unreachable cycle"| gc["cyclic GC — generations 0, 1, 2 — finds and frees cycles"]`,
    explain: `CPython frees most objects the moment their reference count drops to zero, which makes memory use predictable. Objects that reference each other in a cycle never reach zero, so a separate **generational garbage collector** periodically finds unreachable cycles; \`gc.collect()\` triggers it manually and \`weakref\` avoids creating cycles in caches and observers.`,
  },
  {
    id: 'control-flow',
    where: { module: '01', topic: /operators|control flow|loops/i, section: /loop|control|for|while/i, fallbackFirst: true },
    title: 'for / while with break, continue and else',
    mermaid: `
flowchart TD
  start["for item in iterable"] --> nxt{"next item available?"}
  nxt -->|no| els["else block — only if the loop was not broken"] --> after["after the loop"]
  nxt -->|yes| body["loop body"]
  body -->|continue| nxt
  body -->|break| after
  body -->|"end of body"| nxt`,
    explain: `\`continue\` skips to the next iteration, \`break\` leaves the loop immediately, and a loop's \`else\` block runs only when the loop ends **without** \`break\` — handy for "search and report not found" without a flag variable.`,
  },

  /* ------------------------------------------------------- data structures */
  {
    id: 'list-internals',
    where: { module: '02', topic: /lists?\b/i, section: /creat|introduction|what is|memory|basics/i, fallbackFirst: true },
    title: 'A list is a dynamic array of references',
    mermaid: `
flowchart LR
  lst["list object — size 3, capacity 4"] --> s0["slot 0"] --> o1(("int 1"))
  lst --> s1["slot 1"] --> o2(("'hi'"))
  lst --> s2["slot 2"] --> o3(("dict {...}"))
  lst --> s3["slot 3 — spare capacity"]
  ap["append(x)"] -->|"spare slot: O(1)"| s3
  ap -->|"full: allocate bigger array, copy references"| grow["amortised O(1)"]`,
    explain: `A list stores **references**, not the objects themselves, in a contiguous array with spare capacity. That makes indexing and \`append\` fast (amortised O(1)), while \`insert(0, x)\` and \`pop(0)\` must shift every element (O(n)) — use \`collections.deque\` for queues.`,
  },
  {
    id: 'dict-hash',
    where: { module: '02', topic: /dict/i, section: /hash|introduction|how|lookup|basics|what is/i, fallbackFirst: true },
    title: 'How a dict finds a key',
    mermaid: `
flowchart LR
  k["d['email']"] --> h["hash('email')"] --> idx["index = hash & (table size − 1)"]
  idx --> slot{"slot state"}
  slot -->|empty| miss["KeyError / insert here"]
  slot -->|"same hash and key == 'email'"| hit["return value — O(1) on average"]
  slot -->|"different key — collision"| probe["probe the next slot"] --> slot`,
    explain: `A dict is a hash table: the key's \`hash()\` picks a slot directly, so lookups do not scan. That is why keys must be **hashable** (immutable) and why two equal keys must have equal hashes. Since Python 3.7 dicts also preserve insertion order, thanks to the compact layout with a separate entries array.`,
  },
  {
    id: 'set-ops',
    where: { module: '02', topic: /\bsets?\b/i, section: /operation|union|intersection|introduction|basics|what is/i, fallbackFirst: true },
    title: 'Set operations',
    mermaid: `
flowchart LR
  A["A = {1, 2, 3}"] --> u["A | B → {1, 2, 3, 4}"]
  B["B = {3, 4}"] --> u
  A --> i["A & B → {3}"]
  B --> i
  A --> d["A − B → {1, 2}"]
  B --> d
  A --> x["A ^ B → {1, 2, 4}"]
  B --> x`,
    explain: `Sets are hash tables without values: membership tests are O(1) on average and duplicates are removed automatically. Union, intersection, difference and symmetric difference replace many nested loops — for example \`set(required) - set(provided)\` lists missing fields in one line.`,
  },
  {
    id: 'comprehension',
    where: { topic: /comprehension/i, section: /list comprehension|syntax|introduction|basics|what/i, fallbackFirst: true },
    title: 'A comprehension is a loop with a filter',
    mermaid: `
flowchart LR
  src["for x in numbers"] --> f{"if x % 2 == 0"}
  f -->|true| e["expression x * x"] --> out["append to the new list"]
  f -->|false| skip["skip"]
  out --> src
  skip --> src`,
    explain: `\`[x * x for x in numbers if x % 2 == 0]\` reads left to right as *expression → loop → filter* and is equivalent to a \`for\` loop that appends. Use \`()\` instead of \`[]\` to get a lazy generator expression when the result is large or only iterated once.`,
  },
  {
    id: 'recursion-stack',
    where: { topic: /recursion|recursive/i, fallbackFirst: true },
    title: 'The call stack during factorial(3)',
    mermaid: `
sequenceDiagram
  participant S as call stack
  S->>S: push factorial(3)
  S->>S: push factorial(2)
  S->>S: push factorial(1) — base case returns 1
  S-->>S: pop: factorial(2) returns 2 × 1 = 2
  S-->>S: pop: factorial(3) returns 3 × 2 = 6`,
    explain: `Each recursive call gets its own frame on the stack; the frames wait until the **base case** returns, then unwind in reverse order. Without a reachable base case you get \`RecursionError\` (default limit about 1 000 frames), and Python does not optimise tail calls — use a loop or memoisation (\`functools.cache\`) for deep or overlapping recursion.`,
  },
  {
    id: 'bst',
    where: { topic: /binary search tree|\bbst\b/i, fallbackFirst: true },
    title: 'Searching a binary search tree',
    mermaid: `
flowchart TD
  r(("50")) --> l(("30"))
  r --> rr(("70"))
  l --> ll(("20"))
  l --> lr(("40"))
  rr --> rl(("60"))
  rr --> r2(("80"))
  q["search 60: 60 > 50 go right, 60 < 70 go left, found"] -.-> rl`,
    explain: `Every node's left subtree holds smaller keys and its right subtree larger keys, so each comparison discards half of a balanced tree: O(log n) search, insert and delete. Inserting already-sorted data produces a linked-list-shaped tree with O(n) operations, which is why self-balancing trees exist.`,
  },

  /* -------------------------------------------------------------- functions */
  {
    id: 'legb',
    where: { module: '03', topic: /function|scope|closure/i, section: /scope|legb/i, fallbackFirst: true },
    title: 'Name lookup: LEGB',
    mermaid: `
flowchart LR
  n["name used inside a function"] --> L{"Local?"}
  L -->|no| E{"Enclosing function?"}
  E -->|no| G{"Global — module?"}
  G -->|no| B{"Built-in?"}
  B -->|no| err["NameError"]
  L -->|yes| use["use it"]
  E -->|yes| use
  G -->|yes| use
  B -->|yes| use`,
    explain: `Python resolves a name by searching **L**ocal, **E**nclosing, **G**lobal, then **B**uilt-in scope. Assigning to a name anywhere in a function makes it local for the whole function (hence \`UnboundLocalError\`); use \`nonlocal\` or \`global\` to rebind an outer name instead.`,
  },
  {
    id: 'args-kwargs',
    where: { topic: /args|kwargs|packing|parameters/i, fallbackFirst: true },
    title: 'How arguments bind to parameters',
    mermaid: `
flowchart LR
  call["f(1, 2, 3, mode='fast', retries=2)"] --> p["a, b ← 1, 2 — positional"]
  p --> s["*args ← (3,) — extra positionals as a tuple"]
  s --> k["mode ← 'fast' — keyword-only after *"]
  k --> kw["**kwargs ← {'retries': 2} — extra keywords as a dict"]`,
    explain: `For \`def f(a, b, *args, mode='safe', **kwargs)\` Python fills named positional parameters first, collects leftover positionals into the \`args\` tuple, matches keywords by name, and collects unknown keywords into the \`kwargs\` dict. At the call site \`*seq\` and \`**mapping\` do the reverse: they unpack into arguments.`,
  },
  {
    id: 'closure',
    where: { module: '03', topic: /closure|function/i, section: /closure/i, fallbackFirst: false },
    title: 'A closure keeps its enclosing variables alive',
    mermaid: `
flowchart LR
  outer["make_counter() runs, count = 0"] --> inner["defines increment(), which uses count"]
  inner --> ret["returns increment — outer frame ends"]
  ret --> cell[("cell holding count survives")]
  call["counter() — nonlocal count += 1"] --> cell`,
    explain: `When an inner function uses a variable from its enclosing function, Python stores that variable in a **cell** attached to the inner function (\`__closure__\`), so it survives after the outer call returns. Closures power decorators, callbacks and factories; use \`nonlocal\` to rebind the captured variable.`,
  },
  {
    id: 'lambda-map-filter',
    where: { topic: /lambda|map|filter|reduce|functional/i, fallbackFirst: true },
    title: 'map → filter → reduce pipeline',
    mermaid: `
flowchart LR
  data["[1, 2, 3, 4, 5]"] --> m["map(lambda x: x * x) → 1 4 9 16 25"]
  m --> f["filter(lambda x: x > 5) → 9 16 25"]
  f --> r["reduce(lambda acc, x: acc + x, …, 0) → 50"]`,
    explain: `\`map\` transforms every item, \`filter\` keeps items whose predicate is true, \`reduce\` folds everything into one value. \`map\` and \`filter\` are lazy iterators in Python 3; for simple cases a comprehension or \`sum()\` is usually clearer than a lambda chain.`,
  },

  /* ------------------------------------------------------------------- OOP */
  {
    id: 'object-creation',
    where: { module: '04', topic: /class|object|init|constructor/i, section: /init|construct|creat|object/i, fallbackFirst: true },
    title: 'What happens on Dog("Rex")',
    mermaid: `
flowchart LR
  call["Dog('Rex')"] --> new["Dog.__new__(Dog) — allocate the instance"]
  new --> init["Dog.__init__(self, 'Rex') — set self.name"]
  init --> obj["instance returned, its __dict__ = {'name': 'Rex'}"]`,
    explain: `Calling a class runs \`__new__\` to create the object and then \`__init__\` to initialise it; \`self\` is simply the new instance passed in automatically. You rarely override \`__new__\` — mainly for immutable types or for controlling instance creation (singletons, caching).`,
  },
  {
    id: 'attribute-lookup',
    where: { module: '04', topic: /class|instance|variables|attribute/i, section: /class variable|instance variable|attribute|class vs instance/i, fallbackFirst: true },
    title: 'Attribute lookup: obj.x',
    mermaid: `
flowchart TD
  a["obj.x"] --> d{"data descriptor on the class? e.g. property"}
  d -->|yes| dp["call its __get__"]
  d -->|no| i{"'x' in obj.__dict__?"}
  i -->|yes| iv["instance attribute"]
  i -->|no| c{"found on the class or a base, in MRO order?"}
  c -->|yes| cv["class attribute or method — bound if it is a function"]
  c -->|no| ga["__getattr__ if defined, else AttributeError"]`,
    explain: `Instance attributes shadow class attributes, which is why assigning \`obj.count = 5\` does not change \`Class.count\`. Properties win over the instance dict because they are *data descriptors*, and methods become bound methods when looked up through an instance.`,
  },
  {
    id: 'mro-diamond',
    where: { topic: /inheritance|\bmro\b|super/i, section: /mro|multiple|diamond|super/i, fallbackFirst: true },
    title: 'Diamond inheritance and the MRO',
    mermaid: `
flowchart BT
  B["class B(A)"] --> A["class A"]
  C["class C(A)"] --> A
  D["class D(B, C)"] --> B
  D --> C
  m["D.__mro__ = D → B → C → A → object"] -.-> D`,
    explain: `Python linearises the class hierarchy with the **C3 algorithm**: a class always comes before its parents, and parents keep the order you listed them in. Each class appears once, so \`A\` is visited once even in a diamond. \`super()\` means *next class in the MRO of the instance*, not *my parent*, which is what makes cooperative multiple inheritance work.`,
  },
  {
    id: 'super-chain',
    where: { module: '04', topic: /\bmro\b|method resolution|super/i, section: /super|mro|method resolution/i, fallbackFirst: true },
    title: 'Cooperative super().__init__ chain',
    mermaid: `
sequenceDiagram
  participant D as D.__init__
  participant B as B.__init__
  participant C as C.__init__
  participant A as A.__init__
  D->>B: super().__init__(**kw)
  B->>C: super().__init__(**kw) — next in D's MRO, not A
  C->>A: super().__init__(**kw)
  A-->>D: chain completes, each __init__ ran once`,
    explain: `When every class calls \`super().__init__(**kwargs)\`, each initialiser runs exactly once in MRO order. Calling \`A.__init__(self)\` directly instead breaks the chain and can run shared bases twice.`,
  },
  {
    id: 'encapsulation',
    where: { topic: /encapsulation|private|property|getter|setter/i, fallbackFirst: true },
    title: 'Public, protected, private and properties',
    mermaid: `
flowchart TD
  pub["self.balance — public"] --> any["anyone can read and write"]
  prot["self._balance — protected by convention"] --> warn["outside code should not touch it, nothing enforces that"]
  priv["self.__balance — name-mangled"] --> mang["stored as _Account__balance — avoids subclass clashes"]
  prop["@property balance + @balance.setter"] --> val["controlled access: validate on write, compute on read"]`,
    explain: `Python has no truly private attributes: a single underscore is a convention, a double underscore triggers **name mangling** to avoid accidental clashes in subclasses. To control access, expose a \`@property\` — callers keep the simple \`obj.balance\` syntax while you add validation or computation.`,
  },
  {
    id: 'polymorphism',
    where: { topic: /polymorph|duck typing/i, fallbackFirst: true },
    title: 'Polymorphism: one call, many behaviours',
    mermaid: `
flowchart LR
  loop["for shape in shapes: shape.area()"] --> c["Circle.area() → π r²"]
  loop --> s["Square.area() → side²"]
  loop --> t["Triangle.area() → ½ b h"]
  duck["Duck typing: any object with an area() method works — no common base class required"] -.-> loop`,
    explain: `The caller depends only on the **interface** (\`area()\`), and each class supplies its own implementation. Python resolves the method at runtime on the object's actual class, so new shapes can be added without changing the loop — the open/closed principle in action.`,
  },
  {
    id: 'abstraction-abc',
    where: { topic: /abstraction|abstract|\babc\b|interface|protocol/i, fallbackFirst: true },
    title: 'Abstract base classes enforce an interface',
    mermaid: `
flowchart TD
  base["class PaymentGateway(ABC) with @abstractmethod charge()"] --> s1["class Stripe(PaymentGateway) implements charge()"]
  base --> s2["class PayPal(PaymentGateway) forgets charge()"]
  s1 --> ok["Stripe() works"]
  s2 --> err["PayPal() raises TypeError: can't instantiate abstract class"]
  base --> no["PaymentGateway() also raises TypeError"]`,
    explain: `An ABC declares the methods every subclass must provide; Python refuses to instantiate a class that still has unimplemented abstract methods, so the mistake surfaces at object creation instead of deep inside a request. \`typing.Protocol\` offers the same contract structurally, without inheritance.`,
  },
  {
    id: 'composition',
    where: { topic: /composition/i, fallbackFirst: true },
    title: 'Inheritance (is-a) vs composition (has-a)',
    mermaid: `
flowchart LR
  subgraph Inh["Inheritance"]
    car1["ElectricCar"] -->|"is a"| car0["Car"]
  end
  subgraph Comp["Composition"]
    car2["Car"] -->|"has a"| eng["Engine — swappable: Petrol, Electric"]
    car2 -->|"has a"| gps["Navigation"]
  end`,
    explain: `Inherit when the subclass truly *is a* specialised parent and honours its contract (Liskov). Otherwise compose: hold collaborators as attributes and delegate to them. Composition keeps classes small and lets behaviour change at runtime, which is why "favour composition over inheritance" is the usual advice.`,
  },
  {
    id: 'solid',
    where: { topic: /solid|design principle/i, fallbackFirst: true },
    title: 'SOLID at a glance',
    mermaid: `
flowchart LR
  S["S — one reason to change"] --> O["O — extend without editing"]
  O --> L["L — subclasses honour the parent's contract"]
  L --> I["I — small, focused interfaces"]
  I --> D["D — depend on abstractions, inject concrete classes"]`,
    explain: `The five principles push toward small classes with clear responsibilities, extension through new code instead of edits, substitutable subclasses, narrow interfaces, and dependencies passed in rather than hard-coded. In Python, \`Protocol\`/ABCs and constructor injection are the usual tools.`,
  },
  {
    id: 'strategy-pattern',
    where: { topic: /design pattern|strategy|factory|observer/i, section: /strategy/i, fallbackFirst: true },
    title: 'Strategy pattern',
    mermaid: `
flowchart LR
  ctx["Checkout(pricing=strategy)"] --> iface["PricingStrategy.price(cart)"]
  iface --> r["RegularPricing"]
  iface --> s["SalePricing"]
  iface --> m["MemberPricing"]`,
    explain: `Strategy moves an interchangeable algorithm behind one interface and injects it, replacing long \`if/elif\` chains. In Python a strategy is often just a function passed as an argument.`,
  },
  {
    id: 'dunder',
    where: { topic: /magic|dunder|special method|operator overloading/i, fallbackFirst: true },
    title: 'Syntax that calls dunder methods',
    mermaid: `
flowchart LR
  a["a + b"] --> add["a.__add__(b), then b.__radd__(a) if NotImplemented"]
  l["len(x)"] --> ln["x.__len__()"]
  i["x[k]"] --> gi["x.__getitem__(k)"]
  e["a == b"] --> eq["a.__eq__(b)"]
  w["with x:"] --> en["x.__enter__() / x.__exit__()"]
  p["print(x)"] --> st["x.__str__(), falling back to __repr__"]`,
    explain: `Operators and built-ins are hooks into special methods, which is how your own classes can behave like numbers, containers or context managers. Return \`NotImplemented\` (not \`False\`) from binary operators you do not support so Python can try the reflected method on the other operand.`,
  },
  {
    id: 'metaclass',
    where: { topic: /metaclass/i, fallbackFirst: true },
    title: 'Classes are created by metaclasses',
    mermaid: `
flowchart LR
  src["class Model(Base): ..."] --> body["execute the class body into a namespace dict"]
  body --> meta["metaclass(name, bases, namespace) — type by default"]
  meta --> cls["class object Model"]
  cls --> inst["Model() — instances"]
  hook["__init_subclass__ — lighter hook for most needs"] -.-> cls`,
    explain: `Just as objects are instances of classes, classes are instances of **metaclasses** (\`type\` by default). A custom metaclass can register, validate or rewrite classes as they are defined — ORMs use this — but \`__init_subclass__\` or a class decorator covers most use cases more simply.`,
  },

  /* --------------------------------------------------------------- advanced */
  {
    id: 'decorator-flow',
    where: { topic: /decorator/i, section: /how|what|basic|introduction|syntax|understanding/i, fallbackFirst: true },
    title: 'What @decorator does',
    mermaid: `
flowchart LR
  def["@timer above def fetch(): ..."] --> same["same as fetch = timer(fetch)"]
  same --> wrap["the name fetch now points to wrapper(*args, **kwargs)"]
  call["fetch(url)"] --> wrap
  wrap --> before["code before: start the timer"] --> orig["call the original fetch(url)"] --> after["code after: log the elapsed time"] --> ret["return the result"]`,
    explain: `A decorator is a function that takes a function and returns a replacement, applied once at definition time. The wrapper runs extra code around every call. Decorate the wrapper with \`functools.wraps(func)\` so the name, docstring and signature of the original survive.`,
  },
  {
    id: 'generator-lifecycle',
    where: { topic: /generator|yield/i, section: /how|what|lifecycle|basic|introduction|yield/i, fallbackFirst: true },
    title: 'Generator lifecycle',
    mermaid: `
sequenceDiagram
  participant C as caller
  participant G as gen = count_up(3)
  C->>G: next(gen) — body starts
  G-->>C: yield 1, frame is paused
  C->>G: next(gen) — resume after the yield
  G-->>C: yield 2
  C->>G: next(gen)
  G-->>C: yield 3
  C->>G: next(gen)
  G-->>C: function returns, StopIteration — a for loop ends here`,
    explain: `Calling a generator function runs nothing; it returns a generator object. Each \`next()\` resumes the frame until the next \`yield\`, keeping local variables alive in between, so values are produced lazily, one at a time, in constant memory. Once exhausted, a generator cannot be restarted.`,
  },
  {
    id: 'iterator-protocol',
    where: { topic: /iterator|iterable|iteration/i, section: /iterator|protocol|how for/i, fallbackFirst: true },
    title: 'What a for loop really does',
    mermaid: `
flowchart TD
  f["for x in obj:"] --> it["it = iter(obj) — calls obj.__iter__()"]
  it --> n["x = next(it) — calls it.__next__()"]
  n -->|"value"| body["run the loop body"] --> n
  n -->|"StopIteration"| stop["loop ends"]`,
    explain: `An **iterable** produces an iterator with \`__iter__\`; an **iterator** returns successive values with \`__next__\` and raises \`StopIteration\` when done. Lists are iterables (iterate them many times); iterators and generators are single-pass.`,
  },
  {
    id: 'context-manager',
    where: { topic: /context manager|with statement/i, fallbackFirst: true },
    title: 'The with statement',
    mermaid: `
flowchart TD
  w["with open('data.txt') as f:"] --> en["value = cm.__enter__() — bound to f"]
  en --> body["run the block"]
  body -->|"no error"| ex1["cm.__exit__(None, None, None)"]
  body -->|"exception"| ex2["cm.__exit__(type, value, traceback)"]
  ex2 --> sup{"__exit__ returned True?"}
  sup -->|yes| swallow["exception suppressed"]
  sup -->|no| raise["exception propagates"]
  ex1 --> done["resource released"]
  swallow --> done
  raise --> done`,
    explain: `\`with\` guarantees cleanup: \`__exit__\` runs whether the block finishes normally or raises, just like \`try/finally\`. Write your own with a class or with \`@contextlib.contextmanager\`, where the code before \`yield\` is setup and the code after it (in a \`finally\`) is teardown.`,
  },
  {
    id: 'itertools-functools',
    where: { topic: /itertools|functools/i, fallbackFirst: true },
    title: 'Lazy itertools pipeline',
    mermaid: `
flowchart LR
  src["huge log file — lines"] --> f["filter: lines with ERROR"]
  f --> g["groupby: by service"]
  g --> s["islice: first 100"]
  s --> out["only 100 lines are ever processed"]`,
    explain: `itertools functions return lazy iterators, so chaining them streams one item at a time instead of building intermediate lists. Remember that \`groupby\` only groups *consecutive* equal keys — sort first if needed.`,
  },
  {
    id: 'match-case',
    where: { topic: /match.?case|pattern matching/i, fallbackFirst: true },
    title: 'Structural pattern matching',
    mermaid: `
flowchart TD
  m["match event:"] --> c1{"case {'type': 'click', 'x': x, 'y': y}"}
  c1 -->|matches| a1["bind x, y and handle the click"]
  c1 -->|no| c2{"case {'type': 'key', 'key': k} if k in hotkeys"}
  c2 -->|matches| a2["handle the hotkey"]
  c2 -->|no| c3{"case _"}
  c3 --> a3["default"]`,
    explain: `\`match\` tests cases top to bottom against the *shape* of the data — literal values, sequences, mappings, class patterns — and binds the captured parts to names. Guards (\`if ...\`) add extra conditions. A bare name in a pattern always captures, so compare against constants with dotted names such as \`Color.RED\`.`,
  },

  /* ---------------------------------------------------------- typing & models */
  {
    id: 'dataclass',
    where: { topic: /dataclass/i, fallbackFirst: true },
    title: 'What @dataclass generates',
    mermaid: `
flowchart LR
  dc["@dataclass class Point: x: int; y: int = 0"] --> init["__init__(self, x, y=0)"]
  dc --> rep["__repr__ → Point(x=1, y=0)"]
  dc --> eq["__eq__ compares fields"]
  dc -->|"order=True"| ord["__lt__ and friends"]
  dc -->|"frozen=True"| fr["immutable and hashable"]
  dc -->|"slots=True"| sl["__slots__ — less memory"]`,
    explain: `\`@dataclass\` reads the annotated class attributes and writes the boilerplate methods for you. Use \`field(default_factory=list)\` for mutable defaults. Dataclasses do **not** validate types at runtime — use Pydantic when data comes from outside the program.`,
  },
  {
    id: 'pydantic-validation',
    where: { topic: /pydantic/i, fallbackFirst: true },
    title: 'Pydantic validation flow',
    mermaid: `
flowchart LR
  raw["raw input: JSON / dict"] --> before["mode='before' validators"]
  before --> coerce["type validation and coercion — '42' becomes 42"]
  coerce --> after["field validators, then model validators"]
  after --> ok{"all valid?"}
  ok -->|yes| model["model instance"]
  ok -->|no| err["ValidationError listing every failing field"]`,
    explain: `Pydantic turns untrusted input into typed objects: it coerces compatible values, runs your validators, and collects **all** errors into one \`ValidationError\` instead of failing at the first. FastAPI uses exactly this flow to validate request bodies and to serialise responses.`,
  },
  {
    id: 'enum',
    where: { topic: /\benums?\b/i, fallbackFirst: true },
    title: 'Enum members are singletons',
    mermaid: `
flowchart LR
  e["class Status(Enum): ACTIVE = 'active'; BANNED = 'banned'"] --> m1["Status.ACTIVE — name 'ACTIVE', value 'active'"]
  e --> m2["Status.BANNED"]
  look["Status('active')"] --> m1
  cmp["status is Status.ACTIVE"] --> m1`,
    explain: `Each enum member is created once, so compare with \`is\`; look members up by value with \`Status('active')\` or by name with \`Status['ACTIVE']\`. \`StrEnum\` and \`IntEnum\` members also behave like strings or ints, which is convenient for JSON and databases.`,
  },

  /* -------------------------------------------------------------- concurrency */
  {
    id: 'py-gil',
    where: { module: '07', topic: /gil|thread|concurren/i, section: /gil/i, fallbackFirst: true },
    title: 'Threads vs processes under the GIL',
    mermaid: `
flowchart TB
  subgraph T["4 threads, 1 process"]
    g(("one GIL")) --> t1["T1 runs"]
    g -.-> t2["T2 waits"]
    g -.-> t3["T3 waits"]
    g -.-> t4["T4 waits"]
  end
  subgraph P["4 processes"]
    p1["P1 + own GIL — core 1"]
    p2["P2 + own GIL — core 2"]
    p3["P3 + own GIL — core 3"]
    p4["P4 + own GIL — core 4"]
  end`,
    explain: `Inside one process only the thread holding the GIL runs Python bytecode, so CPU-bound threads take turns; threads still help I/O because the GIL is released while waiting. Processes each have their own interpreter and GIL, so they run on separate cores at the cost of pickling data between them.`,
  },
  {
    id: 'py-event-loop',
    where: { module: '07', topic: /async|asyncio|coroutine|event loop/i, section: /event loop|async|coroutine/i, fallbackFirst: true },
    title: 'The asyncio event loop',
    mermaid: `
flowchart LR
  ready[("ready tasks")] --> run["run a task until it awaits"]
  run --> io["register the awaited I/O"]
  io --> poll["OS reports which sockets and timers are ready"]
  poll --> ready`,
    explain: `asyncio runs many tasks on one thread by switching only at \`await\`. While one task waits for the network, the loop runs another. Blocking calls (\`time.sleep\`, \`requests\`) never yield, so they stall every task — use async libraries or \`asyncio.to_thread\`.`,
  },

  /* ---------------------------------------------------------- files & errors */
  {
    id: 'exception-flow',
    where: { topic: /exception|error handling/i, section: /try|except|finally|flow|handling|basics|introduction/i, fallbackFirst: true },
    title: 'try / except / else / finally',
    mermaid: `
flowchart TD
  t["try: body"] -->|"no exception"| e["else: runs only on success"]
  t -->|"exception raised"| m{"matching except clause?"}
  m -->|yes| h["except: handle it"]
  m -->|no| up["propagates to the caller after finally"]
  e --> f["finally: always runs — cleanup"]
  h --> f
  up --> f`,
    explain: `Keep the \`try\` block small, catch the most specific exception you can handle, put success-only code in \`else\`, and cleanup in \`finally\` (or a \`with\` block). Re-raise with \`raise\` to keep the traceback, or chain with \`raise NewError(...) from err\`.`,
  },
  {
    id: 'exception-hierarchy',
    where: { topic: /exception|error/i, section: /hierarch|built-in exception|custom exception|types of/i, fallbackFirst: false },
    title: 'Part of the exception hierarchy',
    mermaid: `
flowchart TD
  be["BaseException"] --> si["SystemExit"]
  be --> ki["KeyboardInterrupt"]
  be --> ex["Exception — catch this, not BaseException"]
  ex --> ve["ValueError"]
  ex --> te["TypeError"]
  ex --> le["LookupError"]
  le --> ke["KeyError"]
  le --> ie["IndexError"]
  ex --> oe["OSError"]
  oe --> fnf["FileNotFoundError"]
  ex --> app["YourAppError — custom base for your package"]`,
    explain: `\`except Exception\` deliberately does not catch \`SystemExit\` or \`KeyboardInterrupt\`. Catching a parent class catches all its children, so order handlers from most specific to most general, and give your package one custom base exception so callers can catch all of your errors at once.`,
  },
  {
    id: 'file-io',
    where: { topic: /file handling|file i\/o|files/i, section: /open|read|write|mode|basics|introduction/i, fallbackFirst: true },
    title: 'Reading and writing a file safely',
    mermaid: `
flowchart LR
  o["with open(path, 'r', encoding='utf-8') as f"] --> fo["file object with a buffer"]
  fo --> r["read() / readline() / iterate line by line"]
  fo --> w["write() goes to the buffer, flushed to disk"]
  r --> c["block ends: file closed even on error"]
  w --> c`,
    explain: `Always open files with \`with\` so they are closed even if an exception occurs, and pass \`encoding='utf-8'\` explicitly for text. Iterate over the file object to process large files line by line in constant memory; use \`'b'\` modes for binary data and \`pathlib.Path\` for path handling.`,
  },
]
