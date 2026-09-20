"""
Optional bridge from the current FastAPI app into the SentinelTrail MySQL schema.

The database package in mainapp/database is the structured audit/case store.
This module keeps that integration isolated so local development still works
with only the legacy SQLite database until SENTINEL_DB_ENABLED=true.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from config import settings


ENGINE_NAME = "talon-fastapi"
ENGINE_VERSION = "0.08"
MODEL_VERSION = "aws-rekognition-compare-faces"


def is_enabled() -> bool:
    return bool(settings.SENTINEL_DB_ENABLED)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _stable_uuid(setting_value: str, name: str) -> str:
    if setting_value:
        return str(uuid.UUID(setting_value))
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"talon:{name}"))


def _uuid_to_bin(value: str) -> bytes:
    """Match MySQL UUID_TO_BIN(uuid, 1) so SQL docs can use BIN_TO_UUID(id, 1)."""
    raw = uuid.UUID(value).bytes
    return raw[6:8] + raw[4:6] + raw[0:4] + raw[8:16]


def _uuid_from_bin(value: bytes) -> str:
    raw = value[4:8] + value[2:4] + value[0:2] + value[8:16]
    return str(uuid.UUID(bytes=raw))


def _new_uuid() -> str:
    return str(uuid.uuid4())


def _sha256_bytes(value: bytes) -> bytes:
    return hashlib.sha256(value).digest()


def _sha256_text(value: str) -> bytes:
    return hashlib.sha256(value.encode("utf-8")).digest()


def _json(value: Dict[str, Any]) -> str:
    return json.dumps(value, separators=(",", ":"), default=str)


def _risk_from_similarity(similarity: float, matched: bool) -> Dict[str, Any]:
    risk_score = round(max(0.0, min(100.0, 100.0 - similarity)), 3)
    if matched and similarity >= 95:
        return {"score": risk_score, "band": "low", "recommended_action": "proceed"}
    if matched:
        return {"score": max(risk_score, 10.0), "band": "low", "recommended_action": "review"}
    if similarity >= 75:
        return {"score": max(risk_score, 35.0), "band": "medium", "recommended_action": "review"}
    return {"score": max(risk_score, 70.0), "band": "high", "recommended_action": "escalate"}


def _document_type(value: Optional[str]) -> str:
    normalized = (value or "").strip().lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "passport": "passport",
        "visa": "visa",
        "aadhaar": "national_id",
        "aadhar": "national_id",
        "aadhaar_pan": "national_id",
        "aadhar_pan": "national_id",
        "national_id": "national_id",
        "id": "national_id",
        "driving_license": "driving_licence",
        "driving_licence": "driving_licence",
        "driver_license": "driving_licence",
        "permit": "permit",
    }
    return mapping.get(normalized, "passport")


def _get_mysql_connector():
    try:
        import mysql.connector  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "mysql-connector-python is not installed. Run `pip install -r backend/requirements.txt`."
        ) from exc
    return mysql.connector


def _connect():
    connector = _get_mysql_connector()
    kwargs = {
        "host": settings.SENTINEL_DB_HOST,
        "port": settings.SENTINEL_DB_PORT,
        "database": settings.SENTINEL_DB_NAME,
        "user": settings.SENTINEL_DB_USER,
        "password": settings.SENTINEL_DB_PASSWORD,
        "autocommit": False,
    }
    if settings.SENTINEL_DB_SSL_DISABLED:
        kwargs["ssl_disabled"] = True
    return connector.connect(**kwargs)


def _reference_ids() -> Dict[str, bytes]:
    return {
        "organization_id": _uuid_to_bin(
            _stable_uuid(settings.SENTINEL_ORGANIZATION_ID, "organization:demo")
        ),
        "checkpoint_id": _uuid_to_bin(
            _stable_uuid(settings.SENTINEL_CHECKPOINT_ID, "checkpoint:demo-gate-1")
        ),
        "officer_user_id": _uuid_to_bin(
            _stable_uuid(settings.SENTINEL_OFFICER_USER_ID, "user:demo-officer")
        ),
        "device_id": _uuid_to_bin(
            _stable_uuid(settings.SENTINEL_DEVICE_ID, "device:mainapp-workstation")
        ),
    }


def _ensure_bootstrap(cursor) -> Dict[str, bytes]:
    ids = _reference_ids()
    now = _utcnow()
    officer_role_id = _uuid_to_bin(str(uuid.uuid5(uuid.NAMESPACE_DNS, "talon:role:officer")))

    cursor.execute(
        """
        INSERT INTO organizations (organization_id, organization_code, name, status, created_at)
        VALUES (%s, %s, %s, 'active', %s)
        ON DUPLICATE KEY UPDATE name = VALUES(name), status = 'active'
        """,
        (
            ids["organization_id"],
            settings.SENTINEL_ORGANIZATION_CODE,
            settings.SENTINEL_ORGANIZATION_NAME,
            now,
        ),
    )
    cursor.execute(
        """
        INSERT INTO checkpoints (
            checkpoint_id, organization_id, checkpoint_code, name, country_code, timezone_name, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, 'active')
        ON DUPLICATE KEY UPDATE name = VALUES(name), status = 'active'
        """,
        (
            ids["checkpoint_id"],
            ids["organization_id"],
            settings.SENTINEL_CHECKPOINT_CODE,
            settings.SENTINEL_CHECKPOINT_NAME,
            settings.SENTINEL_CHECKPOINT_COUNTRY[:2].upper(),
            settings.SENTINEL_CHECKPOINT_TIMEZONE,
        ),
    )
    cursor.execute(
        """
        INSERT INTO roles (role_id, role_code, description)
        VALUES (%s, 'officer', 'Can review Talon verification cases')
        ON DUPLICATE KEY UPDATE description = VALUES(description)
        """,
        (officer_role_id,),
    )
    cursor.execute("SELECT role_id FROM roles WHERE role_code = 'officer' LIMIT 1")
    officer_role_id = cursor.fetchone()[0]
    cursor.execute(
        """
        INSERT INTO users (user_id, organization_id, external_subject, display_name, status, created_at)
        VALUES (%s, %s, %s, %s, 'active', %s)
        ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), status = 'active'
        """,
        (
            ids["officer_user_id"],
            ids["organization_id"],
            settings.SENTINEL_OFFICER_SUBJECT,
            settings.SENTINEL_OFFICER_NAME,
            now,
        ),
    )
    cursor.execute(
        """
        INSERT IGNORE INTO user_roles (user_id, role_id, granted_at, granted_by_user_id)
        VALUES (%s, %s, %s, %s)
        """,
        (ids["officer_user_id"], officer_role_id, now, ids["officer_user_id"]),
    )
    cursor.execute(
        """
        INSERT INTO registered_devices (
            device_id, organization_id, device_public_id, device_type, public_key_fingerprint,
            status, registered_at
        )
        VALUES (%s, %s, %s, 'workstation', %s, 'active', %s)
        ON DUPLICATE KEY UPDATE status = 'active'
        """,
        (
            ids["device_id"],
            ids["organization_id"],
            settings.SENTINEL_DEVICE_PUBLIC_ID,
            _sha256_text(settings.SENTINEL_DEVICE_PUBLIC_ID),
            now,
        ),
    )
    cursor.execute(
        """
        INSERT INTO retention_policies (
            retention_policy_id, organization_id, document_type,
            retention_days, biometric_retention_days, status, effective_from
        )
        VALUES (%s, %s, 'all', %s, %s, 'active', %s)
        ON DUPLICATE KEY UPDATE
            retention_days = VALUES(retention_days),
            biometric_retention_days = VALUES(biometric_retention_days),
            status = 'active'
        """,
        (
            _uuid_to_bin(str(uuid.uuid5(uuid.NAMESPACE_DNS, "talon:retention:demo:all"))),
            ids["organization_id"],
            settings.SENTINEL_DOCUMENT_RETENTION_DAYS,
            max(1, round(settings.SENTINEL_BIOMETRIC_RETENTION_HOURS / 24)),
            now,
        ),
    )
    return ids


def _insert_audit_event(
    cursor,
    *,
    organization_id: bytes,
    actor_user_id: bytes,
    case_id: bytes,
    entity_type: str,
    entity_id: bytes,
    event_type: str,
    payload: Dict[str, Any],
) -> None:
    cursor.execute(
        """
        SELECT event_hash
        FROM audit_events
        WHERE organization_id = %s
        ORDER BY occurred_at DESC
        LIMIT 1
        """,
        (organization_id,),
    )
    previous_row = cursor.fetchone()
    previous_hash = previous_row[0] if previous_row else None
    payload_json = _json(payload)
    event_hash = hashlib.sha256(
        (previous_hash or b"")
        + event_type.encode("utf-8")
        + entity_type.encode("utf-8")
        + entity_id
        + payload_json.encode("utf-8")
    ).digest()
    cursor.execute(
        """
        INSERT INTO audit_events (
            audit_event_id, organization_id, actor_user_id, case_id, entity_type,
            entity_id, event_type, occurred_at, payload, previous_event_hash, event_hash
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CAST(%s AS JSON), %s, %s)
        """,
        (
            _uuid_to_bin(_new_uuid()),
            organization_id,
            actor_user_id,
            case_id,
            entity_type,
            entity_id,
            event_type,
            _utcnow(),
            payload_json,
            previous_hash,
            event_hash,
        ),
    )


def record_face_verification(
    *,
    document_bytes: bytes,
    live_face_bytes: bytes,
    document_face_bytes: bytes,
    document_filename: str,
    document_type: Optional[str],
    match_percentage: float,
    matched: bool,
    threshold: float,
    provider_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Persist one document-face-vs-live-face verification into SentinelTrail.

    Media bytes are not stored in MySQL. The rows carry content hashes and generated
    storage object IDs, ready to point at MinIO once object storage is provisioned.
    """
    if not is_enabled():
        return {"enabled": False, "recorded": False}

    conn = _connect()
    try:
        cursor = conn.cursor()
        ids = _ensure_bootstrap(cursor)
        now = _utcnow()
        doc_retention_until = now + timedelta(days=settings.SENTINEL_DOCUMENT_RETENTION_DAYS)
        bio_retention_until = now + timedelta(hours=settings.SENTINEL_BIOMETRIC_RETENTION_HOURS)
        doc_type = _document_type(document_type or document_filename)
        case_uuid = _new_uuid()
        document_uuid = _new_uuid()
        front_file_uuid = _new_uuid()
        crop_file_uuid = _new_uuid()
        live_media_uuid = _new_uuid()
        biometric_uuid = _new_uuid()
        risk_uuid = _new_uuid()
        case_reference = f"TALON-{case_uuid[:8].upper()}"
        result = "pass" if matched else "fail"
        score_ratio = round(max(0.0, min(match_percentage, 100.0)) / 100.0, 4)
        risk = _risk_from_similarity(match_percentage, matched)

        cursor.execute(
            """
            INSERT INTO screening_cases (
                case_id, organization_id, checkpoint_id, intake_device_id,
                case_reference, case_token_hash, status, opened_at, closed_at,
                created_by_user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'in_review', %s, NULL, %s)
            """,
            (
                _uuid_to_bin(case_uuid),
                ids["organization_id"],
                ids["checkpoint_id"],
                ids["device_id"],
                case_reference,
                _sha256_text(case_uuid),
                now,
                ids["officer_user_id"],
            ),
        )
        cursor.execute(
            """
            INSERT INTO documents (
                document_id, case_id, document_type, issuing_country_code,
                issuing_state_code, status, created_at
            )
            VALUES (%s, %s, %s, %s, %s, 'review_ready', %s)
            """,
            (
                _uuid_to_bin(document_uuid),
                _uuid_to_bin(case_uuid),
                doc_type,
                settings.SENTINEL_CHECKPOINT_COUNTRY[:2].upper(),
                settings.SENTINEL_ISSUING_STATE_CODE[:3].upper(),
                now,
            ),
        )
        cursor.execute(
            """
            INSERT INTO document_files (
                document_file_id, document_id, file_role, storage_object_id,
                content_sha256, media_type, byte_size, storage_state,
                malware_scan_status, retention_until, encryption_key_id, capture_metadata
            )
            VALUES (%s, %s, 'front', %s, %s, 'image/jpeg', %s, 'approved',
                'not_applicable', %s, 'talon-demo-local', CAST(%s AS JSON))
            """,
            (
                _uuid_to_bin(front_file_uuid),
                _uuid_to_bin(document_uuid),
                _uuid_to_bin(_new_uuid()),
                _sha256_bytes(document_bytes),
                len(document_bytes),
                doc_retention_until,
                _json(
                    {
                        "source": "talon-face-verification-request",
                        "filename": document_filename,
                        "storage_backend": "prototype-transient-request",
                    }
                ),
            ),
        )
        cursor.execute(
            """
            INSERT INTO document_files (
                document_file_id, document_id, file_role, storage_object_id,
                content_sha256, media_type, byte_size, storage_state,
                malware_scan_status, retention_until, encryption_key_id, capture_metadata
            )
            VALUES (%s, %s, 'evidence_crop', %s, %s, 'image/jpeg', %s, 'approved',
                'not_applicable', %s, 'talon-demo-local', CAST(%s AS JSON))
            """,
            (
                _uuid_to_bin(crop_file_uuid),
                _uuid_to_bin(document_uuid),
                _uuid_to_bin(_new_uuid()),
                _sha256_bytes(document_face_bytes),
                len(document_face_bytes),
                bio_retention_until,
                _json(
                    {
                        "source": "extract_face_from_document",
                        "derived_from_document_file_id": front_file_uuid,
                        "storage_backend": "prototype-transient-request",
                    }
                ),
            ),
        )
        cursor.execute(
            """
            INSERT INTO case_media (
                case_media_id, case_id, media_role, storage_object_id,
                content_sha256, media_type, byte_size, storage_state,
                malware_scan_status, retention_until, encryption_key_id, capture_metadata
            )
            VALUES (%s, %s, 'selfie_image', %s, %s, 'image/jpeg', %s, 'approved',
                'not_applicable', %s, 'talon-demo-local', CAST(%s AS JSON))
            """,
            (
                _uuid_to_bin(live_media_uuid),
                _uuid_to_bin(case_uuid),
                _uuid_to_bin(_new_uuid()),
                _sha256_bytes(live_face_bytes),
                len(live_face_bytes),
                bio_retention_until,
                _json(
                    {
                        "source": "browser-live-capture",
                        "storage_backend": "prototype-transient-request",
                    }
                ),
            ),
        )
        cursor.execute(
            """
            INSERT INTO biometric_checks (
                biometric_check_id, case_id, document_id, source_case_media_id,
                source_document_file_id, check_type, engine_name, engine_version,
                model_version, result, score, retention_until, evidence, performed_at
            )
            VALUES (%s, %s, %s, %s, %s, 'face_match', %s, %s, %s, %s, %s, %s,
                CAST(%s AS JSON), %s)
            """,
            (
                _uuid_to_bin(biometric_uuid),
                _uuid_to_bin(case_uuid),
                _uuid_to_bin(document_uuid),
                _uuid_to_bin(live_media_uuid),
                _uuid_to_bin(crop_file_uuid),
                ENGINE_NAME,
                ENGINE_VERSION,
                MODEL_VERSION,
                result,
                score_ratio,
                bio_retention_until,
                _json(
                    {
                        "provider": "aws-rekognition",
                        "similarity_percentage": match_percentage,
                        "threshold_percentage": threshold,
                        "aws_response": provider_result,
                    }
                ),
                now,
            ),
        )
        cursor.execute(
            """
            INSERT INTO risk_assessments (
                risk_assessment_id, case_id, engine_name, engine_version,
                model_version, policy_version, score, band, recommended_action, assessed_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                _uuid_to_bin(risk_uuid),
                _uuid_to_bin(case_uuid),
                ENGINE_NAME,
                ENGINE_VERSION,
                MODEL_VERSION,
                "talon-demo-risk-v1",
                risk["score"],
                risk["band"],
                risk["recommended_action"],
                now,
            ),
        )
        cursor.execute(
            """
            INSERT INTO risk_contributions (
                risk_contribution_id, risk_assessment_id, source_type, source_id,
                contribution_points, reason_code, evidence, explanation
            )
            VALUES (%s, %s, 'biometric', %s, %s, %s, CAST(%s AS JSON), %s)
            """,
            (
                _uuid_to_bin(_new_uuid()),
                _uuid_to_bin(risk_uuid),
                _uuid_to_bin(biometric_uuid),
                risk["score"],
                "face_similarity_gap",
                _json(
                    {
                        "similarity_percentage": match_percentage,
                        "threshold_percentage": threshold,
                        "matched": matched,
                    }
                ),
                "Similarity gap converted into advisory biometric risk.",
            ),
        )
        _insert_audit_event(
            cursor,
            organization_id=ids["organization_id"],
            actor_user_id=ids["officer_user_id"],
            case_id=_uuid_to_bin(case_uuid),
            entity_type="biometric_check",
            entity_id=_uuid_to_bin(biometric_uuid),
            event_type="face_verification_recorded",
            payload={
                "case_reference": case_reference,
                "matched": matched,
                "match_percentage": match_percentage,
                "threshold": threshold,
                "provider": "aws-rekognition",
            },
        )
        conn.commit()
        return {
            "enabled": True,
            "recorded": True,
            "case_id": case_uuid,
            "case_reference": case_reference,
            "document_id": document_uuid,
            "document_front_file_id": front_file_uuid,
            "document_face_file_id": crop_file_uuid,
            "live_media_id": live_media_uuid,
            "biometric_check_id": biometric_uuid,
            "risk_assessment_id": risk_uuid,
            "risk": risk,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def health_check() -> Dict[str, Any]:
    if not is_enabled():
        return {"enabled": False, "status": "disabled"}

    required_tables = {
        "screening_cases",
        "documents",
        "document_files",
        "case_media",
        "biometric_checks",
        "risk_assessments",
        "audit_events",
    }
    conn = _connect()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            """
        )
        tables = {row[0] for row in cursor.fetchall()}
        missing = sorted(required_tables - tables)
        return {
            "enabled": True,
            "status": "ready" if not missing else "missing_tables",
            "database": settings.SENTINEL_DB_NAME,
            "missing_tables": missing,
        }
    finally:
        conn.close()
