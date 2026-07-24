import re
from typing import Dict, List, Optional
import time
from backend.detection.base import BaseDetector, DetectionResult, DetectionStatus

class RegexDetector(BaseDetector):
    """Detects document types strictly based on text regex patterns."""
    
    name = "regex"
    version = "1.0.0"
    supported_formats = [".txt", ".pdf", ".jpg", ".jpeg", ".png"]
    priority = 2  # Run after OCR/text extraction
    timeout_seconds = 5
    is_async = False

    def __init__(self):
        self.pan_pattern = re.compile(r'[A-Z]{5}[0-9]{4}[A-Z]')
        # Pattern for Aadhaar: 12 digits starting with 2-9
        self.aadhaar_pattern = re.compile(r'[2-9]{1}[0-9]{11}')

    @property
    def is_available(self) -> bool:
        return True  # Regex is always available (no external dependencies)

    def _extract_pan_metadata(self, text: str) -> Dict:
        """Extract PAN related data."""
        matches = self.pan_pattern.findall(text)
        return {
            "document_type": "PAN",
            "pan_numbers": matches,
        }

    def _extract_aadhaar_metadata(self, text: str) -> Dict:
        """Extract Aadhaar related data."""
        # Removing common space separators before match
        normalized_text = re.sub(r'\s+', '', text)
        matches = self.aadhaar_pattern.findall(normalized_text)
        return {
            "document_type": "Aadhaar",
            "aadhaar_numbers": matches,
        }

    async def detect(self, content: bytes, filename: str, extracted_text: str = "") -> DetectionResult:
        """
        Detect metadata from text using regex.
        Note: We pass extracted_text from OCR/PDF parser to avoid re-parsing here.
        """
        start_time = time.time()
        metadata = {}
        status = DetectionStatus.NOT_DETECTED
        document_type = "Unknown"
        confidence = 0.0

        try:
            if not extracted_text:
                # If we were invoked directly with bytes but no text, we just decode if it's a txt file
                if filename.lower().endswith(".txt"):
                    extracted_text = content.decode('utf-8', errors='ignore')
                else:
                    return DetectionResult(
                        status=DetectionStatus.ERROR,
                        document_type="Unknown",
                        confidence=0.0,
                        metadata={},
                        detector_name=self.name,
                        execution_time_ms=(time.time() - start_time) * 1000,
                        error="RegexDetector requires extracted_text. Run OCR/PDF extraction first."
                    )

            # Check for PAN
            pan_data = self._extract_pan_metadata(extracted_text)
            if pan_data.get("pan_numbers"):
                metadata.update(pan_data)
                document_type = "PAN"
                status = DetectionStatus.DETECTED
                confidence = 0.9  # High confidence if exact Regex match

            # Check for Aadhaar
            aadhaar_data = self._extract_aadhaar_metadata(extracted_text)
            if aadhaar_data.get("aadhaar_numbers"):
                # If both PAN and Aadhaar are found, represent as combination
                if document_type == "PAN":
                    document_type = "PAN_AND_AADHAAR"
                else:
                    document_type = "Aadhaar"
                metadata.update(aadhaar_data)
                status = DetectionStatus.DETECTED
                confidence = 0.9

            execution_time_ms = (time.time() - start_time) * 1000
            
            return DetectionResult(
                status=status,
                document_type=document_type,
                confidence=confidence,
                metadata=metadata,
                detector_name=self.name,
                execution_time_ms=execution_time_ms
            )

        except Exception as e:
            return DetectionResult(
                status=DetectionStatus.ERROR,
                document_type="Unknown",
                confidence=0.0,
                metadata={},
                detector_name=self.name,
                execution_time_ms=(time.time() - start_time) * 1000,
                error=str(e)
            )
