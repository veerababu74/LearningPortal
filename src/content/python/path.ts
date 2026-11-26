/**
 * Python learning path: a curated, beginner → professional order over the existing Python lessons.
 *
 * Lessons keep their ids (progress and bookmarks are preserved); this file only decides
 * which topic each lesson belongs to, its role (core / practice / deeper) and the order.
 * Each lesson is claimed by the first rule that matches it.
 */
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { resolvePath, type ResolvedPath, type StageDef } from '@/content/paths/engine'

export type { Role, PathLesson, PathTopic, PathStage } from '@/content/paths/engine'

const S = {
  CG: /^Core Guides$/,
  TW: /^Topic Workshops$/,
  MEM: /^Memory Management Masterclass$/,
  STR: /^Strings Masterclass$/,
  DD: /^Deep-Dive Notes$/,
  IRP: /^Interview Rebuild Plan$/,
  APT: /^Advanced Python Topics$/,
  RS: /^Reference Scripts$/,
  BST: /^Binary Search Tree Masterclass$/,
  COMP: /^Comprehensions Masterclass$/,
  DICT: /^Dictionaries Masterclass$/,
  FUN: /^Functions & Built-ins Masterclass$/,
  LIST: /^Lists & Tuples Masterclass$/,
  REC: /^Recursion Masterclass$/,
  SET: /^Sets Masterclass$/,
  OOPC: /^OOP Course$/,
  OOPM: /^OOP Masterclass$/,
  OOPI: /^OOP Interview Deep Dives$/,
  DCP: /^Dataclasses, Enum & Pydantic Masterclass$/,
  ASY: /^Async Programming Masterclass$/,
  THR: /^Threading & Multiprocessing Masterclass$/,
  FILE: /^File Handling Masterclass$/,
  BE: /^Backend Essentials$/,
}
const ANY = /.*/
const lab = (id: string, title: string) => ({ to: `/python/labs/${id}`, title })
const play = (id: string, title: string) => ({ to: `/labs/${id}`, title })

