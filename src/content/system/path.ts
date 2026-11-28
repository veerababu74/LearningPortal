/**
 * VeeraSystem guided learning path: Stages → Sub-modules → Core / Practice / Deeper lessons.
 * The System Design Curriculum topic is the core step of each sub-module; Python implementations are
 * practice; chapter deep dives, the essentials guides and the scaling playbook are "go deeper".
 */
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { resolvePath, type ResolvedPath, type Rule, type StageDef } from '@/content/paths/engine'

const CORE = /^System Design Curriculum$/
const CODE = /^Python Implementations$/
const DEEPER = /^(Chapter Deep Dives|System Design Essentials|Scalable App Mastery|Real-World Systems)$/
const ANY = /.*/

const play = (id: string, title: string) => ({ to: `/labs/${id}`, title })

/** All lessons of a module whose title matches `t`, with roles by series. */
function rules(module: string, t: RegExp): Rule[] {
  const m = new RegExp(`^${module}$`)
  return [
    { m, s: CORE, t, role: 'core' },
    { m, s: CODE, t, role: 'practice' },
    { m, s: DEEPER, t, role: 'deeper' },
  ]
}
/** Modules without curriculum topics (scaling playbook, low-level design): every lesson is core. */
const allCore = (module: string, t: RegExp = ANY): Rule[] => [
  { m: new RegExp(`^${module}$`), s: CODE, t, role: 'practice' },
  { m: new RegExp(`^${module}$`), t, role: 'core' },
]

