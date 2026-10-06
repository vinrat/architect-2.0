import asyncio
import html
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llm import get_llm

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    project_name: str = ""
    project_prompt: str = ""
    framework: str = "langgraph"
    model_id: str | None = None
    history: list[dict] = []


def sanitise(text: str) -> str:
    """Strip HTML tags and escape special chars before embedding in prompts."""
    return html.escape(text.strip())[:4000]  # cap length too


def build_chat_system_prompt(project_name: str, project_prompt: str, framework: str) -> str:
    return f"""You are Architect AI, an expert agentic application assistant built into the Architect 2.0 platform.

The user is building an AI agent application with these details:
- Project: {project_name}
- Original prompt: {project_prompt}
- Framework: {framework}

Your job is to help them refine, extend, and improve their agent. You:
- Ask clarifying questions when the request is vague
- Suggest specific improvements with concrete examples
- Explain what you're changing and why
- Keep responses concise and actionable (2-4 sentences max unless explaining code)
- Use plain English for non-technical users, technical detail for developers
- When they ask to add something, confirm what you'll add and ask if they want anything else

Never say you "can't" do something. Always suggest the best path forward."""


@router.options("/chat")
async def chat_options():
    return {}


@router.post("/chat")
async def chat(body: ChatRequest):
    llm = get_llm(model_id=body.model_id)
    system = build_chat_system_prompt(
        sanitise(body.project_name),
        sanitise(body.project_prompt),
        sanitise(body.framework)
    )

    parts = [system, "\n\n"]
    for h in body.history[-6:]:
        role_label = "User" if h.get("role") == "user" else "Architect AI"
        parts.append(f"{role_label}: {sanitise(h.get('content', ''))}\n\n")
    parts.append(f"User: {sanitise(body.message)}\n\nArchitect AI:")
    full_prompt = "".join(parts)

    async def event_stream():
        try:
            async for chunk in llm.astream(full_prompt):
                content = chunk.content
                if isinstance(content, list):
                    text = ''.join(c.get('text', '') for c in content if isinstance(c, dict))
                else:
                    text = content or ''
                if text:
                    # Stream word by word for better UX
                    yield f"data: {text}\n\n"
                    await asyncio.sleep(0)
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
