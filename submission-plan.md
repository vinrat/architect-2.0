# Architect 2.0 — Submission Plan

> Complete record of what's built, what's working, what's pending, and the full roadmap to submission.

---

## Project Overview

Architect 2.0 is a vibe-coding platform for both non-technical founders and senior engineers.
A user types a natural language prompt and gets a fully scaffolded, deployable agentic application.

- Non-technical users get a chat-first visual canvas — no code visible
- Technical users get a full IDE, terminal, and Git integration
- Both can build agents in any framework (LangGraph, CrewAI, PydanticAI, AutoGen)

---

## Repository Structure

```
/Users/vinodkumarsenrayar/Desktop/LYZR/
├── architect-2.0/          ← React frontend (Vite + TypeScript + Tailwind)
├── architect-backend/      ← FastAPI backend (Python + LangGraph + Bedrock)
├── instructions.md         ← Challenge requirements
├── technical-stack-plan.md ← Full architecture doc
├── next-steps.md           ← Original dev checklist
└── submission-plan.md      ← This file
```

---

## Tech Stack

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS with custom dark theme tokens
- Zustand (global state — persona, lens, workspace)
- React Router v6 (real URLs)
- Supabase JS client

### Backend
- FastAPI + Python 3.11
- LangGraph + langchain-aws (ChatBedrockConverse)
- Amazon Bedrock (Claude via inference profiles)
- SSE (Server-Sent Events) for streaming
- python-dotenv, httpx, boto3

### Database & Auth
- Supabase (Postgres + Auth)
- Row Level Security on all tables
- Google OAuth + Email/Password auth

---

## What's Fully Built & Working

### Authentication
- [x] Email + password sign in / sign up
- [x] Google OAuth (configured with real Google Cloud credentials)
- [x] Auth guard in AppShell — unauthenticated users redirected to /
- [x] Session persists across refresh via Supabase onAuthStateChange
- [x] Sign out from Navbar avatar menu
- [x] Error messages shown on bad credentials (no silent fallback)
- [x] Test credentials pre-filled in inputs for demo

### Onboarding
- [x] Persona selection screen shown once per user
- [x] Plain English question: "How do you usually build things?"
  - 🪄 "I describe what I want" → Vibe mode
  - 💻 "I write code myself" → Code mode
- [x] Persona saved to Supabase profiles table
- [x] Persona loaded from Supabase on new device (not just localStorage)
- [x] AppShell redirects to /onboarding if persona not set

### Dashboard
- [x] Real projects loaded from Supabase (not hardcoded)
- [x] Synthesize App creates real project row in DB
- [x] Project cards show real data (name, framework, tokens, time ago)
- [x] Empty state shown when no projects exist
- [x] Navigate to Templates page
- [x] Framework selector (LangGraph, CrewAI, PydanticAI, AutoGen, Custom)
- [x] Loading state on Synthesize button

### Workspace
- [x] Project loaded from Supabase on mount (real name, prompt, framework)
- [x] Persona-aware lens visibility:
  - Vibe users: Assistant + Overview only (no Code lens)
  - Code users: All 3 lenses
- [x] Default lens set by persona (vibe → canvas, code → code)
- [x] Chat history loaded from Supabase chat_messages table
- [x] New chat messages saved to Supabase (user + AI)
- [x] Auto-scroll to latest chat message
- [x] Typing indicator (bouncing dots) while AI responds
- [x] Suggested prompts for vibe users
- [x] Plain English agent steps panel (not technical node names)
- [x] "Curious about the code?" link to Overview lens
- [x] Code Lens: real SSE streaming from FastAPI backend
- [x] Code Lens: loading spinner while Claude generates
- [x] Overview Lens: file structure with plain English labels

### FastAPI Backend
- [x] Health check endpoint: GET /health
- [x] CORS configured for localhost:5173
- [x] OPTIONS preflight handler for SSE endpoint
- [x] POST /api/synthesize — streams Claude-generated agent code via SSE
- [x] GET /api/projects — proxy to Supabase
- [x] POST /api/projects/{id}/deploy — placeholder response
- [x] Bedrock client using AWS session token credentials
- [x] ChatBedrockConverse (correct API for new inference profile IDs)
- [x] Streaming content parser handles list-of-dicts format from Bedrock

