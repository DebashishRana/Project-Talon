from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

class DetectionStatus(Enum):
    DETECTED = "detected"
    NOT_DETECTED = "not_detected"
    ERROR = "error"

@dataclass
class DetectionResult:
    """Structured result from document detection"""
    status: DetectionStatus
    document_type: str  # "PAN", "Aadhaar", "ML_Unknown", etc.
    confidence: float  # 0.0-1.0
    metadata: Dict  # Extracted metadata (pan_numbers, holder_name, etc.)
    detector_name: str
    execution_time_ms: float
    error: Optional[str] = None
    raw_data: Optional[Dict] = None  # For debugging
    
    def to_dict(self) -> Dict:
        return {
            "status": self.status.value,
            "document_type": self.document_type,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "detector_name": self.detector_name,
            "execution_time_ms": self.execution_time_ms,
            "error": self.error,
            "timestamp": datetime.utcnow().isoformat()
        }

class BaseDetector(ABC):
    """Abstract base for document detectors (all document type detection)"""
    
    name: str  # Unique identifier: "regex", "ocr", "ml_v1", etc.
    version: str  # Semantic versioning: "1.0.0"
    supported_formats: List[str]  # [".pdf", ".jpg", ".png"]
    priority: int  # Execution order: 1 (first) to 10 (last)
    timeout_seconds: int  # Max execution time before timeout
    is_async: bool = False  # True if should run in background task
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Check if detector can run (dependencies installed, configs valid)"""
        pass
    
    @abstractmethod
    async def detect(self, content: bytes, filename: str) -> DetectionResult:
        """
        Detect document type and extract metadata.
        
        Args:
            content: File bytes
            filename: Original filename
            
        Returns:
            DetectionResult with status, document_type, confidence, metadata
            
        Must implement timeout handling and proper error capture.
        """
        pass
    
    async def validate_configuration(self) -> tuple[bool, str]:
        """
        Check if detector config is valid (called on startup).
        
        Returns:
            (is_valid: bool, error_message: str)
        """
        if not self.is_available:
            return False, f"{self.name} dependencies not installed"
        return True, ""
    
    async def health_check(self) -> bool:
        """
        Verify detector is in working state (called periodically).
        For external APIs: test connectivity.
        For ML models: verify model file exists and loads.
        """
        return self.is_available
