"""
Loads configuration from environment variables (via a .env file).
Keeping this in one place means the rest of the app never talks
to os.environ directly.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:admin@localhost:5432/nexalys"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
