"""
Configuration settings for VeriQuickX
"""

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Dashboard receives verification events and powers the logs/statistics views.
    DASHBOARD_URL: str = os.getenv("DASHBOARD_URL", "http://localhost:3000")
    # The standalone mainapp must not call the separate Next.js dashboard by default.
    DASHBOARD_SYNC_ENABLED: bool = os.getenv("DASHBOARD_SYNC_ENABLED", "false").lower() == "true"
    SCANNER_TOKEN: str = os.getenv("SCANNER_TOKEN", "")
    SCANNER_SIGNING_SECRET: str = os.getenv("SCANNER_SIGNING_SECRET", "")

    # Azure Blob Storage
    AZURE_STORAGE_ACCOUNT_NAME: str = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "")
    AZURE_STORAGE_ACCOUNT_KEY: str = os.getenv("AZURE_STORAGE_ACCOUNT_KEY", "")
    AZURE_STORAGE_CONTAINER_INCOMING: str = os.getenv("AZURE_STORAGE_CONTAINER_INCOMING", "incoming-docs")
    AZURE_STORAGE_CONTAINER_VERIFIED: str = os.getenv("AZURE_STORAGE_CONTAINER_VERIFIED", "verified-docs")
    
    # API Security
    API_TOKEN: str = os.getenv("API_TOKEN", "veriquickx-secret-token-change-in-production")

    # Local document-processing executables.  Their values are read from the
    # backend .env, so they do not need to be added to a Windows-wide PATH.
    POPPLER_PATH: str = ""
    TESSERACT_CMD: str = ""

    # AWS credentials are intentionally configured here rather than read with
    # os.getenv() at the call site.  Pydantic loads backend/.env but does not
    # mutate the process environment, which boto3 otherwise relies on.
    AWS_REGION: str = "ap-south-1"
    AWS_REKOGNITION_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_SESSION_TOKEN: str = ""

    # CSII derives opaque, domain-separated correlation tokens with this secret.
    # The API token is used only as a local-demo fallback when it is unset.
    CSII_HMAC_SECRET: str = os.getenv("CSII_HMAC_SECRET", "")
    
    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    # SAS token expiry settings
    UPLOAD_SAS_EXPIRY_MINUTES: int = 5
    # Read access SAS used by QR endpoints.
    # Keep as seconds (short-lived). If an old env var like QR_SAS_EXPIRY_HOURS is present,
    # prefer it and convert to seconds.
    QR_SAS_EXPIRY_SECONDS: int = int(os.getenv("QR_SAS_EXPIRY_SECONDS", "0") or "0") or (
        int(os.getenv("QR_SAS_EXPIRY_HOURS", "0") or "0") * 3600
    ) or 45  # default 30-60 seconds
    
    # File upload settings
    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: list = [".pdf", ".jpg", ".jpeg", ".png", ".webp"]

    # SentinelTrail MySQL database package integration.
    # Disabled by default so the existing SQLite-backed app keeps working until
    # MySQL 8.0 and the migrations in mainapp/database are ready.
    SENTINEL_DB_ENABLED: bool = os.getenv("SENTINEL_DB_ENABLED", "false").lower() == "true"
    SENTINEL_DB_STRICT: bool = os.getenv("SENTINEL_DB_STRICT", "false").lower() == "true"
    SENTINEL_DB_HOST: str = os.getenv("SENTINEL_DB_HOST", "localhost")
    SENTINEL_DB_PORT: int = int(os.getenv("SENTINEL_DB_PORT", "3306"))
    SENTINEL_DB_NAME: str = os.getenv("SENTINEL_DB_NAME", "sentineltrail")
    SENTINEL_DB_USER: str = os.getenv("SENTINEL_DB_USER", "talon_app")
    SENTINEL_DB_PASSWORD: str = os.getenv("SENTINEL_DB_PASSWORD", "")
    SENTINEL_DB_SSL_DISABLED: bool = os.getenv("SENTINEL_DB_SSL_DISABLED", "true").lower() == "true"
    SENTINEL_ORGANIZATION_ID: str = os.getenv("SENTINEL_ORGANIZATION_ID", "")
    SENTINEL_CHECKPOINT_ID: str = os.getenv("SENTINEL_CHECKPOINT_ID", "")
    SENTINEL_OFFICER_USER_ID: str = os.getenv("SENTINEL_OFFICER_USER_ID", "")
    SENTINEL_DEVICE_ID: str = os.getenv("SENTINEL_DEVICE_ID", "")
    SENTINEL_ORGANIZATION_CODE: str = os.getenv("SENTINEL_ORGANIZATION_CODE", "TALON-DEMO")
    SENTINEL_ORGANIZATION_NAME: str = os.getenv("SENTINEL_ORGANIZATION_NAME", "Talon Demo Authority")
    SENTINEL_CHECKPOINT_CODE: str = os.getenv("SENTINEL_CHECKPOINT_CODE", "DEMO-GATE-1")
    SENTINEL_CHECKPOINT_NAME: str = os.getenv("SENTINEL_CHECKPOINT_NAME", "Demo Verification Gate")
    SENTINEL_CHECKPOINT_COUNTRY: str = os.getenv("SENTINEL_CHECKPOINT_COUNTRY", "IN")
    SENTINEL_ISSUING_STATE_CODE: str = os.getenv("SENTINEL_ISSUING_STATE_CODE", "IND")
    SENTINEL_CHECKPOINT_TIMEZONE: str = os.getenv("SENTINEL_CHECKPOINT_TIMEZONE", "Asia/Kolkata")
    SENTINEL_OFFICER_SUBJECT: str = os.getenv("SENTINEL_OFFICER_SUBJECT", "talon-demo-officer")
    SENTINEL_OFFICER_NAME: str = os.getenv("SENTINEL_OFFICER_NAME", "Talon Demo Officer")
    SENTINEL_DEVICE_PUBLIC_ID: str = os.getenv("SENTINEL_DEVICE_PUBLIC_ID", "talon-mainapp-workstation")
    SENTINEL_DOCUMENT_RETENTION_DAYS: int = int(os.getenv("SENTINEL_DOCUMENT_RETENTION_DAYS", "7"))
    SENTINEL_BIOMETRIC_RETENTION_HOURS: int = int(os.getenv("SENTINEL_BIOMETRIC_RETENTION_HOURS", "12"))
    
    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields for migration compatibility

settings = Settings()