### Amazon Bedrock
- [x] Tested all 15 Claude models in us-east-1
- [x] Identified working inference profiles (require us.* prefix)
- [x] Working models confirmed:
  - us.anthropic.claude-haiku-4-5-20251001-v1:0 (fastest, default)
  - us.anthropic.claude-sonnet-4-20250514-v1:0
  - us.anthropic.claude-sonnet-4-5-20250929-v1:0
- [x] check_models.py script to test model access
- [x] BEDROCK_MODEL_ID set to haiku for speed

### Supabase Schema
- [x] profiles table (id, email, name, avatar_url, persona)
- [x] projects table (id, user_id, name, framework, prompt, status, git_branch, token_usage)
- [x] agent_nodes table
- [x] chat_messages table
- [x] Row Level Security on all tables
- [x] handle_new_user trigger (auto-creates profile on signup)
- [x] RLS policies (users can only access their own data)

### Other Pages
- [x] Templates page — grid of starter templates with categories
- [x] Settings page — profile, models, API keys sections (UI complete)
- [x] Navbar — model selector, GitHub button, avatar menu, sign out

---

## What's Pending (To Do Before Submission)

### Priority 1 — Missing UI Flows (Judging Criteria)

#### GitHub Import Modal
- [ ] "Import GitHub Repo" button on Dashboard opens modal
- [ ] User pastes repo URL
- [ ] Scanning animation (detecting framework, reading files)
- [ ] Shows detected: framework, file count, main files
- [ ] "Import Project" button → creates project in DB → navigates to workspace
- [ ] Dummy flow — no real git clone needed for demo

#### Deploy Modal
- [ ] Deploy button in workspace opens modal (not alert())
- [ ] Progress steps: Packaging → Building container → Deploying → Live
- [ ] Animated step-by-step progress
- [ ] Shows fake live URL at end: https://{project-name}.architect.app
- [ ] Copy URL button

#### Settings Page — GitHub Tab
- [ ] GitHub tab in settings shows connect flow
- [ ] "Connect GitHub" button → shows OAuth flow UI (dummy)
- [ ] Once "connected" shows: avatar, username, connected repos count
- [ ] Disconnect button

#### Settings Page — Real Profile Data
- [ ] Load real user name/email from Supabase profiles
- [ ] Save profile changes back to Supabase
- [ ] Show real avatar initial from user name

### Priority 2 — Workspace Improvements

#### Node Config Panel (Canvas Lens)
- [ ] Clicking an agent step opens a config panel
- [ ] Shows: model selector, system prompt textarea, tools checkboxes
- [ ] Save config to agent_nodes table in Supabase

#### Vibe Assistant — Real AI Responses
- [ ] Connect chat sendChat to POST /api/workspace/{id}/chat
- [ ] Backend streams Claude response via SSE
- [ ] Frontend renders streamed response word by word

#### Model Selector — Wire to Backend
- [ ] Navbar model selector change updates which model Bedrock uses
- [ ] Pass selected model ID in synthesize request body

### Priority 3 — Architecture Diagram

- [ ] Create architecture-diagram.png showing all services
- [ ] Services to show:
  - Browser (React)
  - Vercel (CDN)
  - FastAPI on Railway
  - Supabase (Auth + Postgres)
  - Amazon Bedrock (Claude)
  - SSE stream path
  - GitHub (OAuth + API)
  - Future: ECS Fargate sandbox, S3, SQS
- [ ] Add to repo root
- [ ] Reference from technical-stack-plan.md

### Priority 4 — Deployment

#### Frontend → Vercel
- [ ] npm run build passes (currently clean)
- [ ] vercel CLI deploy from architect-2.0/
- [ ] Set env vars in Vercel:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_API_URL (Railway backend URL)
- [ ] Update Supabase redirect URLs to include Vercel domain

