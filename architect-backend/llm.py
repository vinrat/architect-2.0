import os
import boto3

# Bedrock model IDs (inference profiles)
BEDROCK_MODELS = {
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
}

# Anthropic direct model IDs
ANTHROPIC_MODELS = {
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-6",
    "claude-opus-4-5-20251101",
}


def _get_bedrock_llm(model_id: str | None):
    from langchain_aws import ChatBedrockConverse
    default = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
    resolved = model_id if model_id in BEDROCK_MODELS else default
    client = boto3.client(
        "bedrock-runtime",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN") or None,
    )
    return ChatBedrockConverse(model=resolved, client=client, max_tokens=4096, temperature=0.3)


def _get_anthropic_llm(model_id: str | None):
    from langchain_anthropic import ChatAnthropic
    if model_id and model_id.startswith("us.anthropic."):
        model_id = None
    default = os.getenv("ANTHROPIC_MODEL_ID", "claude-haiku-4-5-20251001")
    resolved = model_id if model_id in ANTHROPIC_MODELS else default
    return ChatAnthropic(
        model=resolved,
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        max_tokens=4096,
        temperature=0.3,
    )


def get_llm(model_id: str | None = None, streaming: bool = False):
    # Read provider inside function so load_dotenv() has already run
    provider = os.getenv("LLM_PROVIDER", "bedrock")
    if provider == "anthropic":
        return _get_anthropic_llm(model_id)
    return _get_bedrock_llm(model_id)
