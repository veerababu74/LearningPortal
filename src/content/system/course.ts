import type { CourseConfig } from '@/content/courseKit'
import { SD_GALLERY } from '@/content/sims/registry'

export const SD_LABS = [
  { to: '/labs/capacity-estimation', icon: '🧮', title: 'Capacity Estimation Lab', text: 'Turn daily users into QPS, storage, bandwidth, servers and cache size — and see which part becomes the bottleneck.' },
  { to: '/labs/load-balancer', icon: '⚖️', title: 'Load Balancer Lab', text: 'Round robin vs least connections vs power of two choices on traffic with a slow tail; kill a server mid-run.' },
  { to: '/labs/consistent-hashing', icon: '💍', title: 'Consistent Hashing Lab', text: 'Add and remove servers on a hash ring, count how many keys move versus mod-N, and even the load with virtual nodes.' },
  { to: '/labs/cache-eviction', icon: '🗃️', title: 'Cache Eviction Lab', text: 'Replay real-looking workloads through LRU, LFU, FIFO and Random and compare hit rates step by step.' },
  { to: '/labs/rate-limiter-algorithms', icon: '🚦', title: 'Rate Limiter Algorithms Lab', text: 'Fixed window, sliding window, token bucket and leaky bucket against the same bursts — including the window-edge loophole.' },
]

export const SD_COURSE: CourseConfig = {
  trackId: 'veerasys',
  base: '/system-design',
  title: 'VeeraSystem',
  accent: '#0f766e',
  kicker: 'VeeraSystem',
  heroTitle: 'Learn system design from first principles — and watch every mechanism work',
  heroText:
    'Requirements and trade-offs, networking and APIs, databases, caching, load balancing, distributed systems, messaging, microservices, storage, security, observability, cloud, scaling to millions, low-level design and 25+ full case studies — with flow diagrams, simulations, labs, build projects and 2,900+ interview questions.',
  searchPlaceholder: 'Search — consistent hashing, cache stampede, Kafka, Raft, saga, sharding, rate limiting, URL shortener…',
  phases: [
    {
      id: 'learn',
      title: 'Learn',
      blurb: 'Fifteen modules from fundamentals and the building blocks to distributed systems, scaling playbooks, low-level design and case studies.',
      accent: '#0f766e',
      moduleIds: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'],
    },
    { id: 'exercises', title: 'Exercises', blurb: 'Hands-on exercises from the chapter deep dives, grouped by module.', accent: '#1d4ed8', moduleIds: ['20'] },
    {
      id: 'projects',
      title: 'Projects',
      blurb: '10 build projects (auth, e-commerce, ChatGPT clone, RAG SaaS, chat, video, task queue, multi-tenant SaaS…) and 5 capstone designs.',
      accent: '#b45309',
      moduleIds: ['21'],
    },
    { id: 'interview', title: 'Interview', blurb: 'The interview framework and checklist, plus conceptual and scenario questions with model answers for every topic.', accent: '#db2777', moduleIds: ['22'] },
  ],
  modules: {
    '01': { icon: '🧭', color: '#0f766e', blurb: 'Requirements, scalability, availability, reliability, latency vs throughput, CAP and PACELC, SLAs, estimation and the building blocks.' },
    '02': { icon: '🌐', color: '#2563eb', blurb: 'OSI and TCP/IP, HTTP/HTTPS, TLS, DNS, CDNs, proxies, REST, GraphQL, gRPC, WebSockets, long polling and SSE.' },
    '03': { icon: '🗄️', color: '#7c3aed', blurb: 'SQL and NoSQL, ACID, indexing, normalisation, sharding, partitioning, replication, transactions, pooling and 10 real databases.' },
    '04': { icon: '⚡', color: '#ea580c', blurb: 'Cache-aside, read/write-through, write-back, eviction (LRU/LFU), TTL, invalidation, stampede, penetration, avalanche, Redis, Memcached.' },
    '05': { icon: '⚖️', color: '#16a34a', blurb: 'Vertical vs horizontal scaling, L4/L7 load balancers, round robin, least connections, sticky sessions, health checks, NGINX, HAProxy.' },
    '06': { icon: '🕸️', color: '#dc2626', blurb: 'Consistency models, quorum, Raft/Paxos, leader election, split brain, 2PC/3PC, sagas, distributed locks, vector and Lamport clocks.' },
    '07': { icon: '📬', color: '#0891b2', blurb: 'Queues, pub/sub, event-driven architecture, delivery guarantees, DLQs, retries, event sourcing, CQRS, Kafka, RabbitMQ, Pulsar.' },
    '08': { icon: '🧩', color: '#9333ea', blurb: 'Monolith vs microservices, service discovery, API gateway, circuit breaker, bulkhead, sidecar, service mesh, tracing, Docker, Kubernetes.' },
    '09': { icon: '📦', color: '#b45309', blurb: 'Object, block and file storage, HDFS, data lakes and warehouses, CDNs, data pipelines, ETL/ELT and star schemas.' },
    '10': { icon: '🔐', color: '#be123c', blurb: 'Authentication, authorisation, JWT, OAuth 2.0, OIDC, API keys, rate limiting, encryption, CSRF, XSS, SQL injection, secrets.' },
    '11': { icon: '📈', color: '#0369a1', blurb: 'Logging, metrics, monitoring, alerting, distributed tracing, health checks, root-cause analysis, SRE, Prometheus, Grafana.' },
    '12': { icon: '☁️', color: '#0284c7', blurb: 'IaaS/PaaS/SaaS, containers, Kubernetes, serverless, auto-scaling, multi-region, disaster recovery, blue-green and canary deploys.' },
    '13': { icon: '🚀', color: '#c026d3', blurb: 'How architectures evolve from 1K to 100M users: scaling playbooks, real benchmarks, concurrency at scale, million-user systems.' },
    '14': { icon: '🧱', color: '#4d7c0f', blurb: 'SOLID principles and the Gang-of-Four creational, structural and behavioral patterns — with runnable Python.' },
    '15': { icon: '🏙️', color: '#334155', blurb: 'Step-by-step designs: URL shortener, WhatsApp, Instagram, YouTube, Netflix, Uber, Twitter, Google Drive, payments, Zomato and more.' },
  },
  sims: SD_GALLERY,
  simModuleOf: (s) => s.module,
  visualizerBase: '/system-design/visualizer',
  demoSimId: 'sd-request-journey',
  labs: SD_LABS,
}
