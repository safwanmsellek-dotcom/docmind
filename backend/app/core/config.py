from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "DocMind AI"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite+aiosqlite:///./docmind.db"
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    STORAGE_PATH: str = "./uploads"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx"]
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    class Config:
        env_file = ".env"


settings = Settings()
