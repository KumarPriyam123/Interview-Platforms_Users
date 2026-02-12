"""
Shared utilities package for Interview Platform.
Provides common utility functions used across services.
"""

from shared.utils.utils import (
    normalize_text,
    calculate_years_of_experience,
    generate_unique_id,
    safe_get,
    truncate_text,
    TimerContext
)

__all__ = [
    "normalize_text",
    "calculate_years_of_experience",
    "generate_unique_id",
    "safe_get",
    "truncate_text",
    "TimerContext"
]
