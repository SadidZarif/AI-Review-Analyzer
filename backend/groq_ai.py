# ============ GROQ AI CLIENT ============
# Groq API ব্যবহার করে real-time LLM text generation
# NOTE: Bengali comments রাখা হলো (user instruction)
#
# Security:
# - API key কখনই frontend এ যাবে না
# - `.env` এ GROQ_API_KEY থাকবে (gitignore করা)
#
# Model:
# - llama-3.1-8b-instant

from __future__ import annotations

import hashlib
import os
from typing import Any, Optional, Sequence

import httpx


# Groq OpenAI-compatible endpoint
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "llama-3.1-8b-instant"


class GroqError(Exception):
    """Groq call fail হলে custom error"""


# Simple in-memory cache (একই prompt বারবার call avoid)
_CACHE: dict[str, str] = {}


def _cache_key(model: str, payload_key: str, temperature: float, max_tokens: int) -> str:
    raw = f"{model}||{temperature}||{max_tokens}||{payload_key}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


async def groq_chat_completion(
    *,
    system_prompt: str,
    user_prompt: str,
    messages: Optional[Sequence[dict[str, str]]] = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.2,
    max_tokens: int = 256,
    timeout_s: float = 30.0,
    use_cache: bool = True,
) -> str:
    """
    Groq Chat Completions API call করে text return করে।
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqError("GROQ_API_KEY not set in backend environment")

    # Build messages (OpenAI-compatible)
    msg_payload: list[dict[str, str]]
    if messages is not None:
        msg_payload = [dict(m) for m in messages]
    else:
        msg_payload = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    # Cache check (cache key derived from the full messages payload)
    payload_key = repr(msg_payload)
    ck = _cache_key(model, payload_key, temperature, max_tokens)
    if use_cache and ck in _CACHE:
        return _CACHE[ck]

    url = f"{GROQ_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": model,
        "messages": msg_payload,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code >= 400:
            # Groq error message normalize
            try:
                data = resp.json()
                msg = data.get("error", {}).get("message") or str(data)
            except Exception:
                msg = resp.text
            raise GroqError(f"Groq API error ({resp.status_code}): {msg}")

        data = resp.json()
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        content = (content or "").strip()
        if not content:
            raise GroqError("Groq returned empty content")

        if use_cache:
            _CACHE[ck] = content
        return content
    except httpx.TimeoutException as e:
        raise GroqError("Groq request timed out") from e
    except httpx.RequestError as e:
        raise GroqError(f"Groq request failed: {str(e)}") from e


