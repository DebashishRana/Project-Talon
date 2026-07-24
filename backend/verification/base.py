from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime

class VerificationStatus(Enum):
    VERIFIED = "verified"
    FAILED = "failed"
    PARTIAL = "partial"
    PENDING = "pending"
    ERROR = "error"
    MANUAL_REVIEW = "manual_review"  # Triggered if fallback is needed

@dataclass
class VerificationResult:
    """Structured result from document verification"""
    status: VerificationStatus
    verifier_name: str
    document_type: str  # "PAN", "Aadhaar", etc.
    confidence: float  # 0.0-1.0
    is_cross_verification: bool  # True if government API
    
    # Success details
    verified_fields: Dict[str, bool] = field(default_factory=dict)  # {"pan_format": true, "checksum": true}
    metadata: Dict = field(default_factory=dict)  # Additional verified metadata
    
    # Failure/Error details
    reason: Optional[str] = None  # Why verification failed/errored
    error: Optional[str] = None  # Exception message if error occurred
    error_code: Optional[str] = None  # API-specific error code
    
    # Execution details
    execution_time_ms: float = 0.0
    api_calls: int = 0  # Number of external API calls made
    retry_count: int = 0
    
    # Raw data for audit trail
    raw_response: Optional[Dict] = None  # Full API response (sanitized)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "status": self.status.value,
            "verifier_name": self.verifier_name,
            "document_type": self.document_type,
            "confidence": self.confidence,
            "is_cross_verification": self.is_cross_verification,
            "verified_fields": self.verified_fields,
            "metadata": self.metadata,
            "reason": self.reason,
            "error": self.error,
            "error_code": self.error_code,
            "execution_time_ms": self.execution_time_ms,
            "api_calls": self.api_calls,
            "retry_count": self.retry_count,
            "timestamp": self.timestamp.isoformat()
        }

class BaseVerifier(ABC):
    """Abstract base for document verifiers (authenticity/format validation)"""
    
    name: str  # Unique identifier: "format", "digilocker", "uidai", etc.
    version: str  # Semantic versioning: "1.0.0"
    document_types: List[str]  # ["PAN", "Aadhaar"] - what docs can verify
    is_cross_verification: bool  # True if external API (DigiLocker, UIDAI, etc.)
    priority: int  # Execution order: 1 (first) to 10 (last)
    timeout_seconds: int  # Max execution time
    
    # For cross-verification APIs
    api_endpoint: Optional[str] = None
    requires_credentials: bool = False  # True if needs secrets from vault
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Check if verifier can run (credentials, dependencies, connectivity)"""
        pass
    
    @abstractmethod
    async def verify(self, metadata: Dict, document_type: str) -> VerificationResult:
        """
        Verify document authenticity.
        
        Args:
            metadata: Extracted metadata from detection phase
            document_type: Document type ("PAN", "Aadhaar", etc.)
            
        Returns:
            VerificationResult with status, confidence, verified_fields
            
        Implementation must handle:
        - Timeout (don't exceed timeout_seconds)
        - Retries (implement exponential backoff for transient failures)
        - Errors (catch exceptions, return VerificationResult.ERROR)
        - Sanitization (don't log sensitive data)
        """
        pass
    
    async def validate_configuration(self) -> tuple[bool, str]:
        """Check if verifier config is valid (called on startup)."""
        if self.requires_credentials and not self.is_available:
            return False, f"{self.name} credentials not available"
        return True, ""
    
    async def health_check(self) -> bool:
        """
        Verify verifier is working (called periodically).
        For APIs: test connectivity.
        For format verifiers: run sanity test.
        """
        return self.is_available
