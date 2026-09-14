"""Curated cause/solution map for known error codes."""

from typing import TypedDict


class ErrorSolution(TypedDict):
    cause: str
    solution: str


ERROR_SOLUTIONS: dict[str, ErrorSolution] = {
    "guest_limit_reached": {
        "cause": "Anonymous user exceeded the free AI suggestion limit.",
        "solution": (
            "Ask the user to register or log in. If this fires unexpectedly, "
            "check guest usage rows and the configured free-call limit."
        ),
    },
    "http_401": {
        "cause": "Request lacked a valid auth token or the session expired.",
        "solution": (
            "Have the user log in again. Confirm the Authorization header is sent "
            "and the JWT secret/config matches the issuing environment."
        ),
    },
    "http_403": {
        "cause": "Authenticated user is not allowed to perform this action.",
        "solution": (
            "Verify the user’s role (e.g. is_admin) and account is_active. "
            "For admin-only routes, promote the user or use an admin account."
        ),
    },
    "http_404": {
        "cause": "Requested resource was not found.",
        "solution": (
            "Confirm the ID/path exists for that user. Check soft-deletes and "
            "that the client is calling the correct API base URL."
        ),
    },
    "http_422": {
        "cause": "Request body or query failed validation.",
        "solution": (
            "Inspect the validation detail for missing/invalid fields. Align the "
            "client payload with the OpenAPI schema for that endpoint."
        ),
    },
    "http_429": {
        "cause": "Client or IP hit a rate limit.",
        "solution": (
            "Reduce request frequency or raise the rate limit if legitimate traffic. "
            "Check for retry loops on the client."
        ),
    },
    "http_500": {
        "cause": "Unhandled server error while processing the request.",
        "solution": (
            "Read the stored stack/detail for this event. Reproduce with the same "
            "endpoint and payload; check recent deploys and dependency outages."
        ),
    },
    "http_502": {
        "cause": "Upstream dependency (proxy/gateway) returned a bad gateway.",
        "solution": (
            "Check reverse-proxy and upstream service health. Retry after the "
            "dependency recovers; verify timeout settings."
        ),
    },
    "http_503": {
        "cause": "Service temporarily unavailable.",
        "solution": (
            "Check process health, DB connectivity, and deployment status. "
            "Scale or restart the API if overloaded."
        ),
    },
    "network_error": {
        "cause": "Browser could not reach the API (network, CORS, or offline).",
        "solution": (
            "Confirm the backend is running and REACT_APP_API_URL matches. "
            "Use http://localhost:3000 (not 127.0.0.1) when developing locally; "
            "verify CORS allowed origins."
        ),
    },
    "client_render_error": {
        "cause": "A React section threw while rendering.",
        "solution": (
            "Use the stack and route in the event detail. Reproduce on that screen "
            "with the same user state; fix the null/undefined path in the UI."
        ),
    },
    "api_client_error": {
        "cause": "Web client received a failed API response.",
        "solution": (
            "Open the linked status_code and endpoint. Fix the underlying API "
            "failure or improve client handling for expected errors."
        ),
    },
    "ai_timeout": {
        "cause": "AI provider call timed out or was cancelled.",
        "solution": (
            "Retry the request. Check OpenAI/Replicate status and increase timeouts "
            "if latency is consistently high."
        ),
    },
    "ai_provider_error": {
        "cause": "AI provider returned an error or invalid response.",
        "solution": (
            "Inspect provider credentials, quotas, and model availability. "
            "Review the raw error in detail/context."
        ),
    },
    "_default": {
        "cause": "Unrecognized or uncategorized error.",
        "solution": (
            "Review message, stack, and context. Add a curated solution entry for "
            "this error_code once the root cause is known."
        ),
    },
}


def lookup_solution(error_code: str | None) -> ErrorSolution:
    """Return curated cause/solution for an error code, with fallback."""
    if not error_code:
        return ERROR_SOLUTIONS["_default"]
    key = error_code.strip().lower()
    if key in ERROR_SOLUTIONS:
        return ERROR_SOLUTIONS[key]
    # Map bare status codes like "500" → http_500
    if key.isdigit():
        http_key = f"http_{key}"
        if http_key in ERROR_SOLUTIONS:
            return ERROR_SOLUTIONS[http_key]
    return ERROR_SOLUTIONS["_default"]