#### Backend → Railway
- [ ] Create Procfile: web: uvicorn main:app --host 0.0.0.0 --port $PORT
- [ ] Push architect-backend/ to GitHub
- [ ] Connect Railway to GitHub repo
- [ ] Set env vars in Railway:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_SESSION_TOKEN (note: rotates — need long-lived creds for prod)
  - AWS_REGION
  - BEDROCK_MODEL_ID
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
- [ ] Test /health endpoint on Railway URL

### Priority 5 — Submission Checklist

- [ ] Live URL (Vercel)
- [ ] GitHub repo with all code pushed
- [ ] Architecture diagram in repo
- [ ] technical-stack-plan.md in repo
- [ ] README.md with setup instructions
- [ ] All 8 screens navigable and working

---

## Judging Criteria Mapping

### 🥇 Technical Architecture (Most Important)

| Requirement | Status | Location |
|---|---|---|
| Architecture diagram | ❌ Pending | To create |
| Sandbox explanation | ✅ Done | technical-stack-plan.md |
| Agent harness design | ✅ Done | technical-stack-plan.md + routers/synthesize.py |
| Model-agnostic layer | ✅ Done | technical-stack-plan.md + bedrock.py |
| Frontend ↔ Sandbox flow | ✅ Done | technical-stack-plan.md |
| Proxy layer design | ✅ Done | technical-stack-plan.md |
| GitHub integration design | ✅ Done | technical-stack-plan.md |
| Deployment strategy | ✅ Done | technical-stack-plan.md |
| Scaling strategy | ✅ Done | technical-stack-plan.md |

### 🥇 Design, UI/UX & Flows (Most Important)

| Screen | Status | Notes |
|---|---|---|
| Auth page | ✅ Done | Email + Google, real errors |
| Onboarding | ✅ Done | Plain English, persona saved to DB |
| Dashboard | ✅ Done | Real projects, synthesize flow |
| Workspace — Canvas | ✅ Done | Chat-first, plain English steps |
| Workspace — Overview | ✅ Done | File structure with labels |
| Workspace — Code | ✅ Done | Real streaming from Claude |
| Templates | ✅ Done | Grid with categories |
| Settings | ⚠️ Partial | UI done, data not wired |
| GitHub Import Modal | ❌ Pending | Dummy flow needed |
| Deploy Modal | ❌ Pending | Progress flow needed |

### 🥈 Feature Coverage

| Feature | Status |
|---|---|
| 01 Authentication | ✅ Real (email + Google) |
| 02 Homepage / Dashboard | ✅ Real (Supabase data) |
| 03 Chat window | ✅ Real (saved to DB) |
| 04 App preview | ⚠️ Placeholder in canvas |
| 05 Agent section | ⚠️ Static nodes, config pending |
| 06 UI getting built (streaming) | ✅ Real (Claude via Bedrock SSE) |
| 07 GitHub integration | ❌ Dummy flow pending |
| 08 Deploying the app | ❌ Deploy modal pending |

### 🥉 Working Functionality (Plus Points)

| Item | Status |
|---|---|
| Google Sign-in | ✅ Working |
| Email Sign-in | ✅ Working |
| Real database (Supabase) | ✅ Working |
| Projects CRUD | ✅ Working |
| Chat history persistence | ✅ Working |
| Real AI code generation (Bedrock) | ✅ Working |
| SSE streaming | ✅ Working |

---

## File Reference — Key Files

### Frontend
```
architect-2.0/src/
├── pages/
│   ├── AuthPage.tsx          — Email + Google auth, real Supabase
│   ├── OnboardingPage.tsx    — Persona selection, saved to DB
│   ├── DashboardPage.tsx     — Real projects from Supabase
│   ├── WorkspacePage.tsx     — Chat-first canvas, code lens, overview
│   ├── TemplatesPage.tsx     — Template grid
│   └── SettingsPage.tsx      — Profile, models, API keys
├── components/layout/
│   ├── AppShell.tsx          — Auth guard + persona check
│   └── Navbar.tsx            — Model selector, GitHub, avatar menu
├── store/
│   ├── useAppStore.ts        — persona (null|vibe|code), lens, model
│   └── useWorkspaceStore.ts  — nodes, chat, streaming lines
├── api/
│   ├── auth.ts               — Supabase client, signIn/signUp/signOut
│   ├── client.ts             — Axios with JWT interceptor
│   └── projects.ts           — Project CRUD API calls
└── hooks/
    └── useStreamingCode.ts   — Real SSE fetch to FastAPI
```

