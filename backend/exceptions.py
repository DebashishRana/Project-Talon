from enum import Enum
from typing import Optional

class ErrorSeverity(Enum):
    TRANSIENT = "transient"  # Retry-able (network timeout, rate limit)
    PERMANENT = "permanent"  # Don't retry (invalid credentials, 404)
    CONFIGURATION = "configuration"  # System misconfiguration

class VerificationException(Exception):
    """Base exception for verification system"""
    def __init__(
        self, 
        message: str, 
        verifier_name: str,
        severity: ErrorSeverity,
        error_code: Optional[str] = None,
        retryable: bool = False
    ):
        self.message = message
        self.verifier_name = verifier_name
        self.severity = severity
        self.error_code = error_code
        self.retryable = retryable
        super().__init__(message)

class CredentialError(VerificationException):
    """Credentials missing or invalid"""
    def __init__(self, verifier_name: str):
        super().__init__(
            f"Credentials not available for {verifier_name}",
            verifier_name,
            ErrorSeverity.PERMANENT,
            "MISSING_CREDENTIALS"
        )

class APITimeoutError(VerificationException):
    """External API timeout"""
    def __init__(self, verifier_name: str, timeout_seconds: int):
        super().__init__(
            f"{verifier_name} timed out after {timeout_seconds}s",
            verifier_name,
            ErrorSeverity.TRANSIENT,
            "TIMEOUT",
            retryable=True
        )

class APIRateLimitError(VerificationException):
    """API rate limit exceeded"""
    def __init__(self, verifier_name: str, retry_after_seconds: int):
        super().__init__(
            f"{verifier_name} rate limited. Retry after {retry_after_seconds}s",
            verifier_name,
            ErrorSeverity.TRANSIENT,
            "RATE_LIMIT",
            retryable=True
        )

class ConfigurationError(VerificationException):
    """Configuration problem"""
    pass
