import type { DockerLabMeta, DockerLesson, DockerModule } from './types'

export const DOCKER_LABS: DockerLabMeta[] = [
  {
    id: 'layer-explorer',
    title: 'Image layer explorer',
    blurb: 'Click Dockerfile lines and see which layers rebuild when files change.',
    simulation: true,
  },
  {
    id: 'port-visualizer',
    title: 'Port mapping visualizer',
    blurb: 'Change host port, container port, and bind address — predict if /health works.',
    simulation: true,
  },
  {
    id: 'storage-lab',
    title: 'Storage experiment',
    blurb: 'Create a file, replace the container, and see what survives.',
    simulation: true,
  },
  {
    id: 'compose-network',
    title: 'Compose network explorer',
    blurb: 'Trace browser → FastAPI → vector DB and break hostname/readiness on purpose.',
    simulation: true,
  },
  {
    id: 'debug-lab',
    title: 'Debugging lab',
    blurb: 'Read simulated logs, fix the broken config, and pass the verification check.',
    simulation: true,
  },
]

const m1Lessons: DockerLesson[] = [
  {
    id: 'works-on-my-laptop',
    moduleId: 'm1',
    order: 1,
    title: 'Why does my FastAPI app work on my laptop?',
    duration: '25 min',
    story: {
      title: 'The resume parser that only works for you',
      scene:
        'You built a FastAPI resume extraction API. On your laptop, POST /extract returns clean JSON. Your teammate clones the repo, runs uvicorn, and gets ModuleNotFoundError: pydantic_settings. On the staging VM, Python is 3.10 while you developed on 3.12 — and suddenly typing breaks.',
      pain:
        'Same Git repo. Different machines. Different Python versions and half-installed deps. The app is correct — the environments are not.',
    },
    visual: {
      title: 'Two laptops, one repo, two realities',
      before: [
        'Your laptop: Python 3.12 + pinned venv → API healthy',
        'Teammate laptop: system Python 3.10 + incomplete pip install → crash',
        'Staging server: older OS packages → subtle type/runtime drift',
      ],
      after: [
        'One Dockerfile describes the environment once',
        'docker build produces the same image bits everywhere',
        'docker run starts an isolated process with that exact filesystem',
      ],
      flow: [
        { id: 's1', label: 'Code', detail: 'FastAPI app + requirements.txt in Git' },
        { id: 's2', label: 'Dockerfile', detail: 'Recipe: base image, deps, copy app, start command' },
        { id: 's3', label: 'Image', detail: 'Immutable snapshot built from the recipe' },
        { id: 's4', label: 'Container', detail: 'Running process using that snapshot' },
        { id: 's5', label: 'Port', detail: 'Host:8000 → container:8000 so browsers can call /health' },
      ],
    },
    concept: {
      definition:
        'Docker packages your application with its runtime and dependencies into a portable unit. A Dockerfile is the recipe, an image is the baked artifact, and a container is a running instance of that image.',
      internals: [
        'Containers share the host kernel (unlike VMs that boot a guest OS).',
        'Each container gets isolated process trees, network stack, and filesystem view (namespaces) plus optional CPU/memory limits (cgroups).',
        'Images are stacked layers. Changing app code rebuilds only the layers after that change — if you order the Dockerfile well.',
      ],
      terms: [
        { term: 'Dockerfile', meaning: 'Text recipe of instructions to build an image.' },
        { term: 'Image', meaning: 'Immutable filesystem + metadata + default start command.' },
        { term: 'Container', meaning: 'A running (or stopped) instance created from an image.' },
        { term: 'Registry', meaning: 'Place to store/push/pull images (Docker Hub, GHCR, ECR).' },
        { term: 'Layer', meaning: 'One filesystem diff created by a Dockerfile instruction.' },
      ],
      analogyLimit:
        'A container is not a tiny VM. It does not ship a full kernel. That is why containers are lighter — and why kernel features and GPU drivers still come from the host.',
    },
    example: {
      title: 'Build, run, hit /health',
      files: [
        {
          path: 'app/main.py',
          language: 'python',
          code: `from fastapi import FastAPI

app = FastAPI(title="Resume API")

@app.get("/health")
def health():
    return {"status": "ok"}
`,
        },
        {
          path: 'requirements.txt',
          language: 'text',
          code: 'fastapi==0.115.0\nuvicorn[standard]==0.30.6\n',
        },
        {
          path: 'Dockerfile',
          language: 'dockerfile',
          code: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
        },
      ],
      commands: [
        'docker build -t resume-api:dev .',
        'docker run --rm -p 8000:8000 --name resume-api resume-api:dev',
        'curl http://localhost:8000/health',
        'docker logs resume-api',
        'docker inspect resume-api',
      ],
      expected: [
        'build finishes with Successfully tagged resume-api:dev',
        'curl returns {"status":"ok"}',
        'logs show Uvicorn running on http://0.0.0.0:8000',
      ],
      lineNotes: [
        'FROM picks a base Python image so everyone shares the same interpreter.',
        'COPY requirements.txt before app code so dependency layers cache when only Python files change.',
        '--host 0.0.0.0 binds inside the container network namespace — 127.0.0.1 would only accept local-in-container traffic.',
        '-p 8000:8000 publishes host port 8000 to container port 8000.',
      ],
    },
    genai: {
      title: 'Same pattern for a GenAI extraction API',
      fastapi:
        'Your LLM/RAG services are still Python processes. Docker freezes the interpreter, pip packages, and OS libs so “works on my laptop” stops being a team tax.',
      flaskNote:
        'Flask usually starts with flask run or gunicorn. In Docker you still bind 0.0.0.0 and publish a port — only the process launcher changes.',
      flow: [
        { id: 'g1', label: 'Client', detail: 'Browser or service calls /health or /extract' },
        { id: 'g2', label: 'Host port', detail: 'Published mapping like 8000:8000' },
        { id: 'g3', label: 'Container', detail: 'Uvicorn/Gunicorn process' },
        { id: 'g4', label: 'FastAPI', detail: 'Route handlers + Pydantic models' },
        { id: 'g5', label: 'LLM interface', detail: 'Mock provider now; real key later via env' },
      ],
      code: [
        {
          path: 'Flask CMD comparison',
          language: 'dockerfile',
          code: `# FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Flask + gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:create_app()"]
`,
        },
      ],
    },
    practice: {
      prediction: {
        question:
          'The API runs inside the container and logs show Uvicorn is healthy, but your browser cannot open http://localhost:8000/health. What is the most likely cause?',
        choices: [
          'Python version inside the image is wrong',
          'The app bound to 127.0.0.1 or the -p publish mapping is missing/wrong',
          'FastAPI cannot run in containers',
          'You must use Kubernetes to expose ports',
        ],
        answerIndex: 1,
        explanation:
          'A healthy in-container process can still be unreachable from the host if it listens only on 127.0.0.1 or if you forgot -p host:container.',
      },
      exercise: {
        title: 'Fix the broken port mapping',
        prompt:
          'Someone ran: docker run --rm -p 8001:9000 resume-api:dev while the app listens on 8000. Predict the failure, then write the corrected command.',
        hints: [
          'Left side of -p is the host port. Right side is the container port.',
          'The container process must already listen on the right-side port.',
          'Try curling both 8001 and 8000 after you fix it.',
        ],
        checkPrompt: 'Corrected command publishes a host port to container port 8000.',
        solution:
          'docker run --rm -p 8001:8000 resume-api:dev\nThen: curl http://localhost:8001/health',
      },
      handsOn: {
        title: 'First container lab',
        commands: [
          'cd labs/docker-resume-api',
          'docker build -t resume-api:dev .',
          'docker run --rm -d -p 8000:8000 --name resume-api resume-api:dev',
          'curl http://localhost:8000/health',
          'docker logs resume-api',
          'docker exec -it resume-api python -V',
          'docker stop resume-api',
        ],
        verify: 'curl /health returns {"status":"ok"} and python -V prints 3.12.x inside the container.',
        windowsNote:
          'On Docker Desktop + WSL 2, run these from WSL or PowerShell in the repo. On macOS/Linux use the same commands. localhost forwarding works from Windows to Linux containers by default.',
      },
    },
    labId: 'port-visualizer',
  },
  {
    id: 'images-vs-vms',
    moduleId: 'm1',
    order: 2,
    title: 'Containers vs VMs — what actually gets isolated',
    duration: '15 min',
    story: {
      title: 'The heavy staging box',
      scene:
        'Ops clones a full Ubuntu VM for every microservice demo. Boot time is minutes, disk balloons, and your GenAI spike environment takes forever to reproduce.',
      pain: 'You needed process isolation and a repeatable filesystem — not another guest operating system.',
    },
    visual: {
      title: 'VM stack vs container stack',
      before: ['Hardware → Host OS → Hypervisor → Guest OS → App'],
      after: ['Hardware → Host OS → Docker Engine → Containers sharing the kernel'],
      flow: [
        { id: 'v1', label: 'VM', detail: 'Guest kernel + full OS userland' },
        { id: 'v2', label: 'Container', detail: 'Isolated processes on host kernel' },
        { id: 'v3', label: 'Namespaces', detail: 'PID, net, mount isolation' },
        { id: 'v4', label: 'cgroups', detail: 'CPU/memory limits' },
      ],
    },
    concept: {
      definition:
        'Containers isolate processes using Linux namespaces and control resources with cgroups. VMs virtualize hardware and run a separate kernel.',
      internals: [
        'PID namespace: process IDs inside the container look local.',
        'Network namespace: the container has its own interfaces and localhost.',
        'Mount namespace: the container sees its own root filesystem from the image.',
        'cgroups: Docker can cap memory/CPU so one RAG job cannot starve the host.',
      ],
      terms: [
        { term: 'Namespace', meaning: 'Kernel feature that scopes what a process can see.' },
        { term: 'cgroup', meaning: 'Kernel feature that limits/accounting CPU, memory, I/O.' },
      ],
      analogyLimit: 'On Windows/macOS Desktop, Linux containers still run inside a lightweight VM — the developer experience is container-like, the host implementation still uses virtualization underneath.',
    },
    example: {
      title: 'Inspect isolation quickly',
      files: [],
      commands: [
        'docker run --rm python:3.12-slim python -c "import os; print(os.getpid())"',
        'docker run --rm --memory=256m python:3.12-slim python -c "print(\'capped\')"',
      ],
      expected: ['PID inside container often looks like 1 for the main process', 'memory flag is accepted without booting a guest OS'],
      lineNotes: ['--memory demonstrates cgroup limits without teaching full cgroup internals.'],
    },
    genai: {
      title: 'Why GenAI APIs love containers more than VMs for day-to-day work',
      fastapi: 'Rebuild and boot a FastAPI image in seconds while iterating on prompts and routers.',
      flaskNote: 'Same benefit for Flask workers — fast recreate beats VM snapshots for local demos.',
      flow: [
        { id: 'g1', label: 'Change code', detail: 'Edit a route' },
        { id: 'g2', label: 'Rebuild layer', detail: 'Only late layers invalidate' },
        { id: 'g3', label: 'Run', detail: 'New container in seconds' },
      ],
      code: [],
    },
    practice: {
      prediction: {
        question: 'Which statement is accurate?',
        choices: [
          'Every container includes its own Linux kernel',
          'Containers share the host kernel and isolate process views with namespaces',
          'Docker images cannot set memory limits',
          'VMs are always faster to start than containers',
        ],
        answerIndex: 1,
        explanation: 'Containers isolate with namespaces and share the host kernel.',
      },
      exercise: {
        title: 'Name the terms',
        prompt: 'Match Dockerfile, image, container, registry to recipe, artifact, running instance, remote store.',
        hints: ['Recipe → Dockerfile', 'Artifact → image'],
        checkPrompt: 'All four mappings correct.',
        solution: 'Dockerfile=recipe, image=artifact, container=running instance, registry=remote store.',
      },
      handsOn: {
        title: 'Core CLI fluency',
        commands: ['docker ps -a', 'docker images', 'docker logs <id>', 'docker inspect <id>'],
        verify: 'You can list containers/images and read one inspect JSON blob without fear.',
      },
    },
  },
]

