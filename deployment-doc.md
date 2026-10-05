# Architect 2.0 — Deployment Guide

> Frontend → Vercel | Backend → Railway | Auth → Supabase + Google OAuth

---

## Prerequisites

- GitHub repo with `architect-2.0/` and `architect-backend/` at root
- [Railway](https://railway.app) account
- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) project (`auepxmsodqylqbqpjcxb`)
- [Google Cloud Console](https://console.cloud.google.com) OAuth credentials

---

## Part 1 — Deploy Backend to Railway

### 1.1 Push to GitHub

```bash
cd /Users/vinodkumarsenrayar/Desktop/LYZR
git add .
git commit -m "deploy: backend ready"
git push origin main
```

### 1.2 Create Railway Project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repo → click **Deploy**

### 1.3 Set Root Directory

1. Railway dashboard → your service → **Settings** tab
2. **Source** → **Root Directory** → set to `architect-backend`
3. Click **Save** (Railway redeploys automatically)

### 1.4 Add Environment Variables

Railway → your service → **Variables** tab → add each:

| Key | Value |
|---|---|
| `LLM_PROVIDER` | `anthropic` |
| `ANTHROPIC_API_KEY` | `sk-ant-usr-...` |
| `ANTHROPIC_MODEL_ID` | `claude-haiku-4-5-20251001` |
| `SUPABASE_URL` | `https://auepxmsodqylqbqpjcxb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` |
| `FRONTEND_URL` | `https://architect-2-0.vercel.app` ← update after Vercel deploy |

### 1.5 Get Railway URL

1. Railway → your service → **Settings** → **Networking** → **Generate Domain**
2. Copy URL: `https://architect-backend-production-xxxx.up.railway.app`
3. Verify: open `https://<your-railway-url>/health` → should return `{"status":"ok","version":"2.0.0"}`

---

## Part 2 — Deploy Frontend to Vercel

### 2.1 Import Project

1. [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. **Root Directory** → set to `architect-2.0`
3. Framework preset → **Vite** (auto-detected)

### 2.2 Add Environment Variables

In Vercel → **Environment Variables** section before deploying:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://auepxmsodqylqbqpjcxb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (anon key) |
| `VITE_API_URL` | `https://<your-railway-url>.up.railway.app` |

### 2.3 Deploy

Click **Deploy** → wait for build to complete → copy your Vercel URL.

### 2.4 Update Railway FRONTEND_URL

Go back to Railway → **Variables** → update:

```
FRONTEND_URL=https://architect-2-0.vercel.app
```

Railway redeploys automatically.

---

## Part 3 — Fix Google OAuth Redirect URI

> ⚠️ Skip this and Google login will fail with `redirect_uri_mismatch`.

### 3.1 Update Supabase URL Configuration

1. [supabase.com](https://supabase.com) → project `auepxmsodqylqbqpjcxb`
2. Left sidebar → **Authentication** → **URL Configuration**
3. **Site URL**:
   ```
   https://architect-2-0.vercel.app
   ```
4. **Redirect URLs** (add all three):
   ```
   https://architect-2-0.vercel.app/**
   http://localhost:5173/**
   http://localhost:4173/**
   ```
5. Click **Save**

### 3.2 Update Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → your project
2. **APIs & Services** → **Credentials** → click your OAuth 2.0 Client ID
3. **Authorized JavaScript origins** — add:
   ```
   https://architect-2-0.vercel.app
   https://auepxmsodqylqbqpjcxb.supabase.co
   ```
4. **Authorized redirect URIs** — add:
   ```
   https://auepxmsodqylqbqpjcxb.supabase.co/auth/v1/callback
   ```
   > This is the Supabase callback URL — not your Vercel URL. Supabase handles the OAuth exchange then redirects to your app.
5. Click **Save** — allow ~5 minutes to propagate

### 3.3 Verify Supabase Google Provider

1. Supabase → **Authentication** → **Providers** → **Google**
2. Toggle **Enabled** → on
3. Paste **Client ID** and **Client Secret** from Google Cloud Console
4. Click **Save**

---

## Part 4 — Verification Checklist

| # | Check | Expected |
|---|---|---|
| 1 | `GET https://<railway-url>/health` | `{"status":"ok"}` |
| 2 | Vercel URL loads | App renders, no blank screen |
| 3 | Browser console | No `blocked by CORS` errors |
| 4 | Email sign up / login | Works end-to-end |
| 5 | Google OAuth | Redirects correctly, no `redirect_uri_mismatch` |
| 6 | Create a project | Saves to Supabase, workspace opens |
| 7 | Chat in workspace | AI responds via Railway backend |

---

## Part 5 — If You Get a New Vercel URL

Update these 4 places every time your Vercel URL changes:

| # | Where | What to change |
|---|---|---|
| 1 | Railway → Variables | `FRONTEND_URL` |
| 2 | `architect-backend/main.py` | Hardcoded entry in `ALLOWED_ORIGINS` list |
| 3 | Supabase → Auth → URL Configuration | Site URL + Redirect URLs |
| 4 | Google Cloud Console → OAuth Client | Authorized JavaScript origins |

---

## Quick Reference — Key URLs

| Service | URL |
|---|---|
| Frontend (Vercel) | `https://architect-2-0.vercel.app` |
| Backend (Railway) | `https://<your-railway-url>.up.railway.app` |
| Backend health | `https://<your-railway-url>.up.railway.app/health` |
| Supabase project | `https://supabase.com/dashboard/project/auepxmsodqylqbqpjcxb` |
| Supabase Auth settings | `https://supabase.com/dashboard/project/auepxmsodqylqbqpjcxb/auth/url-configuration` |
| Google Cloud Console | `https://console.cloud.google.com` |

---

## Local Development (Reference)

```bash
# Backend
cd architect-backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd architect-2.0
npm run dev
```

Local env vars (`architect-2.0/.env`):
```
VITE_API_URL=http://localhost:8000
```
