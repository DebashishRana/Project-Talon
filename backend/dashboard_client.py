"""Client for publishing local document verification events to the dashboard."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen

from config import settings


def publish_verification_event(
    *,
    filename: str,
    document_type: str,
    confidence: float,
    verified: bool,
    model_result: dict,
    ocr_metadata: dict,
    processing_time_ms: float,
) -> dict:
    """Publish one event; a dashboard outage must not reject the upload."""
    status = "verified" if verified and confidence >= 0.75 else "pending" if verified else "flagged"

    if not settings.DASHBOARD_SYNC_ENABLED:
        return {
            "published": False,
            "status": status,
            "skipped": True,
            "reason": "Dashboard sync is disabled for standalone mainapp mode.",
        }

    dashboard_url = settings.DASHBOARD_URL.rstrip("/")
    if not dashboard_url:
        return {
            "published": False,
            "status": status,
            "skipped": True,
            "reason": "DASHBOARD_URL is not configured.",
        }
    token = settings.SCANNER_TOKEN
    secret = settings.SCANNER_SIGNING_SECRET
    timestamp = datetime.now(timezone.utc).isoformat()
    nonce = secrets.token_urlsafe(18)
    payload = {
        "event_id": f"upload-{nonce}",
        "document_type": document_type,
        "confidence": round(confidence, 4),
        "source_app": "dectra-mainapp",
        "scanner_version": "mainapp-model-pipeline-1.0",
        "method": "upload_ocr_models",
        "expected_document": verified,
        "extracted_fields": {
            "filename": filename,
            "expected_document": verified,
            "model_result": model_result,
            "pipeline": {
                "uploaded": True,
                "document_detected": model_result.get("document_type") != "Unknown",
                "ocr_successful": bool(ocr_metadata.get("extracted_text")),
                "authenticity_passed": verified,
                "tampering": "not_configured",
            },
        },
        "timestamp": timestamp,
        "ocr_data": {
            "status": ocr_metadata.get("ocr", {}).get("status", "completed"),
            "text": ocr_metadata.get("extracted_text", ""),
            "word_count": len(ocr_metadata.get("words", [])),
        },
        "processing_time_ms": round(processing_time_ms, 2),
    }
    raw_body = json.dumps(payload, separators=(",", ":"))
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if secret:
        signature = hmac.new(
            secret.encode(),
            f"{timestamp}.{nonce}.{raw_body}".encode(),
            hashlib.sha256,
        ).hexdigest()
        headers.update({
            "x-dectra-timestamp": timestamp,
            "x-dectra-nonce": nonce,
            "x-dectra-signature": signature,
        })

    try:
        request = Request(
            f"{dashboard_url}/api/verification-ingest",
            data=raw_body.encode(),
            headers=headers,
            method="POST",
        )
        with urlopen(request, timeout=10) as response:
            response_body = json.loads(response.read().decode())
        return {"published": True, "status": status, "dashboard": response_body}
    except (URLError, TimeoutError, ValueError, OSError) as error:
        print(f"[Dashboard] publish failed for {filename}: {error}")
        return {"published": False, "status": status, "error": str(error)}
