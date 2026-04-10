"""
API Gateway - Configuration
Service configuration and environment settings.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Service URLs
    RESUME_PARSER_URL: str = "http://localhost:8001"
    PROFILE_MATCHING_URL: str = "http://localhost:8003"
    
    # File upload settings
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".docx"}
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "storage", "uploads")
    
    # API settings
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    
    # CORS settings
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Create upload directory if it doesn't exist
settings = get_settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
