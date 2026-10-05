# Architect 2.0 — Next Steps & Resume Guide

> Last session: React app scaffolded, Supabase connected, dev server running at http://localhost:5173
> Pick up from wherever you left off using the checklist below.

---

## Current Status

| Item | Status |
|---|---|
| React + Vite + TypeScript scaffolded | ✅ Done |
| Tailwind CSS configured with custom colors | ✅ Done |
| All pages created (Auth, Onboarding, Dashboard, Workspace, Templates, Settings) | ✅ Done |
| Zustand stores (app state, workspace state) | ✅ Done |
| React Router with real URLs | ✅ Done |
| Supabase URL + Anon Key in .env | ✅ Done |
| Dev server running | ✅ Done |
| Page loads in browser | ✅ Done |
| Supabase DB schema created | ⬜ Pending |
| Email auth working | ⬜ Pending |
| Google OAuth working | ⬜ Pending |
| Dashboard connected to real DB | ⬜ Pending |
| FastAPI backend | ⬜ Pending |
| E2B sandbox for code execution | ⬜ Pending |
| Deploy to Vercel + Railway | ⬜ Pending |

---

## To Resume Dev — Run These First

```bash
# 1. Go to project
cd /Users/vinodkumarsenrayar/Desktop/LYZR/architect-2.0

# 2. Start dev server
npm run dev

# 3. Open browser
open http://localhost:5173
```

---

## Phase 1 — Supabase Setup (Do This First)

### 1.1 Run DB Schema

Go to **Supabase → SQL Editor → New Query**, paste and run:

```sql
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR,
  name        VARCHAR,
  avatar_url  VARCHAR,
  persona     VARCHAR DEFAULT 'vibe',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         VARCHAR NOT NULL,
  description  TEXT,
  framework    VARCHAR NOT NULL DEFAULT 'langgraph',
  prompt       TEXT,
  status       VARCHAR DEFAULT 'active',
  git_branch   VARCHAR DEFAULT 'main',
  token_usage  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.agent_nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name          VARCHAR NOT NULL,
  type          VARCHAR NOT NULL,
  model_id      VARCHAR DEFAULT 'claude-3-5-sonnet',
  system_prompt TEXT,
  tools         JSONB DEFAULT '[]',
  memory        BOOLEAN DEFAULT false,
  max_retries   INTEGER DEFAULT 3,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  role        VARCHAR NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_nodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"   ON public.profiles      FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own projects"  ON public.projects      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own nodes"     ON public.agent_nodes   FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.projects WHERE id = project_id)
);
CREATE POLICY "Users can manage own messages"  ON public.chat_messages FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.projects WHERE id = project_id)
);
```

### 1.2 Disable Email Confirmation (for dev)

**Supabase → Authentication → Providers → Email**
- Toggle ON
- Turn OFF "Confirm email" (so you can test without inbox)

### 1.3 Create a Test User

**Supabase → Authentication → Users → Add user**
```
Email:    test@architect.com
Password: Test1234!
```

### 1.4 Enable Google OAuth (optional, for plus points)

- Go to console.cloud.google.com → Create OAuth 2.0 credentials
- Authorized redirect URI: `https://auepxmsodqylqbqpjcxb.supabase.co/auth/v1/callback`
- Copy Client ID + Secret
- Paste into Supabase → Authentication → Providers → Google → Save
- Add to Supabase redirect URLs: `http://localhost:5173/onboarding`

### 1.5 Set Site URL

**Supabase → Authentication → URL Configuration**
```
Site URL:      http://localhost:5173
Redirect URLs: http://localhost:5173/onboarding
               http://localhost:5173/dashboard
```

---

## Phase 2 — Connect Dashboard to Real Supabase Data

### 2.1 Update DashboardPage to load real projects

File: `src/pages/DashboardPage.tsx`

Replace the static `RECENT_PROJECTS` array with a real Supabase query:

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../api/auth'

// Inside component:
const [projects, setProjects] = useState([])

useEffect(() => {
  supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(6)
    .then(({ data }) => { if (data) setProjects(data) })
}, [])
```

### 2.2 Save project on Synthesize App click

File: `src/pages/DashboardPage.tsx`

Update `handleSynthesize`:

```typescript
const handleSynthesize = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { navigate('/'); return }

  const title = prompt.trim() || 'New Agentic App'

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: session.user.id,
      name: title.substring(0, 60),
      framework,
      prompt: title,
      status: 'active'
    })
    .select()
    .single()

  if (data) {
    setProject(data.id, data.name)
    navigate(`/workspace/${data.id}`)
  }
}
```

### 2.3 Add auth guard back to AppShell

File: `src/components/layout/AppShell.tsx`

Uncomment the session check so unauthenticated users get redirected to `/`:

```typescript
import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../api/auth'
import Navbar from './Navbar'

export default function AppShell() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session))
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s))
    return () => l.subscription.unsubscribe()
  }, [])

  if (authed === null) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#070a12' }}>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!authed) return <Navigate to="/" replace />

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070a12' }}>
      <Navbar />
      <div className="flex-1 overflow-hidden"><Outlet /></div>
    </div>
  )
}
```

---

## Phase 3 — FastAPI Backend

### 3.1 Create backend folder

```bash
cd /Users/vinodkumarsenrayar/Desktop/LYZR
mkdir architect-backend
cd architect-backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic sqlalchemy alembic python-jose httpx langgraph langchain-aws boto3 sse-starlette python-dotenv psycopg2-binary
```

### 3.2 Create main.py

```python
# architect-backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Architect 2.0 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

