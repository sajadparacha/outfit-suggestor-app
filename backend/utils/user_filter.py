"""Shared helpers for admin report user filters."""
from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.user import User


def matched_user_ids(
    db: Session,
    *,
    user: Optional[str] = None,
    user_id: Optional[int] = None,
) -> Optional[List[int]]:
    """
    Resolve a user filter to matching user IDs.

    - user_id: exact ID match
    - user: case-insensitive contains on email or full_name
    - neither: no filter (returns None)
    """
    if user_id is not None:
        return [user_id]

    if user:
        trimmed = user.strip()
        if not trimmed:
            return None
        user_like = f"%{trimmed}%"
        return [
            uid
            for (uid,) in db.query(User.id)
            .filter(or_(User.email.ilike(user_like), User.full_name.ilike(user_like)))
            .all()
        ]

    return None