export const SD_STAGES: StageDef[] = [
  {
    id: 'sd-foundations',
    title: 'Stage 1 · Foundations: requirements, quality attributes & the network',
    level: 'Beginner',
    color: '#0f766e',
    blurb: 'What a design must achieve and how to measure it, the standard building blocks, and how requests travel across the network and through APIs.',
    topics: [
      {
        id: 'what-is-sd',
        title: 'What System Design Is: Requirements, Estimation & Building Blocks',
        icon: '🧭',
        blurb: 'Functional vs non-functional requirements, back-of-the-envelope estimation, and the components every design reuses.',
        kw: /\b(requirements?|functional|non-functional|estimat|back-of-the-envelope|building blocks?|what is system design)\b/i,
        rules: rules('01', /what is system design|requirements|introduction|fundamentals: principles|building blocks|architecture patterns at a glance/i),
        sims: ['sd-request-journey'],
        labs: [play('capacity-estimation', 'Capacity Estimation Lab')],
      },
      {
        id: 'quality',
        title: 'Scalability, Availability, Reliability & Fault Tolerance',
        icon: '🛡️',
        blurb: 'Scaling up vs out, nines of availability, durability, fault tolerance and how load and stress tests prove them.',
        kw: /\b(scalab|availab|reliab|durab|fault toleran|vertical scal|horizontal scal|redundan|load test|stress test|nines)\b/i,
        rules: rules('01', /scalab|availab|reliab|durab|fault toler|vertical|horizontal|load vs stress/i),
      },
      {
        id: 'tradeoffs',
        title: 'Latency, Throughput, CAP, PACELC & SLAs',
        icon: '⚖️',
        blurb: 'Latency vs throughput, the CAP and PACELC trade-offs, and SLAs, SLOs and SLIs.',
        kw: /\b(latency|throughput|cap theorem|pacelc|sla|slo|sli|error budget|percentile|p99)\b/i,
        rules: rules('01', ANY),
      },
      {
        id: 'networking',
        title: 'Networking: OSI, TCP/IP, HTTP(S), TLS, DNS, CDNs & Proxies',
        icon: '🌐',
        blurb: 'How bytes travel, what HTTPS and TLS add, how DNS resolves, and what CDNs and forward/reverse proxies do.',
        kw: /\b(osi|tcp|udp|http|https|tls|ssl|dns|cdn|proxy|reverse proxy|handshake)\b/i,
        rules: rules('02', /osi|tcp|http|ssl|tls|dns|proxy|cdn/i),
      },
      {
        id: 'apis',
        title: 'APIs & Real-Time: REST, GraphQL, gRPC, WebSockets, SSE',
        icon: '🔌',
        blurb: 'Designing APIs and choosing between REST, GraphQL and gRPC; pushing data with long polling, SSE and WebSockets.',
        kw: /\b(rest|graphql|grpc|protobuf|websocket|long polling|server-sent|sse|api design|pagination|idempoten)\b/i,
        rules: rules('02', ANY),
      },
    ],
  },
  {
    id: 'sd-data',
    title: 'Stage 2 · Data: databases, scaling data and caching',
    level: 'Intermediate',
    color: '#7c3aed',
    blurb: 'Relational and NoSQL databases, indexes, replication and sharding, then the caching patterns and failure modes that keep reads fast.',
    topics: [
      {
        id: 'relational',
        title: 'Relational Databases, ACID, Normalisation & Transactions',
        icon: '🗄️',
        blurb: 'SQL and RDBMS basics, ACID, normalisation vs denormalisation, transactions and isolation, and PostgreSQL, MySQL and SQL Server.',
        kw: /\b(sql|rdbms|acid|transaction|isolation level|normali[sz]|denormali[sz]|postgres|mysql|sql server|foreign key)\b/i,
        rules: rules('03', /sql databases|rdbms|acid|transactions|normaliz|denormaliz|postgres|mysql|sql server|sql vs nosql/i),
      },
      {
        id: 'indexing',
        title: 'Indexing, Query Optimisation & Connection Pooling',
        icon: '🔎',
        blurb: 'B-tree, composite, clustered and non-clustered indexes, reading query plans, and pooling connections.',
        kw: /\b(index|b-?tree|composite index|clustered|query plan|explain analyze|query optimi[sz]|connection pool)\b/i,
        rules: rules('03', /index|query optim|connection pool/i),
      },
      {
        id: 'scaling-data',
        title: 'Replication, Read Replicas, Sharding & Partitioning',
        icon: '🧬',
        blurb: 'Leader–follower replication and lag, read replicas, partitioning tables and sharding data across databases.',
        kw: /\b(replicat|read replica|shard|partition|replication lag|failover|hot spot|resharding)\b/i,
        rules: rules('03', /shard|partition|replica|database design at scale/i),
        sims: ['sd-replication-lag'],
        labs: [play('consistent-hashing', 'Consistent Hashing Lab')],
      },
      {
        id: 'nosql',
        title: 'NoSQL: Key-Value, Document, Wide-Column, Graph & Time-Series',
        icon: '🗃️',
        blurb: 'When each NoSQL family fits, with MongoDB, Cassandra, Redis, Neo4j, event stores and time-series databases.',
        kw: /\b(nosql|key-value|document (database|store)|mongodb|cassandra|wide-column|column-family|graph database|neo4j|time[- ]series|event store|dynamodb)\b/i,
        rules: rules('03', ANY),
      },
      {
        id: 'caching',
        title: 'Caching Patterns & Eviction: Cache-Aside, Write-Through, LRU, LFU, TTL',
        icon: '⚡',
        blurb: 'Why cache, where the cache sits in each pattern, and how eviction and TTL decide what stays.',
        kw: /\b(cache[- ]aside|read[- ]through|write[- ]through|write[- ]back|evict|lru|lfu|ttl|hit rate|caching strateg)\b/i,
        rules: rules('04', /why cache|cache aside|read through|write through|write back|eviction|lru|lfu|ttl|caching strategies|python/i),
        sims: ['sd-cache-aside'],
        labs: [play('cache-eviction', 'Cache Eviction Lab')],
      },
      {
        id: 'cache-at-scale',
        title: 'Caching at Scale: Invalidation, Stampede, Penetration, Redis & Memcached',
        icon: '🔥',
        blurb: 'Keeping caches correct, the stampede, penetration and avalanche failure modes, distributed caches, Redis and Memcached.',
        kw: /\b(invalidat|stampede|thundering herd|penetration|avalanche|distributed cache|redis|memcached|bloom filter)\b/i,
        rules: rules('04', ANY),
      },
    ],
  },
  {
    id: 'sd-distributed',
    title: 'Stage 3 · Scale out: load balancing, distributed systems & messaging',
    level: 'Intermediate',
    color: '#dc2626',
    blurb: 'Spreading traffic over many servers, keeping many machines consistent, agreeing on a leader, transactions across services, and asynchronous messaging.',
    topics: [
      {
        id: 'load-balancing',
        title: 'Scaling Out & Load Balancing: L4/L7, Algorithms, Health Checks',
        icon: '⚖️',
        blurb: 'Horizontal scaling, L4 vs L7 balancers, round robin to least connections, sticky sessions, global balancing, NGINX and HAProxy.',
        kw: /\b(load balanc|round robin|least connections|sticky session|health check|layer [47]|nginx|haproxy|consistent hash|global load)\b/i,
        rules: rules('05', ANY),
        sims: ['sd-load-balancing', 'sd-consistent-hashing'],
        labs: [play('load-balancer', 'Load Balancer Lab'), play('consistent-hashing', 'Consistent Hashing Lab')],
      },
      {
        id: 'consistency',
        title: 'Consistency Models, Quorum & Logical Clocks',
        icon: '🔁',
        blurb: 'Strong vs eventual consistency, quorum reads and writes, CAP in practice, vector and Lamport clocks.',
        kw: /\b(consistency|eventual|strong consisten|linearizab|quorum|vector clock|lamport|happens-before)\b/i,
        rules: rules('06', /basics|consisten|quorum|vector|lamport|cap/i),
      },
      {
        id: 'consensus',
        title: 'Consensus, Leader Election, Split Brain & Distributed Locks',
        icon: '👑',
        blurb: 'Raft and Paxos, electing a leader, avoiding split brain with fencing, and distributed locks.',
        kw: /\b(consensus|raft|paxos|leader election|split[- ]brain|fencing|distributed lock|zookeeper|etcd)\b/i,
        rules: rules('06', /consensus|leader|split|lock/i),
        sims: ['sd-raft-election'],
      },
      {
        id: 'dist-transactions',
        title: 'Distributed Transactions: 2PC, 3PC & Sagas',
        icon: '🔗',
        blurb: 'Atomic commit across nodes with two- and three-phase commit, and long-running business transactions as sagas.',
        kw: /\b(two[- ]phase|2pc|three[- ]phase|3pc|saga|compensat|distributed transaction|outbox)\b/i,
        rules: rules('06', ANY),
        sims: ['sd-saga'],
      },
      {
        id: 'messaging',
        title: 'Queues, Pub/Sub & Delivery Guarantees',
        icon: '📬',
        blurb: 'Producer–consumer, queues vs pub/sub, at-most / at-least / exactly-once, retries and dead-letter queues.',
        kw: /\b(message queue|pub\/?sub|producer|consumer|at[- ]least[- ]once|at[- ]most[- ]once|exactly[- ]once|dead[- ]letter|dlq|retry|backoff|idempoten)\b/i,
        rules: rules('07', /producer|^message queues$|pub\/sub|dead letter|retry|exactly|at least|at most|message queues & event/i),
        sims: ['sd-kafka-consumer-group'],
      },
      {
        id: 'event-driven',
        title: 'Event-Driven Architecture, Event Sourcing, CQRS, Kafka & RabbitMQ',
        icon: '📡',
        blurb: 'Designing around events, storing state as events, separating reads from writes, and the brokers that carry them.',
        kw: /\b(event[- ]driven|event sourcing|cqrs|kafka|rabbitmq|pulsar|event bus|stream)\b/i,
        rules: rules('07', ANY),
      },
    ],
  },
  {
    id: 'sd-architecture',
    title: 'Stage 4 · Architecture & operations',
    level: 'Advanced',
    color: '#9333ea',
    blurb: 'Microservices and their resilience patterns, storage and data platforms, security, observability and shipping safely to the cloud.',
    topics: [
      {
        id: 'microservices',
        title: 'Microservices: Gateway, Discovery, Resilience, Mesh & Kubernetes',
        icon: '🧩',
        blurb: 'Monolith vs microservices, service discovery, API gateways, circuit breakers and bulkheads, sidecars, meshes, config and containers.',
        kw: /\b(microservice|monolith|service discovery|api gateway|circuit breaker|bulkhead|sidecar|service mesh|istio|database per service|kubernetes|docker)\b/i,
        rules: rules('08', ANY),
        sims: ['sd-circuit-breaker'],
      },
      {
        id: 'storage',
        title: 'Storage Systems, Data Lakes, Warehouses & Pipelines',
        icon: '📦',
        blurb: 'Object, block and file storage, HDFS and Hive, lakes vs warehouses, archiving, CDNs, ETL/ELT and stream processing.',
        kw: /\b(object storage|s3|block storage|file storage|hdfs|hive|data lake|warehouse|etl|elt|star schema|archiv|pipeline)\b/i,
        rules: rules('09', ANY),
      },
      {
        id: 'security',
        title: 'Security: AuthN/AuthZ, JWT, OAuth, Rate Limiting & Web Attacks',
        icon: '🔐',
        blurb: 'Authentication and authorisation, tokens and OAuth/OIDC, API keys, rate limiting, encryption, CSRF, XSS, SQL injection and secrets.',
        kw: /\b(authenticat|authori[sz]|jwt|oauth|openid|oidc|api key|rate limit|encrypt|csrf|xss|sql injection|secret|rbac)\b/i,
        rules: rules('10', ANY),
        sims: ['sd-token-bucket'],
        labs: [play('rate-limiter-algorithms', 'Rate Limiter Algorithms Lab')],
      },
      {
        id: 'observability',
        title: 'Observability & SRE: Logs, Metrics, Traces, Alerts',
        icon: '📈',
        blurb: 'The three pillars, monitoring and alerting, health checks, root-cause analysis, SRE practice, Prometheus and Grafana.',
        kw: /\b(logging|metrics|monitor|alert|tracing|opentelemetry|health check|root cause|sre|prometheus|grafana|on-call|postmortem)\b/i,
        rules: rules('11', ANY),
      },
      {
        id: 'cloud',
        title: 'Cloud, Containers & Deployment Strategies',
        icon: '☁️',
        blurb: 'IaaS/PaaS/SaaS, containers and Kubernetes, serverless, auto-scaling, multi-region, disaster recovery, blue-green and canary.',
        kw: /\b(iaas|paas|saas|serverless|lambda|auto[- ]?scal|multi[- ]region|disaster recovery|rto|rpo|blue[- ]green|canary|aws|azure|gcp|ci\/cd)\b/i,
        rules: rules('12', ANY),
      },
    ],
  },
  {
    id: 'sd-mastery',
    title: 'Stage 5 · Scale to millions, low-level design & case studies',
    level: 'Advanced',
    color: '#334155',
    blurb: 'How real architectures grow to millions of users, object-oriented design patterns, and complete designs of well-known systems.',
    topics: [
      {
        id: 'scaling-millions',
        title: 'Scaling to Millions: Playbooks, Benchmarks & Real Architectures',
        icon: '🚀',
        blurb: 'From one server to multi-region: the scale playbook, benchmarks, concurrency at scale and million-user systems end to end.',
        kw: /\b(million users|scale to|scaling playbook|concurrent requests|graceful degradation|benchmark|capacity planning)\b/i,
        rules: allCore('13'),
      },
      {
        id: 'lld',
        title: 'Low-Level Design: SOLID & Design Patterns',
        icon: '🧱',
        blurb: 'SOLID principles and the creational, structural and behavioral patterns, each with runnable Python.',
        kw: /\b(solid|single responsibility|open[/ -]closed|liskov|dependency inversion|singleton|factory|builder|adapter|decorator|observer|strategy|design pattern)\b/i,
        rules: allCore('14'),
      },
      {
        id: 'cases-core',
        title: 'Case Studies: URL Shortener, Pastebin, Chat & Notifications',
        icon: '🔗',
        blurb: 'Classic interview designs: short links, paste sharing, real-time messaging (WhatsApp, Telegram, chat) and a notification service.',
        kw: /\b(url shortener|tinyurl|bit\.ly|pastebin|whatsapp|telegram|chat (app|system)|messaging|notification service)\b/i,
        rules: rules('15', /url shortener|pastebin|chat|notification|telegram|whatsapp|worked designs/i),
        sims: ['sd-url-shortener'],
      },
      {
        id: 'cases-media',
        title: 'Case Studies: Feeds, Media & Files (Instagram, Twitter, YouTube, Netflix, Drive)',
        icon: '🎬',
        blurb: 'News feeds and fan-out, photo and video platforms, streaming, and file sync and storage.',
        kw: /\b(news feed|timeline|fan-?out|instagram|twitter|facebook|youtube|netflix|video streaming|google drive|dropbox|file sync)\b/i,
        rules: rules('15', /instagram|facebook|twitter|youtube|netflix|drive|dropbox|real apps/i),
      },
      {
        id: 'cases-marketplace',
        title: 'Case Studies: Uber, Ola, Zomato, Swiggy, Payments & E-commerce',
        icon: '🛵',
        blurb: 'Location-based matching, food delivery, payment gateways and e-commerce platforms.',
        kw: /\b(uber|ola|ride[- ]?shar|zomato|swiggy|food delivery|payment|e-?commerce|checkout|inventory)\b/i,
        rules: rules('15', ANY),
      },
    ],
  },
]

let cached: ResolvedPath | null = null

export function getSdPath(): ResolvedPath {
  if (cached) return cached
  const all = (getCurriculumIndex().lessonsByTrack.veerasys || []).filter((l) => Number(l.title.slice(0, 2)) < 20)
  cached = resolvePath(all, SD_STAGES)
  return cached
}
