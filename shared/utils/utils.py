"""
Interview Platform - Shared Utilities
Common utilities used across microservices.
"""

import re
from typing import Optional
from datetime import datetime


def normalize_text(text: str) -> str:
    """
    Normalize text for comparison.
    
    Args:
        text: Input text
    
    Returns:
        Normalized lowercase text
    """
    return text.lower().strip()


def extract_years_from_text(text: str) -> Optional[float]:
    """
    Extract years of experience from text.
    
    Args:
        text: Text containing experience info
    
    Returns:
        Years as float or None
    """
    patterns = [
        r'(\d+(?:\.\d+)?)\+?\s*years?',
        r'(\d+(?:\.\d+)?)\s*yrs?',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return float(match.group(1))
    
    return None


def calculate_experience_level(years: float) -> str:
    """
    Determine experience level based on years.
    
    Args:
        years: Total years of experience
    
    Returns:
        Experience level string
    """
    if years < 2:
        return "entry"
    elif years < 5:
        return "intermediate"
    elif years < 10:
        return "senior"
    else:
        return "expert"


def format_score_percentage(score: float) -> str:
    """
    Format a 0-1 score as a percentage string.
    
    Args:
        score: Score between 0 and 1
    
    Returns:
        Formatted percentage string
    """
    return f"{int(score * 100)}%"


def generate_id(prefix: str = "") -> str:
    """
    Generate a unique ID with optional prefix.
    
    Args:
        prefix: Optional prefix for the ID
    
    Returns:
        Unique ID string
    """
    import uuid
    unique_part = uuid.uuid4().hex[:8]
    return f"{prefix}{unique_part}" if prefix else unique_part


def safe_get(data: dict, *keys, default=None):
    """
    Safely get nested dictionary value.
    
    Args:
        data: Dictionary to search
        *keys: Keys to traverse
        default: Default value if not found
    
    Returns:
        Value or default
    """
    result = data
    for key in keys:
        try:
            result = result[key]
        except (KeyError, TypeError, IndexError):
            return default
    return result


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to maximum length.
    
    Args:
        text: Input text
        max_length: Maximum length
        suffix: Suffix to add if truncated
    
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)].strip() + suffix


def parse_comma_list(text: str) -> list[str]:
    """
    Parse a comma-separated string into a list.
    
    Args:
        text: Comma-separated string
    
    Returns:
        List of stripped strings
    """
    if not text:
        return []
    return [item.strip() for item in text.split(",") if item.strip()]


class Timer:
    """Simple context manager for timing operations."""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        return self
    
    def __exit__(self, *args):
        self.end_time = datetime.now()
    
    @property
    def elapsed_ms(self) -> float:
        """Get elapsed time in milliseconds."""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds() * 1000
        return 0
