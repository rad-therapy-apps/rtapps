"""Per-IP token-bucket rate limiting for login, register, and cohort join (NFR-13).

What this file does: implements an in-process token-bucket rate limiter that tracks
per-(name, client-ip) buckets and raises `Problem(429, "Too many requests")` when a
bucket is exhausted. Uses `time.monotonic()` for bucket refill and respects a
`settings.rate_limit_enabled` flag to disable entirely in tests.

Used here and why: FastAPI dependencies applied to login, register, and join routes;
the factory `rate_limit(name)` is called at module level to create singletons like
`_login_limit = rate_limit("login")`, then applied as route `dependencies`.

How it fits the project: per ADR-0005 (single-process API), buckets live in process
memory; multi-process deployment would require a shared store (Redis, etc.). Token
bucket formula: `tokens = min(limit, tokens + elapsed * limit / window_s)`, consume 1
or raise. NB: NFR-13 also names password reset; no such endpoint exists yet.

IMPORTANT: multi-process deployments will not share state across processes — each
process gets its own buckets. Deployment requiring multi-process rate limiting should
use a shared store (Redis) instead.

Depends on: `app.config.Settings`, `app.audit.service.client_ip`, `app.errors.Problem`.
Used by: `app.auth.router`, `app.cohorts.router` (route-level dependencies).
"""

import time
from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request

from app.audit.service import client_ip
from app.config import get_settings
from app.errors import Problem

# Global state: {("name", "ip"): (tokens, last_refill_time)} for all active buckets.
_buckets: dict[tuple[str, str], tuple[float, float]] = {}


def reset() -> None:
    """Clear all rate limit buckets; used in tests via the reset_rate_limits fixture."""
    _buckets.clear()


def rate_limit(
    name: str, *, limit: int = 10, window_s: float = 60.0
) -> Callable[..., Coroutine[Any, Any, None]]:
    """
    FastAPI dependency factory for per-IP token-bucket rate limiting.

    Args:
        name: Bucket identifier (e.g. "login", "register", "join").
        limit: Tokens per window (default 10).
        window_s: Refill window in seconds (default 60.0).

    Returns:
        A FastAPI dependency that consumes one token per invocation, raising
        `Problem(429)` if the bucket is exhausted.
    """

    async def _check_rate_limit(request: Request) -> None:
        settings = get_settings(request)
        if not settings.rate_limit_enabled:
            # Rate limiting disabled; allow all requests.
            return

        # Get client IP; fall back to "unknown" if unavailable.
        ip = client_ip(request) or "unknown"
        key = (name, ip)
        now = time.monotonic()

        if key in _buckets:
            tokens, last_refill = _buckets[key]
            elapsed = now - last_refill
        else:
            tokens = float(limit)
            elapsed = 0.0

        # Refill: tokens += elapsed * (limit / window_s)
        tokens = min(float(limit), tokens + elapsed * (limit / window_s))

        if tokens < 1.0:
            raise Problem(429, "Too many requests")

        # Consume one token and update the bucket.
        tokens -= 1.0
        _buckets[key] = (tokens, now)

    return _check_rate_limit
