# Architect 2.0 — Technical Stack Plan & Architecture

> Complete engineering blueprint covering frontend, backend, agent infrastructure, deployment, and scaling strategy.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack Summary](#tech-stack-summary)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Design](#database-design)
6. [Agent Infrastructure](#agent-infrastructure)
7. [Real-time & Streaming](#real-time--streaming)
8. [Authentication](#authentication)
9. [Sandbox Architecture](#sandbox-architecture)
10. [Model-Agnostic Layer](#model-agnostic-layer)
11. [GitHub Integration](#github-integration)
12. [Proxy Layer](#proxy-layer)
13. [Deployment Architecture](#deployment-architecture)
14. [Scaling Strategy](#scaling-strategy)
15. [Security Architecture](#security-architecture)
16. [Implementation Plan](#implementation-plan)
17. [Cost Estimate](#cost-estimate)

---

## Overview

Architect 2.0 is a vibe-coding platform that serves both non-technical founders and senior engineers. A user types a natural language prompt and gets a fully scaffolded, deployable agentic application — with a visual canvas for non-technical users and a full IDE for developers.

### Core User Flows

```
Non-Technical User:
Auth → Persona Select → Dashboard → Prompt → Canvas Lens → Deploy

Technical User:
Auth → Persona Select → Dashboard → Prompt → Code Lens → GitHub → Deploy
```

### What Needs to Actually Work (vs Dummy)

| Feature | Status | Why |
|---|---|---|
| Google OAuth + Email auth | Real | Judging plus point |
| Dashboard with real projects | Real | Judging plus point |
| Postgres schema + CRUD | Real | Judging plus point |
| Code streaming (SSE) | Real | Judging plus point |
| Node config persistence | Real | Judging plus point |
| Agent actually executing | Dummy flow | Too complex for demo |
| GitHub push/pull | Dummy flow | OAuth scope complexity |
| Live app preview iframe | Dummy flow | Needs sandbox infra |

---

## Tech Stack Summary

### Demo / Submission Stack

```
Frontend    React 18 + Vite + TypeScript + Tailwind CSS
Backend     FastAPI + Python 3.11
Database    Supabase (Postgres + Auth + Storage)
Cache       Redis (Upstash — serverless)
Real-time   Server-Sent Events (SSE)
Agents      LangGraph + Amazon Bedrock
Sandbox     Modal.com (serverless containers)
Deploy FE   Vercel
Deploy BE   Railway
```

### Production Stack (post-demo)

```
Frontend    React 18 + Vite + TypeScript + Tailwind CSS
Backend     FastAPI on AWS ECS Fargate
Database    AWS RDS Postgres + ElastiCache Redis
Real-time   SSE + WebSockets (AWS API Gateway)
Agents      LangGraph + Amazon Bedrock
Sandbox     AWS ECS Fargate (per-user isolated containers)
CDN         AWS CloudFront
Storage     AWS S3
Auth        Amazon Cognito
Deploy      AWS CDK (Infrastructure as Code)
```

---

## Frontend Architecture

### Stack

```
react 18.3
vite 5.x
typescript 5.x
tailwindcss 3.x
react-router-dom 6.x       — real URL routing
zustand 4.x                — global state
@tanstack/react-query 5.x  — server state + caching
axios                      — HTTP client
@monaco-editor/react       — VS Code editor in Code Lens
@xyflow/react              — draggable agent node canvas
framer-motion              — animations
sonner                     — toast notifications
```

### Project Structure

```
src/
├── main.tsx
├── App.tsx
├── router/
│   └── index.tsx
├── store/
│   ├── useAppStore.ts          # persona, lens, model
│   ├── useProjectStore.ts      # projects list
│   └── useWorkspaceStore.ts    # nodes, chat, streaming
├── pages/
│   ├── AuthPage.tsx
│   ├── OnboardingPage.tsx
│   ├── DashboardPage.tsx
│   ├── WorkspacePage.tsx
│   ├── TemplatesPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Badge.tsx
│   │   └── GradientBorderCard.tsx
│   ├── workspace/
│   │   ├── LensSwitcher.tsx
│   │   ├── CanvasLens.tsx
│   │   ├── HybridLens.tsx
│   │   ├── CodeLens.tsx
│   │   ├── NodeConfigPanel.tsx
│   │   ├── AgentNode.tsx
│   │   ├── ChatAssistant.tsx
│   │   ├── CodeEditor.tsx
│   │   └── Terminal.tsx
│   ├── dashboard/
│   │   ├── PromptBox.tsx
│   │   ├── ProjectCard.tsx
│   │   └── QuickActions.tsx
│   └── modals/
│       ├── DeployModal.tsx
│       └── ImportGithubModal.tsx
├── hooks/
│   ├── useStreamingCode.ts
│   ├── useToast.ts
│   ├── useSSE.ts
│   └── useModelSelector.ts
├── api/
│   ├── client.ts
│   ├── auth.ts
│   ├── projects.ts
│   ├── agents.ts
│   ├── workspace.ts
│   └── templates.ts
└── types/
    ├── project.ts
    ├── agent.ts
    ├── workspace.ts
    └── user.ts
```

### State Management (Zustand)

```typescript
// useAppStore.ts
interface AppStore {
  persona: 'vibe' | 'code'
  currentLens: 'canvas' | 'hybrid' | 'code'
  activeModel: string
  activeModelId: string
  setPersona: (p: 'vibe' | 'code') => void
  setLens: (l: 'canvas' | 'hybrid' | 'code') => void
  setModel: (label: string, id: string) => void
}

// useWorkspaceStore.ts
interface WorkspaceStore {
  projectId: string | null
  nodes: AgentNode[]
  isStreaming: boolean
  streamedLines: string[]
  chatMessages: ChatMessage[]
  addNode: (node: AgentNode) => void
  updateNode: (id: string, config: Partial<AgentNode>) => void
  appendStreamLine: (line: string) => void
  addChatMessage: (msg: ChatMessage) => void
}
```

### Routing

```typescript
// router/index.tsx
const router = createBrowserRouter([
  { path: '/',                    element: <AuthPage /> },
  { path: '/onboarding',          element: <OnboardingPage /> },
  {
    element: <AppShell />,        // authenticated layout wrapper
    children: [
      { path: '/dashboard',       element: <DashboardPage /> },
      { path: '/workspace/:id',   element: <WorkspacePage /> },
      { path: '/templates',       element: <TemplatesPage /> },
      { path: '/settings',        element: <SettingsPage /> },
      { path: '/settings/:tab',   element: <SettingsPage /> },
    ]
  }
])
```

---

## Backend Architecture

### Stack

```
fastapi 0.111
uvicorn[standard]          — ASGI server
pydantic v2                — request/response validation
sqlalchemy 2.0             — ORM
alembic                    — DB migrations
python-jose[cryptography]  — JWT
passlib[bcrypt]            — password hashing
httpx                      — async HTTP client
redis                      — cache + pub/sub
langgraph 0.2              — agent orchestration
langchain-aws              — Bedrock integration
boto3                      — AWS SDK
python-multipart           — file uploads
sse-starlette              — Server-Sent Events
```

### API Routes

```
AUTH
POST   /api/auth/signup
POST   /api/auth/signin
POST   /api/auth/google
POST   /api/auth/refresh
DELETE /api/auth/signout

PROJECTS
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id

SYNTHESIZE
POST   /api/synthesize              — parse prompt, return project scaffold
GET    /api/synthesize/:jobId       — SSE stream of code generation

WORKSPACE
GET    /api/workspace/:id/files     — file tree
GET    /api/workspace/:id/agents    — agent nodes
PUT    /api/workspace/:id/agents/:nodeId  — save node config
POST   /api/workspace/:id/chat      — SSE chat stream
POST   /api/workspace/:id/terminal  — WebSocket terminal

DEPLOY
POST   /api/projects/:id/deploy
GET    /api/projects/:id/deploy/status

TEMPLATES
GET    /api/templates
GET    /api/templates/:id

SETTINGS
GET    /api/settings
PUT    /api/settings/profile
PUT    /api/settings/apikeys
GET    /api/settings/github
DELETE /api/settings/github
```

### FastAPI App Structure

```
backend/
├── main.py
├── core/
│   ├── config.py           # env vars, settings
│   ├── security.py         # JWT, password hashing
│   └── database.py         # SQLAlchemy engine + session
├── routers/
│   ├── auth.py
│   ├── projects.py
│   ├── synthesize.py
│   ├── workspace.py
│   ├── deploy.py
│   └── templates.py
├── models/
│   ├── user.py
│   ├── project.py
│   ├── agent.py
│   └── summary.py
├── schemas/
│   ├── user.py
│   ├── project.py
│   └── agent.py
├── services/
│   ├── intent_parser.py    # parse prompt → structured data
│   ├── scaffold_generator.py
│   ├── agent_runner.py
│   └── deploy_service.py
└── agents/
    ├── graph.py            # LangGraph state machine
    ├── nodes/
    │   ├── planner.py
    │   ├── coder.py
    │   └── evaluator.py
    └── tools/
        ├── file_writer.py
        └── code_executor.py
```

---

## Database Design

### Provider: Supabase (Postgres)

### Schema

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR UNIQUE NOT NULL,
  name        VARCHAR,
  avatar_url  VARCHAR,
  persona     VARCHAR DEFAULT 'vibe',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR NOT NULL,
  description  TEXT,
  framework    VARCHAR NOT NULL,
  prompt       TEXT,
  status       VARCHAR DEFAULT 'active',
  git_repo     VARCHAR,
  git_branch   VARCHAR DEFAULT 'main',
  deploy_url   VARCHAR,
  token_usage  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Agent Nodes
CREATE TABLE agent_nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  name          VARCHAR NOT NULL,
  type          VARCHAR NOT NULL,
  model_id      VARCHAR,
  system_prompt TEXT,
  tools         JSONB DEFAULT '[]',
  memory        BOOLEAN DEFAULT false,
  max_retries   INTEGER DEFAULT 3,
  position_x    FLOAT DEFAULT 0,
  position_y    FLOAT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Project Files
CREATE TABLE project_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  path        VARCHAR NOT NULL,
  content     TEXT,
  language    VARCHAR,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  role        VARCHAR NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Templates
CREATE TABLE templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR NOT NULL,
  description  TEXT,
  framework    VARCHAR NOT NULL,
  category     VARCHAR,
  tags         JSONB DEFAULT '[]',
  scaffold     JSONB,
  is_public    BOOLEAN DEFAULT true
);

-- User Settings
CREATE TABLE user_settings (
  user_id         UUID PRIMARY KEY REFERENCES users(id),
  default_model   VARCHAR DEFAULT 'claude-3-5-sonnet',
  api_keys        JSONB DEFAULT '{}',
  github_token    VARCHAR,
  notifications   JSONB DEFAULT '{}'
);
```

---

## Agent Infrastructure

### LangGraph State Machine

```python
from typing import TypedDict, List, Annotated
from langgraph.graph import StateGraph, END

class ArchitectState(TypedDict):
    prompt: str
    intent: dict
    framework: str
    scaffold: dict
    files: List[dict]
    errors: List[str]
    retry_count: int

def build_architect_graph():
    graph = StateGraph(ArchitectState)

    graph.add_node("intent_parser",    intent_parser_node)
    graph.add_node("framework_picker", framework_picker_node)
    graph.add_node("scaffolder",       scaffolder_node)
    graph.add_node("code_generator",   code_generator_node)
    graph.add_node("validator",        validator_node)

    graph.set_entry_point("intent_parser")
    graph.add_edge("intent_parser",    "framework_picker")
    graph.add_edge("framework_picker", "scaffolder")
    graph.add_edge("scaffolder",       "code_generator")
    graph.add_conditional_edges(
        "validator",
        lambda s: "code_generator" if s["retry_count"] < 3
                  and s["errors"] else END
    )
    return graph.compile()
```

### Model Router (Model-Agnostic Layer)

```python
# services/model_router.py

MODEL_REGISTRY = {
    "claude-3-5-sonnet": {
        "provider": "bedrock",
        "model_id": "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "max_tokens": 8192,
    },
    "gpt-4o": {
        "provider": "openai",
        "model_id": "gpt-4o",
        "max_tokens": 8192,
    },
    "gemini-1.5-pro": {
        "provider": "google",
        "model_id": "gemini-1.5-pro",
        "max_tokens": 8192,
    },
    "llama-3.1-70b": {
        "provider": "bedrock",
        "model_id": "meta.llama3-1-70b-instruct-v1:0",
        "max_tokens": 4096,
    },
}

def get_llm(model_key: str, user_api_keys: dict):
    config = MODEL_REGISTRY[model_key]
    if config["provider"] == "bedrock":
        return ChatBedrock(model_id=config["model_id"])
    elif config["provider"] == "openai":
        return ChatOpenAI(model=config["model_id"],
                         api_key=user_api_keys.get("openai"))
    elif config["provider"] == "google":
        return ChatGoogleGenerativeAI(model=config["model_id"],
                                      google_api_key=user_api_keys.get("google"))
```

---

## Real-time & Streaming

### Server-Sent Events (SSE) for Code Streaming

```python
# routers/synthesize.py
from sse_starlette.sse import EventSourceResponse

@router.get("/synthesize/{job_id}")
async def stream_synthesis(job_id: str, user=Depends(get_current_user)):
    async def event_generator():
        async for chunk in run_synthesis_stream(job_id):
            yield {
                "event": "code_chunk",
                "data": json.dumps({
                    "file": chunk.file_path,
                    "line": chunk.line,
                    "content": chunk.content
                })
            }
        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())
```

```typescript
// hooks/useSSE.ts
export function useSSE(url: string) {
  const [lines, setLines] = useState<string[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    const es = new EventSource(url)
    es.addEventListener('code_chunk', (e) => {
      const data = JSON.parse(e.data)
      setLines(prev => [...prev, data.content])
    })
    es.addEventListener('done', () => {
      setDone(true)
      es.close()
    })
    return () => es.close()
  }, [url])

  return { lines, done }
}
```

### WebSocket for Terminal

```python
# routers/workspace.py
@router.websocket("/workspace/{project_id}/terminal")
async def terminal_ws(ws: WebSocket, project_id: str):
    await ws.accept()
    async with sandbox.create_session(project_id) as session:
        while True:
            cmd = await ws.receive_text()
            output = await session.run(cmd)
            await ws.send_text(output)
```

---

## Authentication

### Provider: Supabase Auth

```typescript
// api/auth.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google' })

export const signInWithEmail = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email: string, password: string) =>
  supabase.auth.signUp({ email, password })
```

```python
# FastAPI JWT verification
from jose import jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
    user_id = payload.get("sub")
    return await get_user_by_id(user_id)
```

---

## Sandbox Architecture

### Demo: Modal.com

```python
import modal

app = modal.App("architect-sandbox")
image = modal.Image.debian_slim().pip_install(
    "langgraph", "pydantic-ai", "crewai", "fastapi"
)

@app.function(image=image, timeout=300)
async def run_agent(code: str, framework: str, env: dict):
    exec_globals = {"__builtins__": __builtins__}
    exec(code, exec_globals)
    result = await exec_globals["main"]()
    return result
```

### Production: AWS ECS Fargate (per-user isolated)

```
User submits prompt
        ↓
SQS receives job
        ↓
ECS task spins up (isolated container per user)
        ↓
Agent runs inside container
        ↓
Output streamed back via SSE
        ↓
Container terminates after job completes
```

Each container:
- 1 vCPU, 2GB RAM (default)
- 15 min max execution time
- No network access to other containers
- Reads/writes only to user's S3 prefix

---

## GitHub Integration

### OAuth Flow

```
1. User clicks "Connect GitHub" in Settings
2. Frontend redirects to:
   https://github.com/login/oauth/authorize
   ?client_id=GITHUB_CLIENT_ID
   &scope=repo,read:user
   &state=<csrf_token>

3. GitHub redirects back to:
   /api/auth/github/callback?code=xxx&state=xxx

4. Backend exchanges code for access token
5. Token encrypted and stored in user_settings.github_token
6. Frontend shows connected state
```

### Import Flow

```python
# services/github_service.py
async def import_repo(repo_url: str, branch: str, user_id: str):
    token = await get_github_token(user_id)
    repo = parse_repo_url(repo_url)

    # Clone via GitHub API (no git binary needed)
    files = await fetch_repo_tree(repo, branch, token)

    # Store files in DB
    project = await create_project_from_repo(repo, user_id)
    await bulk_insert_files(project.id, files)

    # Detect stack
    stack = detect_stack(files)
    return {"project_id": project.id, "stack": stack}
```

---

## Proxy Layer

The proxy sits between the frontend and the agent sandboxes. It handles:

```
Frontend
    ↓
API Gateway (proxy entry point)
    ↓ routes based on project_id
    ├── /api/*          → FastAPI backend
    ├── /ws/*           → WebSocket server
    ├── /preview/:id/*  → User's running app (sandbox)
    └── /stream/:id     → SSE stream
```

### What the proxy does

- **Auth enforcement** — every request must carry a valid JWT
- **Rate limiting** — 10 req/s per user on agent endpoints
- **Sandbox routing** — maps `project_id` to the correct container URL
- **Preview isolation** — serves user's running app on a subdomain without exposing the sandbox directly
- **Request logging** — every agent call logged to CloudWatch

```nginx
# nginx proxy config (simplified)
location /preview/ {
    proxy_pass http://sandbox-router:8080;
    proxy_set_header X-Project-Id $project_id;
    proxy_set_header Authorization $http_authorization;
}

location /stream/ {
    proxy_pass http://sse-server:8001;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
}
```

---

## Deployment Architecture

### Demo Deployment

```
Frontend  → Vercel (push to main = auto deploy)
Backend   → Railway (Dockerfile auto-detected)
Database  → Supabase (managed Postgres)
Cache     → Upstash Redis (serverless)
Agents    → Modal.com (serverless containers)
```

### Production Deployment (AWS)

```
                    ┌─────────────────┐
                    │   CloudFront    │
                    │   (CDN + WAF)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌─────▼──────┐ ┌───▼────────────┐
     │  S3 (React    │ │ API Gateway│ │ ALB (WebSocket) │
     │   static)     │ │ (REST+SSE) │ │                 │
     └───────────────┘ └─────┬──────┘ └───┬─────────────┘
                             │             │
                    ┌────────▼─────────────▼────────┐
                    │      ECS Fargate Cluster       │
                    │   ┌──────────┐ ┌───────────┐  │
                    │   │ FastAPI  │ │  Agent    │  │
                    │   │ Service  │ │ Workers   │  │
                    │   └────┬─────┘ └─────┬─────┘  │
                    └────────┼─────────────┼─────────┘
                             │             │
              ┌──────────────┼─────────────┼──────────────┐
              │              │             │              │
     ┌────────▼──────┐ ┌─────▼──────┐ ┌───▼──────┐ ┌────▼────┐
     │  RDS Postgres │ │ElastiCache │ │   SQS    │ │   S3    │
     │               │ │   Redis    │ │  Queue   │ │ Storage │
     └───────────────┘ └────────────┘ └──────────┘ └─────────┘
```

### architect.yaml (deployment config)

```yaml
app:
  name: architect-2.0
  version: 2.0.0

frontend:
  framework: react
  build_cmd: npm run build
  output_dir: dist
  deploy: vercel

backend:
  framework: fastapi
  runtime: python3.11
  deploy: railway
  env_file: .env

database:
  provider: supabase
  migrations: alembic

agents:
  sandbox: modal
  framework: langgraph
  default_model: claude-3-5-sonnet
```

---

## Scaling Strategy

### Horizontal Scaling

```
Each layer scales independently:

Frontend    → Vercel edge network (auto, global)
API         → ECS Fargate tasks (scale on CPU > 70%)
Agent jobs  → ECS workers (scale on SQS queue depth > 10)
Database    → RDS read replicas for dashboard queries
Cache       → Redis cluster mode
```

### Per-User Isolation

```
Each user's agent run gets:
- Isolated ECS Fargate container
- Dedicated S3 prefix (user_id/project_id/*)
- Rate-limited API access (10 req/s)
- Max 15 min execution timeout
- 1 vCPU + 2GB RAM (upgradeable per plan)
```

### Queue-Based Job Processing

```
User submits prompt
        ↓
POST /api/synthesize → returns job_id immediately (202 Accepted)
        ↓
Job pushed to SQS
        ↓
Worker picks up job (auto-scales 1-50 workers based on queue depth)
        ↓
Worker streams output back via Redis pub/sub → SSE to frontend
        ↓
Job complete → result saved to Postgres
```

---

## Security Architecture

```
Layer               Mechanism
─────────────────────────────────────────────────────
Transport           TLS 1.3 everywhere (Vercel + Railway enforce)
Authentication      Supabase JWT (RS256, 1hr expiry)
Authorization       Row-level security in Postgres (per user_id)
API Keys            AES-256 encrypted at rest in Postgres
Sandbox isolation   Each container has no network access to others
Rate limiting       Redis sliding window (10 req/s per user)
CORS                Whitelist frontend domain only
Secrets             Environment variables (never in code)
GitHub tokens       Encrypted with user-specific key before storage
```

---

## Implementation Plan

### Phase 1 — Foundation (Days 1-2)

```
✅ Scaffold React + Vite + TypeScript
✅ Copy HTML screens into page components
✅ Set up React Router — all screens get real URLs
✅ Set up Zustand stores
✅ Supabase project — Postgres + Auth configured
✅ FastAPI skeleton with health check
✅ Deploy frontend to Vercel, backend to Railway
```

### Phase 2 — Auth + Data (Days 3-4)

```
✅ Google OAuth via Supabase
✅ Email/password auth
✅ JWT middleware in FastAPI
✅ Run Alembic migrations
✅ Projects CRUD API
✅ Dashboard loads real projects from API
✅ React Query for data fetching
```

### Phase 3 — Workspace (Days 5-6)

```
✅ SSE streaming endpoint
✅ Code streaming animation connected to real SSE
✅ Agent node config save/load from Postgres
✅ Chat assistant with SSE response streaming
✅ Monaco editor in Code Lens
✅ React Flow canvas in Canvas Lens
```

### Phase 4 — Polish + Ship (Day 7)

```
✅ Template gallery from DB
✅ Settings page — profile + API keys save
✅ Deploy modal with dummy progress
✅ GitHub import modal (dummy flow)
✅ Toast notifications wired throughout
✅ Final Vercel + Railway deploy
✅ Live URL ready for submission
```

---

## Cost Estimate

### Demo / Submission (Monthly)

```
Vercel (Hobby)          Free
Railway (Starter)       $5/month
Supabase (Free tier)    Free
Upstash Redis           Free (10k req/day)
Modal.com               ~$2-5 (pay per second)
─────────────────────────────
Total                   ~$7-10/month
```

### Production (1000 active users/month)

```
AWS ECS Fargate         ~$80/month
AWS RDS Postgres        ~$50/month
AWS ElastiCache Redis   ~$30/month
AWS S3 + CloudFront     ~$20/month
Amazon Bedrock          ~$200/month (usage-based)
AWS SQS                 ~$5/month
─────────────────────────────
Total                   ~$385/month
```

---

## Key Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Frontend framework | React + Vite | Component reuse, real routing, ecosystem |
| Backend framework | FastAPI | Python = same as agents, native async, SSE |
| Auth provider | Supabase | Google OAuth in 10 min, free tier |
| Database | Postgres (Supabase) | JSONB for agent configs, full-text search |
| State management | Zustand | Simpler than Redux, no boilerplate |
| Agent framework | LangGraph | Stateful graph, handles eval retry loops |
| Streaming | SSE | Simpler than WebSockets for one-directional |
| Sandbox (demo) | Modal.com | Zero infra, pay per second |
| Sandbox (prod) | ECS Fargate | Per-user isolation, AWS-native |
| Demo deployment | Vercel + Railway | Push-to-deploy, live URL in minutes |
| Prod deployment | AWS ECS + RDS | Scalable, integrates with Bedrock |