### Backend
```
architect-backend/
├── main.py                   — FastAPI app, CORS, router registration
├── bedrock.py                — ChatBedrockConverse client factory
├── routers/
│   ├── synthesize.py         — POST /api/synthesize SSE streaming
│   └── projects.py           — GET /api/projects, POST deploy
├── check_models.py           — Script to test Bedrock model access
└── .env                      — AWS creds, Supabase keys, model ID
```

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://auepxmsodqylqbqpjcxb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_URL=http://localhost:8000
```

### Backend (.env)
```
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_SESSION_TOKEN=<token>
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
SUPABASE_URL=https://auepxmsodqylqbqpjcxb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

---

## How to Run Locally

```bash
# Terminal 1 — Frontend
cd /Users/vinodkumarsenrayar/Desktop/LYZR/architect-2.0
npm run dev
# → http://localhost:5173

# Terminal 2 — Backend
cd /Users/vinodkumarsenrayar/Desktop/LYZR/architect-backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
# → http://localhost:8000

# Test backend
curl http://localhost:8000/health

# Test Bedrock model access
python check_models.py
```

---

## Known Issues & Notes

| Issue | Status | Notes |
|---|---|---|
| AWS session token rotates | ⚠️ | Need long-lived IAM user creds for Railway deploy |
| Chat AI response is hardcoded | ⚠️ | TODO: wire to real Claude via backend |
| Deploy button shows alert() | ⚠️ | Replace with Deploy Modal |
| GitHub button goes to settings | ⚠️ | Replace with Import Modal |
| Settings profile shows hardcoded name | ⚠️ | Wire to Supabase profiles |
| Workspace chat loads duplicate messages on re-render | ⚠️ | Need dedup on addChatMessage |

---

## Recommended Build Order (Remaining Work)

1. GitHub Import Modal (Dashboard) — dummy flow, high visual impact
2. Deploy Modal (Workspace) — animated progress, shows live URL
3. Settings — wire real profile data from Supabase
4. Architecture diagram — #1 judging criterion, 1hr effort
5. Create Procfile + push to GitHub
6. Deploy frontend to Vercel
7. Deploy backend to Railway
8. Update Supabase redirect URLs for production domain
9. Final smoke test on live URL
10. Submit

---

## Submission Deliverables

- [ ] Live URL: https://architect-2-0.vercel.app (pending deploy)
- [ ] GitHub repo: https://github.com/<username>/architect-2.0
- [ ] Architecture diagram: /architecture-diagram.png
- [ ] Architecture doc: /technical-stack-plan.md
- [ ] This plan: /submission-plan.md

---

## Deployment Targets — Lyzr Studio + Bedrock Agents

### The Correct Story

Architect 2.0 is the **builder** — where you design, prompt, and generate agentic apps.
Once built, the user chooses WHERE to deploy their agent.

There are 3 deployment targets:

```
User clicks Deploy in Architect 2.0
        ↓
┌─────────────────────────────────────────────┐
│         Choose Deployment Target            │
│                                             │
│  🟣 Lyzr Studio   ← PRIMARY (Lyzr's own    │
│                     agent runtime platform) │
│                                             │
│  🟠 Bedrock Agents ← AWS-native option      │
│                     (for enterprise/AWS     │
│                      users who want full    │
│                      AWS control)           │
│                                             │
│  ⚫ Self-host       ← Railway / Docker      │
│                     (for developers)        │
└─────────────────────────────────────────────┘
```

**Why this matters for the judges:**
- Lyzr Studio is Lyzr's own product — showing Architect 2.0 feeds INTO Lyzr Studio
  is the whole point of this challenge. It shows the full Lyzr ecosystem.
- Bedrock Agents shows AWS depth and enterprise thinking.
- Self-host shows developer flexibility.

---

### The Full Flow to Showcase