function lessonShell(
  partial: Omit<(typeof m1Lessons)[0], 'moduleId' | 'practice' | 'example' | 'genai' | 'visual' | 'concept' | 'story' | 'duration'> &
    Partial<(typeof m1Lessons)[0]>,
): (typeof m1Lessons)[0] {
  return {
    duration: '20 min',
    story: {
      title: partial.title,
      scene: 'You hit a Docker problem while shipping a FastAPI GenAI service.',
      pain: 'Without a clear mental model, trial-and-error burns hours.',
    },
    visual: {
      title: 'Visual flow',
      before: ['Broken or unclear workflow'],
      after: ['Clear Docker-backed workflow'],
      flow: [
        { id: 'a', label: 'Understand', detail: 'Name the concept' },
        { id: 'b', label: 'Build', detail: 'Apply with a Dockerfile/Compose change' },
        { id: 'c', label: 'Verify', detail: 'curl, logs, inspect' },
      ],
    },
    concept: {
      definition: partial.title,
      internals: ['Learn the behavior', 'Connect it to FastAPI/GenAI', 'Verify with a small experiment'],
      terms: [],
    },
    example: {
      title: 'Minimal example',
      files: [],
      commands: ['docker ps'],
      expected: ['You can relate the command to the concept'],
      lineNotes: [],
    },
    genai: {
      title: 'GenAI application',
      fastapi: 'Use this concept while containerizing FastAPI services.',
      flaskNote: 'Flask differs mainly in the process launcher (gunicorn/flask run).',
      flow: [
        { id: '1', label: 'API', detail: 'FastAPI process' },
        { id: '2', label: 'Docker', detail: 'Packaging and runtime' },
      ],
      code: [],
    },
    practice: {
      prediction: {
        question: `What is the key takeaway of “${partial.title}”?`,
        choices: ['Ignore logs', 'Understand the mechanism then verify with a small experiment', 'Always use Kubernetes first', 'Never pin dependencies'],
        answerIndex: 1,
        explanation: 'Concept → small experiment → verification is the Docker learning loop.',
      },
      exercise: {
        title: 'Apply it',
        prompt: `Write one sentence on how “${partial.title}” changes your FastAPI deployment checklist.`,
        hints: ['Think about reproducibility, networking, or persistence'],
        checkPrompt: 'Sentence mentions a concrete Docker artifact or command.',
        solution: 'Example: pin base image digests and publish ports explicitly for every GenAI API container.',
      },
      handsOn: {
        title: 'Try one command',
        commands: ['docker version'],
        verify: 'Client/Server sections print without errors.',
      },
    },
    ...partial,
    moduleId: partial.moduleId,
    id: partial.id,
    order: partial.order,
    title: partial.title,
  } as (typeof m1Lessons)[0]
}

