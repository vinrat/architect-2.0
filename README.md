# Architect 2.0

> A vibe-coding platform for both non-technical founders and senior engineers. Type a prompt, get a fully scaffolded, deployable agentic application.

[![Live Demo](https://img.shields.io/badge/Live-Demo-6366f1?style=flat-square)](https://architect-2-0.vercel.app)
[![Architecture](https://img.shields.io/badge/Architecture-Docs-a855f7?style=flat-square)](./architecture.md)
[![Tech Stack](https://img.shields.io/badge/Tech-Stack-06b6d4?style=flat-square)](./technical-stack-plan.md)

---

## What it does

- **Non-technical users** — describe what they want in plain English, get a visual agent pipeline with chat-first interaction
- **Technical users** — get a full IDE, file explorer, terminal, syntax-highlighted code generation, and GitHub import
- **Both** — can build agents in LangGraph, CrewAI, PydanticAI, AutoGen, or Custom frameworks and deploy to Lyzr Studio, Amazon Bedrock Agents, or self-host

---

## Key Features

| Feature | Status |
|---|---|
| Email + Google OAuth | ✅ Real (Supabase) |
| Per-project build mode (vibe/code) | ✅ Real |
| Dynamic agent pipeline from prompt | ✅ Real (intent parser) |
| Real AI chat (Claude via Bedrock SSE) | ✅ Real |
| Node config panel (model, prompt, tools) | ✅ Real |
| Code generation with syntax highlighting | ✅ Real (Claude SSE) |
| File plan approval before generation | ✅ Real |
| GitHub import with LLM analysis + RAG | ✅ Real |
| Deploy to Lyzr Studio / Bedrock / Self-host | ✅ UI flow |
| Live execution preview simulation | ✅ UI flow |
| Model switching with mid-stream warning | ✅ Real |
| Agent nodes persisted to Supabase | ✅ Real |
| Chat history persisted to Supabase | ✅ Real |

---

## Architecture

See [`architecture.md`](./architecture.md) for full Mermaid diagrams covering:
- Full system architecture
- Request flow (prompt → workspace)
- GitHub import RAG pipeline
- Model-agnostic layer
- Observability & eval layers
- Kubernetes deployment + YAML

See [`technical-stack-plan.md`](./technical-stack-plan.md) for engineering decisions.

---

## Project Structure

```
/
├── architect-2.0/          ← React 18 + Vite + TypeScript frontend
├── architect-backend/      ← FastAPI + Python 3.11 backend
├── architecture.md         ← Architecture diagrams (Mermaid)
├── technical-stack-plan.md ← Full engineering blueprint
└── submission-plan.md      ← Build log and submission checklist
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- AWS credentials with Bedrock access (us-east-1)

### 1. Frontend

```bash
cd architect-2.0
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
# → http://localhost:5173
```

### 2. Backend

```bash
cd architect-backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn langchain-aws boto3 httpx python-dotenv
cp .env.example .env
# Fill in AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BEDROCK_MODEL_ID, SUPABASE_URL
uvicorn main:app --reload --port 8000
# → http://localhost:8000/health
```

### 3. Supabase Schema

Run in Supabase SQL Editor:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR, name VARCHAR, avatar_url VARCHAR,
  persona VARCHAR DEFAULT 'vibe', created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL, framework VARCHAR NOT NULL DEFAULT 'langgraph',
  prompt TEXT, status VARCHAR DEFAULT 'active',
  git_branch VARCHAR DEFAULT 'main', token_usage INTEGER DEFAULT 0,
  persona VARCHAR DEFAULT 'vibe',
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.agent_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL, type VARCHAR NOT NULL,
  model_id VARCHAR DEFAULT 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  system_prompt TEXT, tools JSONB DEFAULT '[]',
  memory BOOLEAN DEFAULT false, max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL, content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_nodes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile"   ON public.profiles      FOR ALL USING (auth.uid() = id);
CREATE POLICY "own projects"  ON public.projects      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own nodes"     ON public.agent_nodes   FOR ALL USING (auth.uid() = (SELECT user_id FROM public.projects WHERE id = project_id));
CREATE POLICY "own messages"  ON public.chat_messages FOR ALL USING (auth.uid() = (SELECT user_id FROM public.projects WHERE id = project_id));
```

---

## Environment Variables

### Frontend (`architect-2.0/.env`)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

### Backend (`architect-backend/.env`)

```
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_SESSION_TOKEN=your-token
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Confirmed Working Bedrock Models

```
us.anthropic.claude-haiku-4-5-20251001-v1:0   ← Default (fastest)
us.anthropic.claude-sonnet-4-20250514-v1:0    ← Balanced
us.anthropic.claude-sonnet-4-5-20250929-v1:0  ← Best reasoning
```

Test access: `cd architect-backend && python check_models.py`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand + React Router v6 |
| Backend | FastAPI + Python 3.11 |
| LLM | Amazon Bedrock (Claude via ChatBedrockConverse) |
| Streaming | Server-Sent Events (SSE) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (Email + Google OAuth) |
| RAG | TF-IDF + cosine similarity (zero extra deps) |
| Deploy FE | Vercel |
| Deploy BE | Railway |

---

## Submission

- **Live URL:** https://architect-2-0.vercel.app
- **Architecture:** [`architecture.md`](./architecture.md)
- **Tech Stack Doc:** [`technical-stack-plan.md`](./technical-stack-plan.md)
