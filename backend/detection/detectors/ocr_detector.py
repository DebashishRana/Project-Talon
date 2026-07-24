import io
import time
from typing import Dict
from PIL import Image
import pytesseract
import pdfplumber
import PyPDF2
from pyzbar import pyzbar
from backend.detection.base import BaseDetector, DetectionResult, DetectionStatus

class OCRDetector(BaseDetector):
    """Extracts raw text and QR data from PDFs and Images using Tesseract and pyzbar."""
    
    name = "ocr"
    version = "1.0.0"
    supported_formats = [".pdf", ".jpg", ".jpeg", ".png"]
    priority = 1  # Runs first to provide text for Regex
    timeout_seconds = 30
    is_async = True

    @property
    def is_available(self) -> bool:
        """Check if dependencies are available"""
        try:
            import pytesseract
            # Simple check if tesseract is installed
            pytesseract.get_tesseract_version()
            return True
        except:
            return False

    def _extract_qr_from_image(self, image: Image.Image) -> str:
        try:
            barcodes = pyzbar.decode(image)
            for barcode in barcodes:
                if barcode.type == 'QRCODE':
                    return barcode.data.decode("utf-8")
        except:
            pass
        return ""

    def _process_pdf(self, content: bytes) -> Dict:
        """Extract text and QR from PDF"""
        metadata = {"extracted_text": "", "qr_data": ""}
        try:
            pdf_file = io.BytesIO(content)
            with pdfplumber.open(pdf_file) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ""
                    # Optional: extract QR from page image if needed, keeping simple for now
                metadata["extracted_text"] = text
        except Exception as e:
            # Fallback
            try:
                pdf_file = io.BytesIO(content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                metadata["extracted_text"] = text
            except:
                pass
        return metadata

    def _process_image(self, content: bytes) -> Dict:
        """Extract text and QR from Image"""
        metadata = {"extracted_text": "", "qr_data": ""}
        try:
            image = Image.open(io.BytesIO(content))
            metadata["qr_data"] = self._extract_qr_from_image(image)
            metadata["extracted_text"] = pytesseract.image_to_string(image, lang='eng')
        except:
            pass
        return metadata

    async def detect(self, content: bytes, filename: str) -> DetectionResult:
        start_time = time.time()
        file_ext = filename.lower().split('.')[-1]
        
        metadata = {}
        
        try:
            if file_ext == 'pdf':
                metadata = self._process_pdf(content)
            elif file_ext in ['jpg', 'jpeg', 'png']:
                metadata = self._process_image(content)
            else:
                raise ValueError("Unsupported file type")
                
            status = DetectionStatus.DETECTED if metadata.get("extracted_text") else DetectionStatus.NOT_DETECTED
            
            return DetectionResult(
                status=status,
                document_type="RAW_TEXT",
                confidence=1.0 if status == DetectionStatus.DETECTED else 0.0,
                metadata=metadata,
                detector_name=self.name,
                execution_time_ms=(time.time() - start_time) * 1000
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