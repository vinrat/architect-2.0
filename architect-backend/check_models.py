"""
Run this to find which Bedrock models you have access to and can actually invoke.
Usage: python check_models.py
"""
import os
import json
import boto3
from dotenv import load_dotenv

load_dotenv()

session = boto3.Session(
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
    region_name=os.getenv("AWS_REGION", "us-east-1"),
)

# ── 1. List all foundation models available in your region ──────────────────
print("\n=== Listing available Bedrock foundation models ===\n")
bedrock = session.client("bedrock")
response = bedrock.list_foundation_models(byOutputModality="TEXT")
all_models = response.get("modelSummaries", [])

claude_models = [m for m in all_models if "claude" in m["modelId"].lower()]
print(f"Found {len(claude_models)} Claude models in region {os.getenv('AWS_REGION', 'us-east-1')}:\n")
for m in claude_models:
    print(f"  {m['modelId']:<60} | {m.get('modelLifecycle', {}).get('status', 'UNKNOWN')}")

# ── 2. Try invoking each Claude model with a tiny prompt ────────────────────
print("\n=== Testing invoke access for each Claude model ===\n")
runtime = session.client("bedrock-runtime")

WORKING_MODELS = []

for m in claude_models:
    model_id = m["modelId"]
    try:
        resp = runtime.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": "Say hi"}]}],
            inferenceConfig={"maxTokens": 20},
        )
        text = resp["output"]["message"]["content"][0]["text"]
        print(f"  ✅ {model_id:<60} → '{text.strip()}'")
        WORKING_MODELS.append(model_id)
    except Exception as e:
        print(f"  ❌ {model_id:<60} → {type(e).__name__}: {str(e)[:80]}")

# ── 3. Recommendation ────────────────────────────────────────────────────────
print("\n=== Recommendation ===\n")
if WORKING_MODELS:
    best = WORKING_MODELS[0]
    print(f"  Set this in your .env:\n")
    print(f"  BEDROCK_MODEL_ID={best}\n")
else:
    print("  No working Claude models found. Check your IAM permissions or enable models in:")
    print("  AWS Console → Bedrock → Model access → Request access\n")
