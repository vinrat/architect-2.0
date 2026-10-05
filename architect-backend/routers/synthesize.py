import asyncio
import html
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llm import get_llm

router = APIRouter()


def sanitise(text: str) -> str:
    return html.escape(text.strip())[:4000]


class SynthesizeRequest(BaseModel):
    prompt: str
    framework: str = "langgraph"
    project_id: str | None = None
    model_id: str | None = None


FRAMEWORK_HINTS = {
    "langgraph":  "Use LangGraph with StateGraph, typed state (TypedDict), and async nodes.",
    "crewai":     "Use CrewAI with Agent, Task, and Crew classes.",
    "pydanticai": "Use PydanticAI with Agent and structured output models.",
    "autogen":    "Use AutoGen with AssistantAgent and UserProxyAgent.",
    "custom":     "Use plain Python async functions with a simple orchestration loop.",
}


def build_prompt(user_prompt: str, framework: str) -> str:
    hint = FRAMEWORK_HINTS.get(framework, FRAMEWORK_HINTS["langgraph"])
    return f"""You are an expert AI agent engineer. Generate complete, production-ready Python code for the following agentic application.

Framework instructions: {hint}

User request: {user_prompt}

Requirements:
- Include all imports
- Use AWS Bedrock Claude (anthropic.claude-3-5-sonnet-20241022-v2:0) via langchain_aws ChatBedrock
- Add clear inline comments
- Include a main() async function that runs the agent
- Output ONLY the Python code, no markdown fences, no explanation
"""


@router.options("/synthesize")
def synthesize_preflight():
    return Response(status_code=200)


@router.post("/synthesize")
async def synthesize(body: SynthesizeRequest):
    llm = get_llm(model_id=body.model_id)
    system_prompt = build_prompt(sanitise(body.prompt), sanitise(body.framework))

    async def event_stream():
        try:
            async for chunk in llm.astream(system_prompt):
                # ChatBedrockConverse returns content as list of dicts or string
                content = chunk.content
                if isinstance(content, list):
                    text = ''.join(c.get('text', '') for c in content if isinstance(c, dict))
                else:
                    text = content or ''
                if text:
                    for line in text.splitlines(keepends=True):
                        yield f"data: {line.rstrip()}\n\n"
                        await asyncio.sleep(0)
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
