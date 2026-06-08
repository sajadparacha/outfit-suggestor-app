"""Application-specific exceptions."""


class GuestLimitReachedException(Exception):
    """Raised when an anonymous user exceeds the free AI call limit."""

    message = (
        "You've used your 3 free AI outfit suggestions. "
        "Create an account to keep using the app."
    )
    code = "guest_limit_reached"