const STAGES: StageDef[] = [
  {
    id: 'basics',
    title: 'Python Basics',
    level: 'Beginner',
    color: '#1f6feb',
    blurb: 'Syntax, the core data types and functions — everything you write every day.',
    topics: [
      {
        id: 'getting-started',
        kw: /\b(variable|data type|type conversion|operator|if statement|loop|range|input|print|truthy|none|int|float|bool)\b/i,
        title: 'Getting started: syntax, variables & types',
        icon: '🚀',
        blurb: 'What Python is, variables, data types, type conversion, input/output, operators and control flow.',
        rules: [
          { s: S.CG, t: /Python Fundamentals 1\/3/ },
          { s: S.CG, t: /Python Fundamentals 2\/3/ },
          { s: S.IRP, t: /^PYTHON FUNDAMENTALS/, role: 'deeper' },
          { s: S.IRP, t: /ADDITIONAL ESSENTIAL/, role: 'deeper' },
          { s: S.APT, t: /IDIOMS/, role: 'deeper' },
          { s: S.APT, t: /BIT MANIPULATION/, role: 'deeper' },
        ],
        sims: ['py-references'],
        labs: [lab('name-vs-object', 'Name vs object')],
      },
      {
        id: 'strings',
        kw: /\bstring|str\b|f-string|slicing|encoding|unicode|regex|regular expression/i,
        title: 'Strings',
        icon: '🔤',
        blurb: 'Creating, indexing and slicing strings, every string method, formatting, bytes and regular expressions.',
        rules: [
          { s: S.STR, t: ANY },
          { s: S.RS, t: /String Formatting/, role: 'practice' },
          { s: S.DD, t: /14\. Strings/, role: 'deeper' },
          { s: S.APT, t: /STRING FORMATTING/, role: 'deeper' },
        ],
      },
      {
        id: 'lists-tuples',
        kw: /\blists?\b|tuple|append|slice|deque|stack|queue/i,
        title: 'Lists & tuples',
        icon: '📋',
        blurb: 'Creating, slicing and changing lists, list methods, nested lists, stacks and queues, tuples and unpacking.',
        rules: [
          { s: S.LIST, t: ANY },
          { s: S.CG, t: /Lists - Complete/, role: 'deeper' },
          { s: S.DD, t: /08 — Lists, Tuples/, role: 'deeper' },
        ],
        sims: ['py-references'],
        labs: [lab('mutable-trap', 'Mutable default trap')],
      },
      {
        id: 'dicts',
        kw: /dict|hash ?map|key-value|defaultdict|counter|ordereddict/i,
        title: 'Dictionaries',
        icon: '📖',
        blurb: 'Creating, reading and updating dicts, methods, iteration, nesting, merging, sorting and real-world patterns.',
        rules: [
          { s: S.DICT, t: ANY },
          { s: S.CG, t: /Dictionaries - Complete/, role: 'deeper' },
        ],
        sims: ['py-dict-hash'],
        labs: [play('hash-table', 'Dict hash table playground')],
      },
      {
        id: 'sets',
        kw: /\bsets?\b|frozenset|union|intersection/i,
        title: 'Sets',
        icon: '🔵',
        blurb: 'Set creation, adding and removing, set algebra (union, intersection, difference), frozenset.',
        rules: [
          { s: S.CG, t: /Python Fundamentals 3\/3/ },
          { s: S.SET, t: ANY },
        ],
        sims: ['py-dict-hash'],
      },
      {
        id: 'comprehensions',
        kw: /comprehension|generator expression/i,
        title: 'Comprehensions',
        icon: '⚡',
        blurb: 'List, dict and set comprehensions, filtering, nesting, generator expressions and common mistakes.',
        rules: [
          { s: S.COMP, t: ANY },
          { s: S.TW, t: /^Comprehensions/, role: 'practice' },
          { s: S.FUN, t: /All Comprehension Types/, role: 'deeper' },
          { s: S.DD, t: /09 — Comprehensions/, role: 'deeper' },
        ],
      },
      {
        id: 'functions',
        kw: /function|argument|\*args|kwargs|parameter|scope|legb|closure|global|nonlocal/i,
        title: 'Functions & arguments',
        icon: '🧩',
        blurb: 'Defining functions, every argument kind (*args, **kwargs, keyword-only), scope, closures and first-class functions.',
        rules: [
          { s: S.CG, t: /Python Functions 1\/3/ },
          { s: S.FUN, t: /^(Positional Arguments|Keyword Arguments|Default Arguments|\*args|\*\*kwargs|Keyword-Only|Positional-Only|Complete Packing)/ },
          { s: S.CG, t: /Python Functions 2\/3/ },
          { s: S.CG, t: /Python Functions 3\/3/ },
          { s: S.TW, t: /^Args Kwargs/, role: 'practice' },
          { s: S.IRP, t: /^FUNCTIONS/, role: 'deeper' },
          { s: S.DD, t: /11\. \*args/, role: 'deeper' },
        ],
        sims: ['py-call-stack'],
        labs: [lab('mutable-trap', 'Mutable default trap')],
      },
      {
        id: 'functional',
        kw: /lambda|\bmap\b|filter|reduce|zip|enumerate|sorted|built-?in/i,
        title: 'Lambda, map/filter/reduce & built-ins',
        icon: '🛠️',
        blurb: 'Lambdas, map, filter, reduce, zip, enumerate, sorted with key, and the built-in functions worth knowing.',
        rules: [
          { s: S.FUN, t: /^(Lambda|map\(\)|filter\(\)|reduce\(\)|zip\(\)|All Key Built-in|eval, exec)/ },
          { s: S.TW, t: /^(Lambda Functions|Map Filter Reduce)/, role: 'practice' },
          { s: S.CG, t: /Exception Handling & File I\/O 3\/3/, role: 'deeper' },
          { s: S.APT, t: /MAP, FILTER, REDUCE|IMPORTANT BUILT-IN/, role: 'deeper' },
        ],
      },
    ],
  },
  {
    id: 'intermediate',
    title: 'Intermediate Python',
    level: 'Intermediate',
    color: '#0f766e',
    blurb: 'Errors, files, the standard library and object-oriented programming.',
    topics: [
      {
        id: 'exceptions',
        kw: /exception|try|except|raise|error handling|traceback/i,
        title: 'Errors & exceptions',
        icon: '🚨',
        blurb: 'try / except / else / finally, raising and custom exceptions, exception groups and good error-handling style.',
        rules: [
          { s: S.CG, t: /Exception Handling & File I\/O 1\/3/ },
          { s: S.FUN, t: /^(try \/ except|Custom Exceptions)/ },
          { s: S.CG, t: /Exception Handling & File I\/O 2\/3/ },
          { s: S.TW, t: /^Exception Handling/, role: 'practice' },
          { s: S.DD, t: /05 — Exception/, role: 'deeper' },
          { s: S.IRP, t: /EXCEPTION HANDLING/, role: 'deeper' },
        ],
        sims: ['py-exceptions'],
      },
      {
        id: 'files',
        kw: /\bfile|csv|json|pathlib|\bos\b|serializ|pickle|logging/i,
        title: 'Files, OS & data formats',
        icon: '📁',
        blurb: 'Reading and writing files, CSV, JSON and logs, the os module and pathlib, and serialization.',
        rules: [
          { s: S.FILE, t: ANY },
          { s: S.TW, t: /^(File Handling|Os Module)/, role: 'practice' },
          { s: S.DD, t: /03 — File Handling|15\. os, sys/, role: 'deeper' },
          { s: S.IRP, t: /FILE HANDLING/, role: 'deeper' },
          { s: S.APT, t: /PICKLE|STRUCT, ARRAY/, role: 'deeper' },
        ],
        sims: ['py-context-manager'],
      },
      {
        id: 'stdlib',
        kw: /collections|datetime|heapq|itertools|math|statistics|subprocess|argparse/i,
        title: 'Standard library toolbox',
        icon: '🧰',
        blurb: 'collections, datetime, math and statistics, heapq and queues, requests, argparse, subprocess and hashing.',
        rules: [
          { s: S.APT, t: /COLLECTIONS MODULE/ },
          { s: S.TW, t: /^Collections Module/, role: 'practice' },
          { s: S.FUN, t: /collections Module/, role: 'deeper' },
          { s: S.APT, t: /QUEUE, HEAPQ/ },
          { s: S.APT, t: /MATH & STATISTICS/ },
          { s: S.RS, t: /Math Stats/, role: 'practice' },
          { s: S.TW, t: /^(Datetime Module|Requests Module)/, role: 'practice' },
          { s: S.APT, t: /ARGUMENT PARSING|SUBPROCESS|HASHLIB/, role: 'deeper' },
        ],
      },
      {
        id: 'oop-basics',
        kw: /\bclass\b|object|inheritance|encapsulation|polymorphism|abstraction|__init__|instance|constructor/i,
        title: 'OOP fundamentals',
        icon: '🏗️',
        blurb: 'Classes and objects, __init__, instance vs class members, the four pillars: encapsulation, abstraction, inheritance, polymorphism.',
        rules: [
          { s: S.CG, t: /Python OOP 1\/3/ },
          { s: S.OOPM, t: /^(Classes & Objects|__init__ Method|Instance Variables|Instance Methods|Encapsulation|Abstraction|Inheritance|Polymorphism)/ },
          { s: S.CG, t: /Python OOP 2\/3/ },
          { s: S.OOPC, t: /Topic [1-5]:/, role: 'deeper' },
          { s: S.OOPI, t: /^(Classes and Objects|__init__|Instance|Encapsulation|Inheritance|Polymorphism|Abstraction|Method Overloading)/, role: 'deeper' },
        ],
      },
      {
        id: 'oop-advanced',
        kw: /dunder|magic method|property|mro|super\(|mixin|slots|metaclass|descriptor|__new__|abstract/i,
        title: 'Advanced OOP',
        icon: '🧬',
        blurb: 'Dunder methods, properties, abstract classes, MRO and super(), composition, mixins, __slots__, descriptors and metaclasses.',
        rules: [
          { s: S.OOPM, t: /^(Magic|Properties|Decorators in OOP|Abstract Classes|MRO|Composition|Mixins|__slots__|__new__|Descriptors|Metaclasses|Data Classes)/ },
          { s: S.CG, t: /Python OOP 3\/3/ },
          { s: S.TW, t: /^Magic Methods/, role: 'practice' },
          { s: S.OOPC, t: /Topic [68]:|Special Features/, role: 'deeper' },
          { s: S.OOPI, t: ANY, role: 'deeper' },
          { s: S.DD, t: /17\. Magic|01 — Object Oriented/, role: 'deeper' },
          { s: S.IRP, t: /OOP — OBJECT/, role: 'deeper' },
          { s: S.APT, t: /ABSTRACT BASE CLASSES/, role: 'deeper' },
        ],
        sims: ['py-mro'],
        labs: [lab('mro-tracer', 'MRO tracer')],
      },
      {
        id: 'design',
        kw: /solid|design pattern|singleton|factory|observer|strategy|dependency injection/i,
        title: 'SOLID & design patterns',
        icon: '📐',
        blurb: 'The SOLID principles and the design patterns you will actually use, with Python-specific implementations.',
        rules: [
          { s: S.OOPM, t: /SOLID|Design Patterns/ },
          { s: S.CG, t: /Design Patterns & SOLID/, role: 'deeper' },
          { s: S.OOPC, t: /Topic 7/, role: 'deeper' },
          { s: S.DD, t: /04 — Design/, role: 'deeper' },
          { s: S.IRP, t: /SOLID|DESIGN PATTERNS/, role: 'deeper' },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Python',
    level: 'Advanced',
    color: '#7c3aed',
    blurb: 'The features that make Python code elegant — and how CPython works underneath.',
    topics: [
      {
        id: 'iterators-generators',
        kw: /iterator|generator|yield|__iter__|__next__/i,
        title: 'Iterators & generators',
        icon: '🔁',
        blurb: 'The iterator protocol, generators and yield, lazy evaluation and why generators save memory.',
        rules: [
          { s: S.CG, t: /Decorators, Generators & Iterators/ },
          { s: S.MEM, t: /Generators vs Lists/ },
          { s: S.TW, t: /^Generators Iterators/, role: 'practice' },
          { s: S.DD, t: /12\. Generators/, role: 'deeper' },
          { s: S.IRP, t: /GENERATORS/, role: 'deeper' },
        ],
        sims: ['py-generator'],
        labs: [lab('generator-stepper', 'Generator stepper')],
      },
      {
        id: 'decorators',
        kw: /decorator|wraps|closure/i,
        title: 'Decorators & closures',
        icon: '🎀',
        blurb: 'How decorators wrap functions, decorators with arguments, functools.wraps and class decorators.',
        rules: [
          { s: S.TW, t: /^Decorators$/ },
          { s: S.IRP, t: /^DECORATORS/, role: 'deeper' },
          { s: S.DD, t: /18\. Bonus — Decorators/, role: 'deeper' },
        ],
        sims: ['py-decorator'],
        labs: [lab('decorator-unwrap', 'Decorator unwrap')],
      },
      {
        id: 'context-managers',
        kw: /context manager|with statement|__enter__|__exit__|match[- ]case/i,
        title: 'Context managers & match-case',
        icon: '🚪',
        blurb: 'with statements, __enter__/__exit__, contextlib, and structural pattern matching with match-case.',
        rules: [
          { s: S.TW, t: /^Context Managers$/ },
          { s: S.TW, t: /^Match Case$/ },
          { s: S.TW, t: /^(Context Managers|Match Case) — Runnable/, role: 'practice' },
          { s: S.DD, t: /06 — Context/, role: 'deeper' },
          { s: S.IRP, t: /CONTEXT MANAGERS/, role: 'deeper' },
        ],
        sims: ['py-context-manager'],
      },
      {
        id: 'itertools-functools',
        kw: /itertools|functools|lru_cache|partial|operator module/i,
        title: 'itertools, functools & advanced patterns',
        icon: '⚙️',
        blurb: 'itertools building blocks, functools (partial, lru_cache, reduce), operator and metaprogramming.',
        rules: [
          { s: S.TW, t: /^Itertools Functools$/ },
          { s: S.FUN, t: /itertools, functools/ },
          { s: S.TW, t: /^Itertools Functools — Runnable/, role: 'practice' },
          { s: S.TW, t: /^Advanced Concepts/, role: 'deeper' },
          { s: S.APT, t: /FUNCTOOLS|ITERTOOLS|ADVANCED PATTERNS|AST/, role: 'deeper' },
        ],
      },
      {
        id: 'typing-models',
        kw: /typing|type hint|dataclass|enum|pydantic|validator|mypy/i,
        title: 'Typing, dataclasses, enums & Pydantic',
        icon: '🏷️',
        blurb: 'Type hints and the typing module, dataclasses, enums and data validation with Pydantic.',
        rules: [
          { s: S.TW, t: /^Typing Module$/ },
          { s: S.DCP, t: ANY },
          { s: S.TW, t: /^(Typing Module|Pydantic Dataclasses)/, role: 'practice' },
          { s: S.CG, t: /Pydantic & Advanced/, role: 'deeper' },
          { s: S.DD, t: /10 — Dataclasses|16\. Pydantic/, role: 'deeper' },
          { s: S.IRP, t: /PYDANTIC/, role: 'deeper' },
          { s: S.APT, t: /DATACLASS ALTERNATIVES|TYPING MODULE/, role: 'deeper' },
        ],
      },
      {
        id: 'memory',
        kw: /memory|garbage|reference count|refcount|\bid\(|identity|mutable|immutable|copy|deepcopy|weakref|intern/i,
        title: 'Memory & the object model',
        icon: '🧠',
        blurb: 'Stack vs heap, references and identity, mutability, reference counting, garbage collection, copies and profiling.',
        rules: [
          { s: S.MEM, t: ANY },
          { s: S.TW, t: /^Memory Management/, role: 'practice' },
          { s: S.RS, t: /Example/, role: 'practice' },
          { s: S.DD, t: /13\. Memory/, role: 'deeper' },
          { s: S.APT, t: /WEAKREF|COPY, DEEPCOPY/, role: 'deeper' },
        ],
        sims: ['py-references'],
        labs: [lab('name-vs-object', 'Name vs object')],
      },
    ],
  },
  {
    id: 'concurrency',
    title: 'Concurrency',
    level: 'Advanced',
    color: '#ea580c',
    blurb: 'Do several things at once: threads, processes and asyncio — and when to use which.',
    topics: [
      {
        id: 'threads-processes',
        kw: /thread|process|multiprocessing|\bgil\b|lock|race condition|deadlock|pool/i,
        title: 'Threads & processes',
        icon: '🧵',
        blurb: 'The GIL, threading and synchronization, queues, thread and process pools, race conditions and deadlocks.',
        rules: [
          { s: S.CG, t: /Concurrency & Threading/ },
          { s: S.THR, t: /^(?!async\/await)/ },
          { s: S.DD, t: /07 — Threading/, role: 'deeper' },
          { s: S.IRP, t: /CONCURRENCY/, role: 'deeper' },
        ],
        sims: ['py-gil', 'py-race'],
        labs: [play('concurrency-playground', 'Concurrency playground'), lab('gil-vs-async', 'GIL vs asyncio')],
      },
      {
        id: 'asyncio',
        kw: /async|await|asyncio|coroutine|event loop|aiohttp/i,
        title: 'asyncio',
        icon: '⏱️',
        blurb: 'The event loop, coroutines, tasks, gather and timeouts, async context managers, and production async patterns.',
        rules: [
          { s: S.ASY, t: ANY },
          { s: S.THR, t: /async\/await/, role: 'deeper' },
        ],
        sims: ['py-event-loop'],
        labs: [play('concurrency-playground', 'Concurrency playground'), lab('gil-vs-async', 'GIL vs asyncio')],
      },
    ],
  },
  {
    id: 'dsa',
    title: 'Algorithms & Problem Solving',
    level: 'Interview prep',
    color: '#db2777',
    blurb: 'Recursion, trees and the data-structures-and-algorithms roadmap for coding interviews.',
    topics: [
      {
        id: 'recursion',
        kw: /recurs|backtrack|memoiz|call stack/i,
        title: 'Recursion',
        icon: '🪆',
        blurb: 'Base and recursive cases, the call stack, kinds of recursion, backtracking and memoization.',
        rules: [{ s: S.REC, t: ANY }],
        sims: ['py-call-stack'],
      },
      {
        id: 'dsa',
        kw: /tree|bst|graph|big-?o|complexity|algorithm|binary search|sorting|linked list/i,
        title: 'Trees & the DSA roadmap',
        icon: '🌳',
        blurb: 'Trees and binary search trees, data-structure deep dives and a roadmap for product-company interviews.',
        rules: [
          { s: S.CG, t: /DSA Roadmap/ },
          { s: S.BST, t: ANY },
          { s: S.TW, t: /^Data Structures/, role: 'practice' },
          { s: S.DD, t: /02 — Data Structures/, role: 'deeper' },
        ],
      },
    ],
  },
  {
    id: 'professional',
    title: 'Professional Python',
    level: 'Job-ready',
    color: '#0369a1',
    blurb: 'Testing, tooling, web APIs, databases and architecture — what a backend job expects.',
    topics: [
      {
        id: 'testing-tooling',
        kw: /test|pytest|mock|logging|lint|git|ci\/cd/i,
        title: 'Testing, logging & tooling',
        icon: '🧪',
        blurb: 'pytest, logging, code-quality tools, environment variables and Git for everyday work.',
        rules: [
          { s: S.IRP, t: /TESTING/ },
          { s: S.IRP, t: /LOGGING/ },
          { s: S.BE, t: /CODE QUALITY|ENVIRONMENT VARIABLES|GIT FOR/ },
        ],
      },
      {
        id: 'web-apis',
        kw: /fastapi|flask|django|rest|api|http|sql|database|orm|jwt|auth|redis|cache|graphql/i,
        title: 'Web APIs & databases',
        icon: '🌐',
        blurb: 'FastAPI, REST design, SQL, migrations with Alembic, JWT authentication, caching with Redis and sockets.',
        rules: [
          { s: S.BE, t: /FASTAPI|REST API|SQL|ALEMBIC|JWT|CACHING/ },
          { s: S.APT, t: /SOCKET/, role: 'deeper' },
        ],
      },
      {
        id: 'architecture',
        kw: /architecture|docker|deploy|microservice|system design|scalab/i,
        title: 'Architecture & deployment',
        icon: '🏛️',
        blurb: 'Clean architecture and project structure, Docker for Python, and a system-design roadmap.',
        rules: [
          { s: S.BE, t: /CLEAN ARCHITECTURE|DOCKER/ },
          { s: S.CG, t: /System Design Roadmap/ },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ resolve against the lesson index */

let cache: ResolvedPath | null = null

export function getPythonPath(): ResolvedPath {
  if (cache) return cache
  const all = (getCurriculumIndex().lessonsByTrack.python || []).filter((l) => Number(l.title.slice(0, 2)) < 10)
  cache = resolvePath(all, STAGES)
  return cache
}

export function allTopics() {
  return getPythonPath().topics
}

export function findTopic(id: string) {
  return allTopics().find((t) => t.id === id)
}