```
User in Architect 2.0
        │
        │  1. Types prompt: "Build a PDF summarizer that monitors
        │     Google Drive and emails summaries daily"
        │
        ▼
  Architect 2.0 generates:
  ├── agents.py          (LangGraph / CrewAI / PydanticAI code)
  ├── tools.py           (Google Drive, email, PDF tools)
  ├── requirements.txt
  ├── lyzr.config.json   ← Lyzr Studio runtime config
  └── .env.example
        │
        │  2. User clicks "Deploy to Lyzr Studio"
        │
        ▼
  Lyzr Studio receives:
  ├── Agent definitions (name, type, model, system prompt, tools)
  ├── Workflow graph (which agent calls which)
  ├── Runtime config (memory, retries, timeout)
  └── Environment variables
        │
        │  3. Lyzr Studio runs the agent
        │
        ▼
  User sees in Lyzr Studio:
  ├── Agent execution logs
  ├── Tool call traces
  ├── Memory state
  ├── Output / results
  └── Re-prompt to modify behavior
```

---

### lyzr.config.json — The Bridge File

Every project built in Architect 2.0 generates a `lyzr.config.json`.
This is the contract between Architect (builder) and Lyzr Studio (runtime).

```json
{
  "name": "PDF Summarizer Agent",
  "version": "1.0.0",
  "framework": "langgraph",
  "runtime": "lyzr-studio",
  "model": {
    "provider": "bedrock",
    "model_id": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    "max_tokens": 4096,
    "temperature": 0.3
  },
  "agents": [
    {
      "id": "drive-monitor",
      "name": "Drive Monitoring Agent",
      "type": "trigger",
      "description": "Watches Google Drive folder for new PDFs",
      "tools": ["google_drive_list", "google_drive_download"],
      "memory": true,
      "schedule": "0 9 * * *"
    },
    {
      "id": "doc-processor",
      "name": "Document Processing Agent",
      "type": "extractor",
      "description": "Extracts text from PDFs using OCR if needed",
      "tools": ["pdf_extract", "ocr_scan"],
      "memory": false,
      "max_retries": 3
    },
    {
      "id": "analysis-agent",
      "name": "Analysis Agent",
      "type": "analyzer",
      "description": "Identifies key info, risks, action items",
      "tools": ["vector_search", "web_search"],
      "memory": true,
      "model_override": "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
    },
    {
      "id": "summary-agent",
      "name": "Summary Agent",
      "type": "generator",
      "description": "Generates structured executive summary",
      "tools": [],
      "memory": false
    },
    {
      "id": "eval-agent",
      "name": "Quality Evaluation Agent",
      "type": "evaluator",
      "description": "Checks summary for hallucinations",
      "tools": [],
      "memory": false,
      "max_retries": 2
    },
    {
      "id": "notify-agent",
      "name": "Notification Agent",
      "type": "notifier",
      "description": "Sends summary via email or Slack",
      "tools": ["send_email", "slack_post"],
      "memory": false
    }
  ],
  "workflow": [
    { "from": "drive-monitor",  "to": "doc-processor" },
    { "from": "doc-processor",  "to": "analysis-agent" },
    { "from": "analysis-agent", "to": "summary-agent" },
    { "from": "summary-agent",  "to": "eval-agent" },
    { "from": "eval-agent",     "to": "notify-agent",
      "condition": "quality_score >= 0.8" },
    { "from": "eval-agent",     "to": "analysis-agent",
      "condition": "quality_score < 0.8",
      "label": "retry" }
  ],
  "storage": {
    "vector_db": "supabase_pgvector",
    "file_store": "s3"
  },
  "observability": {
    "log_level": "info",
    "trace_tool_calls": true,
    "trace_memory": true
  }
}
```

---

### What to Build in the UI to Show This

#### 1. "Deploy to Lyzr Studio" Button (Workspace)
- Replace the current `alert()` on Deploy button
- Opens a Deploy Modal with two options:
  - Deploy to Lyzr Studio (primary, highlighted)
  - Deploy to Railway/Vercel (secondary)
- Lyzr Studio option shows the `lyzr.config.json` preview
- "Deploy" button → animated progress → shows Lyzr Studio URL