export const DOCKER_MODULES: DockerModule[] = [
  {
    id: 'm1',
    number: 1,
    title: 'Docker fundamentals',
    goal: 'Explain why containers help, compare containers with VMs, and use build/run/ps/logs/exec/inspect confidently.',
    lessons: m1Lessons,
    mastery: {
      concept: {
        q: 'What is the difference between an image and a container?',
        a: 'An image is an immutable artifact. A container is a running (or stopped) instance created from that image.',
      },
      debugging: {
        q: 'docker run prints nothing useful and exits immediately. What do you check first?',
        a: 'docker ps -a for the exited container, then docker logs <id>, then the exit code from docker inspect.',
      },
      interview: {
        q: 'Why do teams containerize FastAPI GenAI services even before Kubernetes?',
        a: 'Reproducible runtimes, faster onboarding, identical local/CI/prod artifacts, and simpler dependency isolation for RAG stacks.',
      },
    },
  },
  {
    id: 'm2',
    number: 2,
    title: 'Containerize a Python API',
    goal: 'Write Dockerfiles for FastAPI/Flask, use .dockerignore, bind 0.0.0.0, and publish ports correctly.',
    lessons: [
      lessonShell({
        id: 'dockerfile-fastapi',
        moduleId: 'm2',
        order: 1,
        title: 'Your first production-shaped Dockerfile for FastAPI',
        labId: 'layer-explorer',
        story: {
          title: 'COPY . . copied the venv into the image',
          scene:
            'A teammate wrote COPY . . and accidentally shipped a local virtualenv, __pycache__, and a .env with an OpenAI key into the image.',
          pain: 'Images became huge and secrets leaked into the registry history.',
        },
        concept: {
          definition:
            'A Dockerfile should install dependencies deliberately, copy only what the runtime needs, expose the service port, and start the process with CMD/ENTRYPOINT.',
          internals: [
            'RUN creates a new layer with filesystem changes.',
            'COPY/ADD bring files into the image.',
            'CMD is the default command; ENTRYPOINT wraps or hardens the executable form.',
            '.dockerignore prevents junk and secrets from entering the build context.',
          ],
          terms: [
            { term: 'Build context', meaning: 'Files sent to the daemon when you run docker build.' },
            { term: '.dockerignore', meaning: 'Patterns excluded from the build context.' },
          ],
        },
        example: {
          title: 'Safe FastAPI Dockerfile skeleton',
          files: [
            {
              path: '.dockerignore',
              language: 'text',
              code: `.venv\n__pycache__\n.git\n.env\n*.pyc\n.pytest_cache\n`,
            },
            {
              path: 'Dockerfile',
              language: 'dockerfile',
              code: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
            },
          ],
          commands: ['docker build -t resume-api:m2 .', 'docker run --rm -p 8000:8000 resume-api:m2'],
          expected: ['Image builds without copying .venv', '/health works on localhost:8000'],
          lineNotes: [
            'Never COPY .env into the image.',
            'Bind 0.0.0.0 inside containers or host traffic cannot reach the app.',
          ],
        },
      }),
      lessonShell({
        id: 'fastapi-vs-flask-launch',
        moduleId: 'm2',
        order: 2,
        title: 'FastAPI vs Flask process launching in containers',
        concept: {
          definition:
            'Framework choice changes the process manager, not the Docker networking rules. Both must listen on 0.0.0.0 and publish ports.',
          internals: [
            'FastAPI common pattern: uvicorn or gunicorn+uvicorn workers.',
            'Flask common pattern: gunicorn -b 0.0.0.0:8000.',
          ],
          terms: [{ term: 'CMD', meaning: 'Default command for the container.' }],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'Why bind Uvicorn to 0.0.0.0 in Docker?',
        a: '127.0.0.1 is only reachable inside the container network namespace. 0.0.0.0 accepts published host traffic.',
      },
      debugging: {
        q: 'Build context is 1GB+. What do you check?',
        a: '.dockerignore missing .venv/node_modules/.git; stop COPY . . of junk.',
      },
      interview: {
        q: 'CMD vs ENTRYPOINT?',
        a: 'ENTRYPOINT sets the executable; CMD supplies default args. Together they define how the container starts and what can be overridden.',
      },
    },
  },
  {
    id: 'm3',
    number: 3,
    title: 'Build faster, smaller images',
    goal: 'Order layers for cache hits, use multi-stage builds wisely, pin deps, and shrink images.',
    lessons: [
      lessonShell({
        id: 'layer-caching',
        moduleId: 'm3',
        order: 1,
        title: 'Why editing app.py should not reinstall dependencies',
        labId: 'layer-explorer',
        concept: {
          definition:
            'Docker caches layers. Put rarely changed instructions first. Copy requirements and RUN pip install before copying application source.',
          internals: [
            'Changing a layer invalidates it and every later layer.',
            'Multi-stage builds compile/build in one stage and copy artifacts into a slim runtime stage.',
          ],
          terms: [
            { term: 'Cache bust', meaning: 'A file/instruction change that forces rebuild of later layers.' },
            { term: 'Multi-stage', meaning: 'Multiple FROM stages; copy only final artifacts forward.' },
          ],
        },
      }),
      lessonShell({
        id: 'slim-base-images',
        moduleId: 'm3',
        order: 2,
        title: 'Choosing python:slim vs distroless vs full',
        concept: {
          definition:
            'Smaller bases reduce attack surface and pull time. GenAI APIs often use python:3.12-slim unless native builds need compilers.',
          internals: [
            'Pin versions in requirements.txt or use hashes for stronger reproducibility.',
            'Avoid building wheels with gcc in the final runtime image — use multi-stage if needed.',
          ],
          terms: [],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'You change only app/main.py. Which layer should rebuild?',
        a: 'The COPY app layer and anything after it — not the pip install layer, if requirements were copied earlier.',
      },
      debugging: {
        q: 'Every code tweak reinstalls torch and takes 10 minutes. Cause?',
        a: 'requirements install layer is after COPY . . or requirements are mixed into a frequently changing context.',
      },
      interview: {
        q: 'When are multi-stage builds worth it for GenAI APIs?',
        a: 'When you need build tools/compilers or large build-time assets but want a lean runtime image without those tools.',
      },
    },
  },
  {
    id: 'm4',
    number: 4,
    title: 'Files, configuration, and secrets',
    goal: 'Use bind mounts, volumes, env vars, and runtime secrets correctly — especially LLM API keys.',
    lessons: [
      lessonShell({
        id: 'mounts-and-volumes',
        moduleId: 'm4',
        order: 1,
        title: 'What survives when a container is replaced?',
        labId: 'storage-lab',
        concept: {
          definition:
            'Container filesystem is ephemeral. Bind mounts map host paths for live code. Named volumes persist managed data like indexes.',
          internals: [
            'Replace/recreate container → ephemeral writes vanish unless stored on a mount/volume.',
            'LLM API keys should be runtime env/secrets, never COPY’d into layers.',
          ],
          terms: [
            { term: 'Bind mount', meaning: 'Host path mounted into the container.' },
            { term: 'Named volume', meaning: 'Docker-managed persistent storage.' },
          ],
        },
      }),
      lessonShell({
        id: 'secrets-for-llm-keys',
        moduleId: 'm4',
        order: 2,
        title: 'Injecting LLM credentials at runtime',
        concept: {
          definition:
            'Pass OPENAI_API_KEY (or similar) with -e/--env-file or a secret manager integration. Rotate without rebuilding images.',
          internals: [
            'Image history can retain deleted secret files if they were ever COPY’d/ADD’d.',
            'Prefer mock providers in CI and local CPU labs.',
          ],
          terms: [{ term: 'Runtime secret', meaning: 'Credential supplied when the container starts, not baked into the image.' }],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'Where should a RAG index live if containers are replaced daily?',
        a: 'In a named volume or external object store — not only the container writable layer.',
      },
      debugging: {
        q: 'Key works locally but containerized API returns 401 from the provider.',
        a: 'Env var not passed into the container, wrong variable name, or empty --env-file.',
      },
      interview: {
        q: 'Why is baking model API keys into images a production incident waiting to happen?',
        a: 'Images are copied, cached, and often widely pullable; secrets in layers are hard to erase and easy to leak.',
      },
    },
  },
  {
    id: 'm5',
    number: 5,
    title: 'Connect services with Docker Compose',
    goal: 'Run API + vector DB, use service DNS names, and understand readiness vs startup order.',
    lessons: [
      lessonShell({
        id: 'compose-fastapi-qdrant',
        moduleId: 'm5',
        order: 1,
        title: 'FastAPI + vector database with Compose',
        labId: 'compose-network',
        concept: {
          definition:
            'Compose defines multi-container apps. Services reach each other by service name on a shared network. localhost inside a container means that container.',
          internals: [
            'depends_on controls start order, not application readiness.',
            'Use healthchecks and retry/backoff in clients for DB readiness.',
          ],
          terms: [
            { term: 'Service name DNS', meaning: 'api can call http://qdrant:6333 using Compose DNS.' },
          ],
        },
        example: {
          title: 'Minimal compose snippet',
          files: [
            {
              path: 'compose.yaml',
              language: 'yaml',
              code: `services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      QDRANT_URL: http://qdrant:6333
    depends_on:
      - qdrant
  qdrant:
    image: qdrant/qdrant:v1.11.3
    ports: ["6333:6333"]
    volumes:
      - qdrant_data:/qdrant/storage
volumes:
  qdrant_data:
`,
            },
          ],
          commands: ['docker compose up --build', 'curl http://localhost:8000/health'],
          expected: ['api and qdrant become running', 'API can resolve host qdrant'],
          lineNotes: ['QDRANT_URL uses the service name, not localhost.'],
        },
      }),
      lessonShell({
        id: 'when-to-add-a-worker',
        moduleId: 'm5',
        order: 2,
        title: 'When a background worker earns its place',
        concept: {
          definition:
            'Add a worker when embedding/indexing or long extraction jobs would block API request latency. Share the same image with a different command.',
          internals: ['API handles HTTP. Worker consumes a queue/jobs. Both can mount the same volume or talk to the same DB.'],
          terms: [],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'Why does http://localhost:6333 fail from inside the API container when Qdrant is another service?',
        a: 'localhost is the API container itself. Use the Compose service name.',
      },
      debugging: {
        q: 'depends_on finished but API still crashes connecting to Qdrant.',
        a: 'DB process started but wasn’t ready — need healthcheck/retries, not only start order.',
      },
      interview: {
        q: 'When would you add a worker to a resume RAG stack?',
        a: 'When embedding/indexing or bulk extraction is too slow/expensive to run inline on request threads.',
      },
    },
  },
  {
    id: 'm6',
    number: 6,
    title: 'Run GenAI workloads',
    goal: 'Containerize extraction/RAG flows, mock providers, persist indexes, and understand model-weight trade-offs.',
    lessons: [
      lessonShell({
        id: 'mock-llm-provider',
        moduleId: 'm6',
        order: 1,
        title: 'Ship a mock LLM provider so labs run on CPU',
        concept: {
          definition:
            'Define an LLM interface with MockProvider and HostedProvider. Default local/dev to mock so no paid credentials are required.',
          internals: [
            'Swap providers with env like LLM_PROVIDER=mock|hosted.',
            'Persist RAG indexes in volumes so recreate does not wipe embeddings.',
          ],
          terms: [{ term: 'Provider interface', meaning: 'Abstraction over mock/hosted/local model backends.' }],
        },
      }),
      lessonShell({
        id: 'weights-in-image-vs-runtime',
        moduleId: 'm6',
        order: 2,
        title: 'Model weights in the image vs loaded at runtime',
        concept: {
          definition:
            'Baking weights makes images huge and slow to pull. Runtime download/mount is more flexible. Local GPU inference needs host drivers/runtime prerequisites.',
          internals: [
            'Prefer hosted LLM APIs for most app containers.',
            'If self-hosting models, mount model caches as volumes.',
          ],
          terms: [],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'Why keep a mock provider in a GenAI Docker course/CI?',
        a: 'Deterministic, free, CPU-friendly verification of the app wiring without external APIs.',
      },
      debugging: {
        q: 'Hosted provider works on laptop env but times out in container.',
        a: 'DNS/egress limits, missing proxy env, too-low timeouts, or blocked outbound network policy.',
      },
      interview: {
        q: 'Should embedding model weights live in the API image?',
        a: 'Usually no for large models — prefer volume/cache or remote embedding API to keep images lean and releases fast.',
      },
    },
  },
  {
    id: 'm7',
    number: 7,
    title: 'Debug Docker systematically',
    goal: 'Diagnose build failures, port conflicts, exits, networking bugs, permissions, OOM, and lost data.',
    lessons: [
      lessonShell({
        id: 'debug-loop',
        moduleId: 'm7',
        order: 1,
        title: 'A repeatable Docker debugging loop',
        labId: 'debug-lab',
        concept: {
          definition:
            'Reproduce → gather artifacts (logs, exit code, inspect, events) → form one hypothesis → run the smallest experiment → confirm.',
          internals: [
            'Failed build: read the failing RUN layer.',
            'Exited container: docker ps -a, logs, inspect State.ExitCode.',
            'Unreachable service: bind address, publish mapping, firewall, Compose DNS.',
          ],
          terms: [{ term: 'Exit code', meaning: 'Process status; non-zero usually means crash/failure.' }],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'Name three signals you collect before changing code.',
        a: 'Logs, exit code/inspect state, and one reproduction command with clear expected output.',
      },
      debugging: {
        q: 'Healthy container, empty response from browser, curl inside container works.',
        a: 'Publish/mapping or host firewall issue — path breaks between host and container NIC.',
      },
      interview: {
        q: 'How do you debug slow RAG responses when the API healthcheck is green?',
        a: 'Trace timings across embed/search/LLM, check DB readiness/network, resource limits, cold caches, and provider latency — health only proves process liveness.',
      },
    },
  },
  {
    id: 'm8',
    number: 8,
    title: 'Prepare for production',
    goal: 'Non-root users, scanning, resource limits, healthchecks, CI build/push/rollback, and knowing when orchestration is needed.',
    lessons: [
      lessonShell({
        id: 'prod-hardening',
        moduleId: 'm8',
        order: 1,
        title: 'Hardening a FastAPI GenAI image',
        concept: {
          definition:
            'Run as non-root, drop secrets from images, add HEALTHCHECK, set memory/CPU limits, handle SIGTERM for graceful shutdown.',
          internals: [
            'Compose can be enough for single-host/staging.',
            'Orchestrators help with multi-host scheduling, self-healing at scale, and complex rollouts.',
          ],
          terms: [
            { term: 'Healthcheck', meaning: 'Command that tells Docker if the process is healthy.' },
            { term: 'Rollback', meaning: 'Redeploy the previous image tag/digest when a release fails.' },
          ],
        },
      }),
      lessonShell({
        id: 'ci-build-push',
        moduleId: 'm8',
        order: 2,
        title: 'Build, tag, push, and roll back',
        concept: {
          definition:
            'CI builds immutable tags (git sha), pushes to a registry, deploys by digest/tag, and keeps the previous tag for rollback.',
          internals: ['Prefer digest pins in production for bit-for-bit reproducibility.'],
          terms: [],
        },
      }),
    ],
    mastery: {
      concept: {
        q: 'When is Compose enough?',
        a: 'Single host or simple environments where manual/controlled scaling and restart policies are acceptable.',
      },
      debugging: {
        q: 'New release is live but behavior matches the old bug.',
        a: 'Wrong tag pulled/cached, deploy didn’t update digest, or traffic still hits old tasks.',
      },
      interview: {
        q: 'How do you protect LLM credentials in CI/CD?',
        a: 'Store in a secret manager, inject at runtime/deploy time, never commit or COPY into images, rotate regularly, least privilege scopes.',
      },
    },
  },
]

export const DOCKER_CAPSTONE = {
  title: 'Capstone: Dockerized FastAPI resume extraction + RAG',
  subtitle: 'Grow one project across the whole course — then repair a broken deployment.',
  stages: [
    {
      id: 's1',
      title: 'Stage 1 — API + mock LLM',
      tasks: [
        'FastAPI app accepts resume text and returns validated JSON',
        '/health endpoint',
        'LLM provider interface with working MockProvider',
      ],
    },
    {
      id: 's2',
      title: 'Stage 2 — Dockerfile',
      tasks: [
        'Build and run the API container',
        'Trace host → published port → Uvicorn → FastAPI → response',
      ],
    },
    {
      id: 's3',
      title: 'Stage 3 — Compose + vector DB',
      tasks: [
        'Add Qdrant/pgvector service',
        'Embed synthetic resumes, retrieve passages, answer from context',
        'Prove which data survives container replacement',
      ],
    },
    {
      id: 's4',
      title: 'Stage 4 — optional hosted LLM',
      tasks: [
        'Inject API key at runtime',
        'Diagnose timeout, failed provider call, and invalid structured output',
      ],
    },
    {
      id: 's5',
      title: 'Stage 5 — production prep',
      tasks: [
        'Lean image, non-root user, healthcheck, structured logs',
        'CI builds/pushes versioned image and practices rollback',
      ],
    },
  ],
  finalChallenge: {
    title: 'Broken deployment drill',
    faults: [
      'App binds 127.0.0.1 inside the container',
      'Compose API uses localhost for the vector DB',
      'API key baked into a COPY’d .env layer',
      'Volume path wrong → RAG index appears empty after recreate',
      'depends_on without readiness → intermittent startup crashes',
    ],
    require: [
      'Show how you found each cause',
      'Show the fix',
      'Show the verification command/output',
    ],
  },
}

export function getDockerModule(id: string) {
  return DOCKER_MODULES.find((m) => m.id === id)
}

export function getDockerLesson(moduleId: string, lessonId: string) {
  return getDockerModule(moduleId)?.lessons.find((l) => l.id === lessonId)
}

export function getFirstDockerLesson() {
  return DOCKER_MODULES[0]?.lessons[0]
}
