import time
import uuid
from collections import deque
from dataclasses import dataclass, field, asdict
from typing import Optional

# Cost per 1K tokens (input/output) for each model
MODEL_COSTS = {
    "us.anthropic.claude-haiku-4-5-20251001-v1:0":   {"input": 0.00025, "output": 0.00125},
    "us.anthropic.claude-sonnet-4-20250514-v1:0":    {"input": 0.003,   "output": 0.015},
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0":  {"input": 0.003,   "output": 0.015},
}
DEFAULT_COST = {"input": 0.003, "output": 0.015}

# Keep last 200 traces in memory (ring buffer)
_traces: deque = deque(maxlen=200)


@dataclass
class LLMTrace:
    trace_id: str
    endpoint: str          # synthesize | chat | analyze_repo
    model_id: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int
    status: str            # success | error | streaming
    cost_usd: float
    eval_score: Optional[float]   # 0-1, set after eval
    eval_flags: list[str]         # hallucination_risk | low_relevance | incomplete
    project_id: Optional[str]
    timestamp: float
    error: Optional[str] = None

    def to_dict(self):
        return asdict(self)


def estimate_tokens(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 chars"""
    return max(1, len(text) // 4)


def compute_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    rates = MODEL_COSTS.get(model_id, DEFAULT_COST)
    return (input_tokens / 1000 * rates["input"]) + (output_tokens / 1000 * rates["output"])


class TraceContext:
    """Context manager for tracing a single LLM call."""

    def __init__(self, endpoint: str, model_id: str, prompt: str, project_id: str | None = None):
        self.trace_id = str(uuid.uuid4())[:8]
        self.endpoint = endpoint
        self.model_id = model_id
        self.prompt_tokens = estimate_tokens(prompt)
        self.project_id = project_id
        self._start = time.time()
        self._completion_text = ""

    def record_chunk(self, text: str):
        self._completion_text += text

    def finish(self, status: str = "success", error: str | None = None) -> LLMTrace:
        completion_tokens = estimate_tokens(self._completion_text)
        latency_ms = int((time.time() - self._start) * 1000)
        cost = compute_cost(self.model_id, self.prompt_tokens, completion_tokens)

        trace = LLMTrace(
            trace_id=self.trace_id,
            endpoint=self.endpoint,
            model_id=self.model_id,
            prompt_tokens=self.prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            status=status,
            cost_usd=round(cost, 6),
            eval_score=None,
            eval_flags=[],
            project_id=self.project_id,
            timestamp=time.time(),
            error=error,
        )
        _traces.appendleft(trace)
        return trace


def get_traces(limit: int = 50) -> list[dict]:
    return [t.to_dict() for t in list(_traces)[:limit]]


def get_stats() -> dict:
    traces = list(_traces)
    if not traces:
        return {"total_calls": 0, "total_tokens": 0, "total_cost_usd": 0.0, "avg_latency_ms": 0, "error_rate": 0.0}

    total_tokens = sum(t.prompt_tokens + t.completion_tokens for t in traces)
    total_cost = sum(t.cost_usd for t in traces)
    avg_latency = int(sum(t.latency_ms for t in traces) / len(traces))
    errors = sum(1 for t in traces if t.status == "error")

    return {
        "total_calls": len(traces),
        "total_tokens": total_tokens,
        "total_cost_usd": round(total_cost, 4),
        "avg_latency_ms": avg_latency,
        "error_rate": round(errors / len(traces), 3),
        "by_endpoint": _group_by_endpoint(traces),
        "by_model": _group_by_model(traces),
    }


def _group_by_endpoint(traces) -> dict:
    groups: dict = {}
    for t in traces:
        g = groups.setdefault(t.endpoint, {"calls": 0, "tokens": 0, "cost_usd": 0.0})
        g["calls"] += 1
        g["tokens"] += t.prompt_tokens + t.completion_tokens
        g["cost_usd"] = round(g["cost_usd"] + t.cost_usd, 6)
    return groups


def _group_by_model(traces) -> dict:
    groups: dict = {}
    for t in traces:
        short = t.model_id.split("claude-")[-1].split("-2")[0] if "claude" in t.model_id else t.model_id
        g = groups.setdefault(short, {"calls": 0, "tokens": 0})
        g["calls"] += 1
        g["tokens"] += t.prompt_tokens + t.completion_tokens
    return groups