#### 2. Runtime Config Panel (Canvas Lens — each agent node)
When a vibe user clicks an agent step, show:
- Model selector (which Claude/GPT/Gemini to use for THIS agent)
- Memory toggle (does this agent remember past runs?)
- Max retries spinner
- Tools checklist (what can this agent do?)
- System prompt textarea
- These save to `agent_nodes` table AND update `lyzr.config.json`

#### 3. "View in Lyzr Studio" Link (after deploy)
- After deploy animation completes
- Show: "Your agent is live on Lyzr Studio →"
- Link opens Lyzr Studio with the agent loaded
- Show a mock Lyzr Studio execution view inside Architect
  (iframe or screenshot showing agent logs, tool traces)

#### 4. Import from Lyzr Studio (Dashboard)
- "Import from Lyzr Studio" quick action on Dashboard
- User pastes Lyzr Studio agent URL or ID
- Architect pulls the `lyzr.config.json` and reconstructs
  the visual canvas + code
- Lets them modify and re-deploy

---

### The Demo Script (What to Show Judges)

```
1. Open Architect 2.0
2. Login with Google
3. Type: "Build a PDF summarizer that monitors Google Drive
          and emails summaries daily"
4. Select framework: LangGraph
5. Click Synthesize App
   → Project created in DB
   → Navigate to Workspace

6. Canvas Lens (Vibe Mode):
   → Show 6 agent steps in plain English
   → Click each step to show Runtime Config panel
   → Show model selector per agent
   → Show memory toggle, tools, retries

7. Overview Lens:
   → Show lyzr.config.json tab
   → Show the full agent workflow graph

8. Code Lens (switch to code user):
   → Show Claude streaming real LangGraph Python code
   → Show agents.py, tools.py, requirements.txt

9. Click Deploy → Deploy Modal:
   → Select "Deploy to Lyzr Studio"
   → Show lyzr.config.json preview
   → Click Deploy → animated progress
   → Show: "Live on Lyzr Studio" with link

10. Show Lyzr Studio running the agent
    → Execution logs
    → Tool call traces
    → Summary output
```

---

### What to Add to the DB Schema

Run this in Supabase SQL Editor:

```sql
-- Add Lyzr Studio deployment tracking to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lyzr_agent_id   VARCHAR,
  ADD COLUMN IF NOT EXISTS lyzr_deploy_url VARCHAR,
  ADD COLUMN IF NOT EXISTS deploy_status   VARCHAR DEFAULT 'not_deployed';

-- Store the generated lyzr.config.json per project
CREATE TABLE IF NOT EXISTS public.project_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  config      JSONB NOT NULL,
  version     INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY "Users can manage own configs"
  ON public.project_configs FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.projects WHERE id = project_id));

ALTER TABLE public.project_configs ENABLE ROW LEVEL SECURITY;
```

---

### Backend Endpoint to Add

```python
# routers/deploy.py
@router.post("/projects/{project_id}/deploy/lyzr")
async def deploy_to_lyzr(project_id: str):
    """
    1. Load project + agent_nodes from Supabase
    2. Generate lyzr.config.json
    3. POST to Lyzr Studio API (or mock for demo)
    4. Save lyzr_agent_id + lyzr_deploy_url back to project
    5. Stream progress back via SSE
    """
    # For demo: generate config + return mock Lyzr URL
    config = generate_lyzr_config(project_id)
    lyzr_url = f"https://studio.lyzr.ai/agents/{project_id}"
    return {
        "status": "deployed",
        "lyzr_url": lyzr_url,
        "config": config
    }

def generate_lyzr_config(project_id: str) -> dict:
    # Load project + nodes from Supabase
    # Map agent_nodes rows → lyzr.config.json format
    # Return the config dict
    pass
```

---

### Priority for Demo

| Item | Effort | Impact |
|---|---|---|
| lyzr.config.json generation in backend | 1 hr | High |
| Runtime Config panel per agent node | 2 hrs | High |
| Deploy Modal with Lyzr Studio option | 1 hr | High |
| lyzr.config.json tab in Overview Lens | 30 min | Medium |
| DB schema additions | 15 min | Low |
| Import from Lyzr Studio flow | 2 hrs | Medium |

Total: ~7 hrs for full Lyzr Studio integration showcase
