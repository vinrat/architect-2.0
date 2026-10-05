# Architect 2.0 — Challenge Instructions

## 1. Explore

Research and deeply understand the following vibe-coding / coding agent platforms:

- [architect.new](https://architect.new)
- [Replit](https://replit.com)
- [Lovable](https://lovable.dev)
- [Emergent](https://emergent.sh)
- [Vercel v0](https://v0.dev)
- [Rocket.new](https://rocket.new)
- [Cursor](https://cursor.sh)
- [Codex](https://openai.com/codex)
- [Claude Code](https://claude.ai/code)
- ...or any other coding agent / vibe-coding platform

For each platform, understand:
- What makes it different?
- Why are people using it?
- What features does it have?
- The UI, UX, and user flows — everything

---

## 2. Build

Build **Architect 2.0** — a vibe-coding platform for both **technical and non-technical users**, where a user can:

- Build an entire agentic application just by prompting
- Import an existing project and keep working on it in Architect
- Build agents in any framework
- Connect GitHub to their app
- Deploy the app
- ...and anything else you think it needs

### Keep in mind

- Architect 2.0 should include all features of the current Architect, but extend it to also serve **technical users (developers)**
- Focus heavily on **UI/UX and user flows** — from authentication all the way to deployment
- Features **don't need to be fully functional** — dummy flows are acceptable as long as they clearly show the intended user experience
- Making some basic functionality work (e.g. authentication, database) is a **plus point**

---

## 3. Technical Architecture

Research how a platform like `architect.new` works under the hood, and design how you'd build Architect 2.0 in the real world. Cover all the moving pieces:

| Area | What to address |
|---|---|
| **Sandboxes** | What would you use to run each user's app, and why? |
| **Agent harness** | How the agent plans, writes code, runs tools, and recovers from errors |
| **Model-agnostic** | How users switch between models (Claude, GPT, Gemini, open-source) without breaking anything |
| **Frontend ↔ Sandbox** | How the frontend talks to the sandbox and backend, including live app preview |
| **Proxy** | Where the proxy sits and what it does |
| **GitHub integration** | How the GitHub integration would work |
| **Deployment** | How a user's app gets deployed, and how Architect 2.0 itself gets deployed in the cloud |
| **Scaling** | How you'd scale to thousands of users building and running apps simultaneously |

### What to submit

- A **detailed architecture diagram** showing every service and how they connect
- A **description of each service** — why you picked it and how it handles the points above
- A **detailed `.md` file** describing your architectural decisions and explaining your diagram

> Upload both the diagram and the `.md` file in the Submit tab, and add them to your GitHub repo.

---

## 4. Ship

Deploy it and share the following in the **Submit tab**:

- Live URL with all major features in place
- GitHub repo link
- Architecture diagram
- Architecture `.md` file

---

## Judging Criteria

### 🥇 Technical Architecture — *Most Important*

We want to see how well you understand what it takes to build this in the real world:
- A detailed architecture diagram
- Sensible choices for sandboxes, agent harness, model-agnosticism, proxy, GitHub integration, deployment, and scaling — with reasoning

> Don't just list services. Explain how the pieces talk to each other. Walk us through what happens from the moment a user types a prompt to their app running live.

---

### 🥇 Design, UI/UX & Flows — *Most Important*

Good design and product sense are a must. Think through everything from the user's perspective:
- Where each button sits
- Which pages and sections exist
- The layout and how one step leads to the next

> Think from first principles. Don't copy the current Architect's UI/UX or any other platform's. Start from what the user needs, then design the flow.

---

### 🥈 Feature Coverage — *High*

Cover every feature a platform like this needs. Dummy flows are fine as long as each one shows your product thinking and design.

| # | Feature |
|---|---|
| 01 | Authentication |
| 02 | Homepage |
| 03 | Chat window |
| 04 | App preview |
| 05 | Agent section |
| 06 | UI getting built |
| 07 | GitHub integration |
| 08 | Deploying the app |
| + | Anything else you can think of |

> Don't stop at this list. Think holistically — what would **technical folks** need, and what would **non-technical folks** need?

---

### 🥉 Working Functionality — *Plus Points*

Not required, but making a few basic things work (e.g. a database or Google sign-in) earns plus points. This tests your technical capabilities and how much you can actually make functional.
