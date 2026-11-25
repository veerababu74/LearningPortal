# LearnGenAI Portal

Interactive visual learning site for the full GenAI curriculum:

- LLM Concepts
- RAG Engineering
- Agentic AI
- Multi-Agent Orchestration
- LLM Security
- LLM Gateways
- Production Failures

Built with **React + Vite + TypeScript**. Content is generated from the roadmap markdown files in this folder.

## Source roadmaps

Raw curriculum exports live in [`.bin/roadmaps/`](.bin/roadmaps/) (used by `npm run parse`).  
The large PDF is local-only and ignored by git.

## Local development

```bash
npm install
npm run parse   # regenerate curriculum JSON from .bin/roadmaps
npm run dev
```

Open http://localhost:5173

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket (or use Netlify CLI).
2. In Netlify: **Add new site → Import**
3. Build settings are already in `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - SPA redirects: `/* → /index.html`
4. Deploy.

Or with CLI:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

## Learning features

- Animated step-by-step flow diagrams on every lesson
- Scenario labs (choose an action → see outcome)
- Python code panels (plain / LangChain / LangGraph / ADK / Pydantic / SQL when present)
- Knowledge checks + browser progress tracking
- Flagship labs: chunking, cosine similarity, hybrid retrieval, prompt injection, rate limiting, agent loop, multi-agent handoff
