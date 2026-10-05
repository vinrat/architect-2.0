import re
import math
import json
import httpx
from collections import Counter
from fastapi import APIRouter
from pydantic import BaseModel
from llm import get_llm

router = APIRouter()

KEY_FILES = [
    "requirements.txt", "pyproject.toml", "setup.py", "package.json",
    "main.py", "app.py", "agent.py", "agents.py", "graph.py", "crew.py",
    "orchestrator.py", "README.md", "Dockerfile", ".env.example",
    "config.py", "tools.py", "tasks.py", "state.py",
]

ANALYSIS_QUERY = (
    "agent framework langgraph crewai pydanticai autogen "
    "tools integrations slack discord email pdf search database "
    "import from class def async agent task crew graph state"
)


# ── RAG: TF-IDF in pure Python, zero extra deps ──────────────────────────────

def tokenise(text: str) -> list[str]:
    return re.findall(r'[a-z_][a-z0-9_]{2,}', text.lower())


def chunk_text(text: str, filename: str, chunk_size: int = 400) -> list[dict]:
    lines = text.splitlines()
    chunks, current, size = [], [], 0
    for line in lines:
        current.append(line)
        size += len(line)
        if size >= chunk_size:
            chunks.append({"text": "\n".join(current), "source": filename})
            current, size = [], 0
    if current:
        chunks.append({"text": "\n".join(current), "source": filename})
    return chunks


def tfidf_score(query_tokens: list[str], chunk_tokens: list[str],
                idf: dict[str, float]) -> float:
    chunk_tf = Counter(chunk_tokens)
    total = len(chunk_tokens) or 1
    score = 0.0
    for token in set(query_tokens):
        tf = chunk_tf.get(token, 0) / total
        score += tf * idf.get(token, 0)
    return score


def retrieve_top_chunks(query: str, chunks: list[dict], top_k: int = 8) -> list[dict]:
    if not chunks:
        return []

    # Build IDF over all chunks
    all_tokens = [tokenise(c["text"]) for c in chunks]
    N = len(chunks)
    df: dict[str, int] = {}
    for tokens in all_tokens:
        for t in set(tokens):
            df[t] = df.get(t, 0) + 1
    idf = {t: math.log((N + 1) / (df[t] + 1)) for t in df}

    query_tokens = tokenise(query)
    scored = [
        (tfidf_score(query_tokens, tokens, idf), i)
        for i, tokens in enumerate(all_tokens)
    ]
    scored.sort(reverse=True)
    return [chunks[i] for _, i in scored[:top_k]]


# ── GitHub helpers ────────────────────────────────────────────────────────────

def parse_owner_repo(url: str):
    url = url.rstrip("/").replace(".git", "")
    parts = url.split("github.com/")
    if len(parts) < 2:
        return None, None
    path_parts = parts[1].split("/")
    if len(path_parts) < 2:
        return None, None
    return path_parts[0], path_parts[1]


async def fetch_repo_tree(owner: str, repo: str) -> list[dict]:
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
    async with httpx.AsyncClient(timeout=12) as client:
        resp = await client.get(url, headers={"Accept": "application/vnd.github.v3+json"})
        if resp.status_code != 200:
            return []
        return [f for f in resp.json().get("tree", []) if f.get("type") == "blob"]


async def fetch_file(owner: str, repo: str, path: str) -> str:
    url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}"
    async with httpx.AsyncClient(timeout=8) as client:
        resp = await client.get(url)
        return resp.text[:6000] if resp.status_code == 200 else ""


# ── Endpoint ──────────────────────────────────────────────────────────────────

class AnalyzeRepoRequest(BaseModel):
    repo_url: str
    model_id: str | None = None


@router.post("/analyze-repo")
async def analyze_repo(body: AnalyzeRepoRequest):
    owner, repo = parse_owner_repo(body.repo_url)
    if not owner or not repo:
        return {"error": "Invalid GitHub URL"}

    # 1. Fetch file tree
    tree = await fetch_repo_tree(owner, repo)
    if not tree:
        return {"error": "Could not fetch repo. Make sure it is a public repository."}

    all_paths = [f["path"] for f in tree]
    file_count = len(all_paths)

    # 2. Fetch key files (cap at 8 files)
    fetched: dict[str, str] = {}
    for path in all_paths:
        filename = path.split("/")[-1]
        if filename in KEY_FILES and filename not in fetched:
            content = await fetch_file(owner, repo, path)
            if content:
                fetched[filename] = content
        if len(fetched) >= 8:
            break

    # 3. Chunk all fetched files
    all_chunks: list[dict] = []
    for filename, content in fetched.items():
        all_chunks.extend(chunk_text(content, filename))

    # 4. RAG: retrieve only the most relevant chunks (~2K tokens vs full dump)
    relevant = retrieve_top_chunks(ANALYSIS_QUERY, all_chunks, top_k=8)
    rag_context = "\n\n".join(
        f"[{c['source']}]\n{c['text']}" for c in relevant
    )

    token_estimate = len(rag_context.split()) * 1.3
    file_list_sample = "\n".join(all_paths[:50])

    # 5. Send compact context to LLM
    prompt = f"""You are an expert AI engineer analysing a GitHub repository.

Repository: {owner}/{repo}  |  Total files: {file_count}

File paths (first 50):
{file_list_sample}

Most relevant code chunks (RAG-retrieved, ~{int(token_estimate)} tokens):
{rag_context}

Respond with ONLY a valid JSON object, no markdown fences:
{{
  "framework": "langgraph|crewai|pydanticai|autogen|custom|unknown",
  "language": "Python|TypeScript|JavaScript|other",
  "is_agent_project": true,
  "main_files": ["list of key filenames"],
  "detected_tools": ["Slack", "PDF", "Web Search", etc],
  "summary": "2-3 sentence plain English description of what this project does",
  "suggested_prompt": "Natural language prompt describing what this agent does",
  "complexity": "simple|moderate|complex"
}}"""

    llm = get_llm(model_id=body.model_id)
    try:
        response = await llm.ainvoke(prompt)
        content = response.content
        if isinstance(content, list):
            content = "".join(c.get("text", "") for c in content if isinstance(c, dict))

        match = re.search(r"\{.*\}", content, re.DOTALL)
        analysis = json.loads(match.group()) if match else {"error": "Could not parse LLM response"}

        return {
            "owner": owner,
            "repo": repo,
            "file_count": file_count,
            "main_files": list(fetched.keys()),
            "rag_chunks_used": len(relevant),
            "rag_tokens_estimate": int(token_estimate),
            **analysis,
        }
    except Exception as e:
        return {"error": str(e)}