@app.post("/api/synthesize")
async def synthesize(payload: dict):
    # TODO: connect LangGraph agent
    return {
        "job_id": "demo-job-123",
        "project_id": payload.get("project_id"),
        "status": "started"
    }
```

### 3.3 Run backend

```bash
cd /Users/vinodkumarsenrayar/Desktop/LYZR/architect-backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Test it: `curl http://localhost:8000/health`

### 3.4 Key API endpoints to build

```
POST /api/synthesize              → parse prompt, stream code back via SSE
GET  /api/synthesize/{job_id}     → SSE stream of code generation
GET  /api/projects                → list projects (proxy to Supabase)
POST /api/projects/{id}/deploy    → trigger deployment
POST /api/workspace/{id}/chat     → SSE chat stream
WS   /api/workspace/{id}/terminal → WebSocket terminal (E2B)
```

---

## Phase 4 — E2B Sandbox (Code Execution)

### 4.1 Install E2B

```bash
pip install e2b-code-interpreter
```

### 4.2 Get E2B API key

- Sign up at e2b.dev
- Get API key from dashboard
- Add to backend `.env`: `E2B_API_KEY=your_key`

### 4.3 Wire terminal to E2B

```python
# In FastAPI WebSocket endpoint
from e2b_code_interpreter import Sandbox

@app.websocket("/api/workspace/{project_id}/terminal")
async def terminal(ws: WebSocket, project_id: str):
    await ws.accept()
    sandbox = Sandbox(api_key=E2B_API_KEY)
    while True:
        cmd = await ws.receive_text()
        result = sandbox.process.start_and_wait(cmd)
        await ws.send_text(result.stdout or result.stderr)
```

### 4.4 Wire code streaming to E2B

```python
from sse_starlette.sse import EventSourceResponse

@app.get("/api/synthesize/{job_id}")
async def stream_code(job_id: str):
    async def generate():
        sandbox = Sandbox(api_key=E2B_API_KEY)
        # Write generated files to sandbox
        sandbox.files.write("/app/main.py", generated_code)
        # Stream output
        for line in generated_code.split('\n'):
            yield {"event": "code_chunk", "data": line}
            await asyncio.sleep(0.1)
        yield {"event": "done", "data": "{}"}
    return EventSourceResponse(generate())
```

---

## Phase 5 — Deploy

### 5.1 Frontend → Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# From architect-2.0 folder
cd /Users/vinodkumarsenrayar/Desktop/LYZR/architect-2.0
vercel

# Set env vars in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_API_URL (your Railway backend URL)
```

### 5.2 Backend → Railway

- Go to railway.app → New Project → Deploy from GitHub
- Connect your repo
- Set root directory to `architect-backend`
- Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `E2B_API_KEY`
- Railway auto-detects the Dockerfile or uses nixpacks

### 5.3 Update Supabase redirect URLs for production

**Supabase → Authentication → URL Configuration**
```
Add: https://your-app.vercel.app/onboarding
Add: https://your-app.vercel.app/dashboard
```

---

## File Locations — Quick Reference

```
/Users/vinodkumarsenrayar/Desktop/LYZR/
├── architect-2.0/                  ← React frontend
│   ├── .env                        ← Supabase keys (already set)
│   ├── src/pages/                  ← All screens
│   ├── src/store/                  ← Zustand state
│   ├── src/api/                    ← Supabase + axios clients
│   ├── src/hooks/                  ← useStreamingCode, etc.
│   └── src/components/             ← Navbar, AppShell, etc.
├── architect-backend/              ← FastAPI backend (create in Phase 3)
├── architect_2_0_platform.html     ← Original HTML prototype
├── architecture-showcase.html      ← Architecture demo page
├── sample-case.html                ← PDF agent walkthrough
├── technical-stack-plan.md         ← Full tech stack doc
├── instructions.md                 ← Challenge requirements
└── next-steps.md                   ← This file
```

---

## Key Credentials & URLs

```
Supabase Project URL:  https://auepxmsodqylqbqpjcxb.supabase.co
Supabase Dashboard:    https://supabase.com/dashboard/project/auepxmsodqylqbqpjcxb
Dev Frontend:          http://localhost:5173
Dev Backend:           http://localhost:8000
```

---

## Common Errors & Fixes

| Error | Fix |
|---|---|
| Blank white page | Check .env has real Supabase URL, restart `npm run dev` |
| Invalid supabaseUrl | .env values are still placeholders |
| Invalid login credentials | Create test user in Supabase → Authentication → Users |
| Email not confirmed | Disable email confirmation in Supabase → Auth → Providers → Email |
| CORS error from backend | Add `http://localhost:5173` to FastAPI CORS origins |
| Vite env not loading | Must restart dev server after changing .env |
| `useNavigate` outside Router | Wrap component inside RouterProvider |

---

## Judging Checklist — What to Have Ready for Submission

- [ ] Live URL (Vercel deploy)
- [ ] GitHub repo with all code
- [ ] Google Sign-in working (plus points)
- [ ] Dashboard with real projects from DB (plus points)
- [ ] All 8 screens navigable (Auth, Onboarding, Dashboard, Workspace, Templates, Settings, Deploy modal, GitHub modal)
- [ ] Canvas Lens with agent nodes
- [ ] Code Lens with streaming animation
- [ ] Hybrid Lens
- [ ] Model selector working
- [ ] Node config panel
- [ ] Deploy modal with progress
- [ ] `technical-stack-plan.md` in repo
- [ ] Architecture diagram in repo

