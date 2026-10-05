import re
from dataclasses import dataclass


@dataclass
class EvalResult:
    score: float          # 0.0 – 1.0
    flags: list[str]      # issues found
    passed: bool          # score >= threshold
    breakdown: dict       # per-dimension scores


# ── Heuristic evaluators (no extra LLM call) ─────────────────────────────────

def eval_code_output(output: str, prompt: str) -> EvalResult:
    """Evaluate synthesized agent code."""
    flags = []
    scores = {}

    # 1. Completeness — does it have the key structural elements?
    has_imports   = bool(re.search(r'^(import|from)\s+\w+', output, re.MULTILINE))
    has_function  = bool(re.search(r'def\s+\w+\s*\(', output))
    has_async     = bool(re.search(r'async\s+def', output))
    has_main      = bool(re.search(r'def\s+main\s*\(|if\s+__name__', output))
    completeness  = sum([has_imports, has_function, has_async, has_main]) / 4
    scores["completeness"] = round(completeness, 2)
    if completeness < 0.5:
        flags.append("incomplete_structure")

    # 2. Relevance — does the code mention concepts from the prompt?
    prompt_keywords = set(re.findall(r'\b[a-z]{4,}\b', prompt.lower()))
    code_lower = output.lower()
    matched = sum(1 for kw in prompt_keywords if kw in code_lower)
    relevance = min(1.0, matched / max(len(prompt_keywords), 1))
    scores["relevance"] = round(relevance, 2)
    if relevance < 0.3:
        flags.append("low_relevance")

    # 3. Hallucination risk — placeholder values, fake URLs, TODO stubs
    hallucination_patterns = [
        r'YOUR_API_KEY', r'your-api-key', r'example\.com',
        r'TODO:', r'FIXME:', r'placeholder', r'fake_',
        r'https://api\.example', r'sk-fake',
    ]
    hall_hits = sum(1 for p in hallucination_patterns if re.search(p, output, re.IGNORECASE))
    hall_score = max(0.0, 1.0 - hall_hits * 0.2)
    scores["hallucination_safety"] = round(hall_score, 2)
    if hall_hits > 2:
        flags.append("hallucination_risk")

    # 4. Length sanity — too short = truncated, too long = bloated
    lines = output.strip().splitlines()
    if len(lines) < 10:
        flags.append("too_short")
        scores["length"] = 0.3
    elif len(lines) > 500:
        flags.append("very_long")
        scores["length"] = 0.8
    else:
        scores["length"] = 1.0

    # 5. Syntax check — basic Python patterns
    unmatched_parens = output.count("(") - output.count(")")
    unmatched_brackets = output.count("[") - output.count("]")
    syntax_ok = abs(unmatched_parens) <= 2 and abs(unmatched_brackets) <= 2
    scores["syntax"] = 1.0 if syntax_ok else 0.5
    if not syntax_ok:
        flags.append("syntax_warning")

    final = sum(scores.values()) / len(scores)
    return EvalResult(
        score=round(final, 3),
        flags=flags,
        passed=final >= 0.6,
        breakdown=scores,
    )


def eval_chat_output(output: str, user_message: str) -> EvalResult:
    """Evaluate a chat/assistant response."""
    flags = []
    scores = {}

    # 1. Not empty
    if len(output.strip()) < 20:
        return EvalResult(score=0.1, flags=["empty_response"], passed=False, breakdown={})

    # 2. Relevance to user message
    user_words = set(re.findall(r'\b[a-z]{4,}\b', user_message.lower()))
    out_lower = output.lower()
    matched = sum(1 for w in user_words if w in out_lower)
    relevance = min(1.0, matched / max(len(user_words), 1) * 2)
    scores["relevance"] = round(relevance, 2)
    if relevance < 0.2:
        flags.append("low_relevance")

    # 3. Actionability — does it suggest something concrete?
    action_patterns = [r'\bwill\b', r'\bcan\b', r'\badd\b', r'\bupdate\b', r'\bchange\b', r'\bhere\b', r'\btry\b']
    action_hits = sum(1 for p in action_patterns if re.search(p, out_lower))
    scores["actionability"] = min(1.0, action_hits / 3)

    # 4. No refusals
    refusal_patterns = [r"i can't", r"i cannot", r"i'm unable", r"not possible"]
    has_refusal = any(re.search(p, out_lower) for p in refusal_patterns)
    scores["no_refusal"] = 0.0 if has_refusal else 1.0
    if has_refusal:
        flags.append("refusal_detected")

    # 5. Reasonable length
    words = len(output.split())
    if words < 5:
        scores["length"] = 0.2
        flags.append("too_short")
    elif words > 500:
        scores["length"] = 0.7
        flags.append("very_long")
    else:
        scores["length"] = 1.0

    final = sum(scores.values()) / len(scores)
    return EvalResult(
        score=round(final, 3),
        flags=flags,
        passed=final >= 0.55,
        breakdown=scores,
    )


def eval_repo_analysis(output: dict) -> EvalResult:
    """Evaluate a repo analysis result."""
    flags = []
    scores = {}

    required_fields = ["framework", "summary", "suggested_prompt", "detected_tools"]
    present = sum(1 for f in required_fields if output.get(f))
    scores["completeness"] = present / len(required_fields)
    if scores["completeness"] < 0.75:
        flags.append("incomplete_analysis")

    summary = output.get("summary", "")
    scores["summary_quality"] = min(1.0, len(summary.split()) / 20) if summary else 0.0
    if len(summary.split()) < 10:
        flags.append("weak_summary")

    framework = output.get("framework", "unknown")
    scores["framework_confidence"] = 0.5 if framework == "unknown" else 1.0
    if framework == "unknown":
        flags.append("unknown_framework")

    final = sum(scores.values()) / len(scores)
    return EvalResult(
        score=round(final, 3),
        flags=flags,
        passed=final >= 0.6,
        breakdown=scores,
    )
