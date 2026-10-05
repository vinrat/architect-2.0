import json
import re
from fastapi import APIRouter
from pydantic import BaseModel
from llm import get_llm

router = APIRouter()


class ClarifyRequest(BaseModel):
    prompt: str
    model_id: str | None = None


SYSTEM = """You are an AI agent designer. A user described an agentic app they want to build.
Generate 3 clarifying questions to better understand their requirements.

Rules:
- Each question must have exactly 3-4 short options
- Questions should cover: data source/scope, output format, and one domain-specific concern
- Keep option labels under 6 words
- Keep option descriptions under 10 words
- Be specific to what the user described

Respond with ONLY valid JSON, no markdown:
{
  "interpretation": "One sentence describing what you understood",
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": [
        {"value": "option_value", "label": "Short label", "desc": "Brief description"}
      ]
    }
  ]
}"""


@router.post("/clarify")
async def clarify(body: ClarifyRequest):
    llm = get_llm(model_id=body.model_id)

    # Always use cheapest model for clarification regardless of provider
    provider = os.getenv("LLM_PROVIDER", "bedrock")
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        import os
        cheap_llm = ChatAnthropic(
            model="claude-haiku-4-5-20251001",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            max_tokens=300,   # strict cap
            temperature=0.3,
        )
    else:
        from langchain_aws import ChatBedrockConverse
        import boto3, os
        cheap_llm = ChatBedrockConverse(
            model="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            client=boto3.client(
                "bedrock-runtime",
                region_name=os.getenv("AWS_REGION", "us-east-1"),
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                aws_session_token=os.getenv("AWS_SESSION_TOKEN") or None,
            ),
            max_tokens=300,
            temperature=0.3,
        )

    prompt = f"{SYSTEM}\n\nUser prompt: {body.prompt}"

    try:
        response = await cheap_llm.ainvoke(prompt)
        content = response.content
        if isinstance(content, list):
            content = "".join(c.get("text", "") for c in content if isinstance(c, dict))

        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            return {"error": "Could not parse response", "fallback": True}

        data = json.loads(match.group())

        # Validate structure
        if "questions" not in data or not data["questions"]:
            return {"error": "Invalid response structure", "fallback": True}

        return {
            "interpretation": data.get("interpretation", ""),
            "questions": data["questions"][:3],  # max 3
        }
    except Exception as e:
        return {"error": str(e), "fallback": True}
