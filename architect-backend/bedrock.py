import os
import boto3
from langchain_aws import ChatBedrockConverse

# Models routed through Amazon Bedrock (confirmed working inference profiles)
BEDROCK_MODELS = {
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
}

DEFAULT_MODEL = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")


def get_bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
    )


def get_llm(model_id: str | None = None, streaming: bool = False):
    # Use requested model if it's a known Bedrock model, else fall back to default
    resolved = model_id if model_id in BEDROCK_MODELS else DEFAULT_MODEL
    return ChatBedrockConverse(
        model=resolved,
        client=get_bedrock_client(),
        max_tokens=4096,
        temperature=0.3,
    )
