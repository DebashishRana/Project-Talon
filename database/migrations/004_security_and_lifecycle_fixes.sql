-- SentinelTrail: forward-only security and lifecycle corrections for MySQL 8.0.
-- Apply after 001, 002, and 003. No database is created or selected here.
SET time_zone = '+00:00';

-- The former display_value may now contain only a masked representation.
ALTER TABLE extracted_fields
  RENAME COLUMN display_value TO redacted_display_value;

-- QR/view tokens are opaque at rest: only a SHA-256/HMAC token hash is stored.
CREATE TABLE case_access_tokens (
  case_access_token_id BINARY(16) NOT NULL,
  case_id BINARY(16) NOT NULL,
  token_hash BINARY(32) NOT NULL,
  purpose ENUM('qr_view','officer_view','device_handoff') NOT NULL,
  issued_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  issued_by_user_id BINARY(16) NOT NULL,
  issued_to_device_id BINARY(16) NULL,
  PRIMARY KEY (case_access_token_id),
  UNIQUE KEY uq_case_access_token_hash (token_hash),
  CONSTRAINT fk_access_token_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id),
  CONSTRAINT fk_access_token_issuer FOREIGN KEY (issued_by_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_access_token_device FOREIGN KEY (issued_to_device_id) REFERENCES registered_devices(device_id),
  CONSTRAINT chk_access_token_expiry CHECK (expires_at > issued_at),
  CONSTRAINT chk_access_token_consumed CHECK (consumed_at IS NULL OR consumed_at >= issued_at),
  CONSTRAINT chk_access_token_revoked CHECK (revoked_at IS NULL OR revoked_at >= issued_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE INDEX ix_access_token_case_purpose_expiry ON case_access_tokens (case_id, purpose, expires_at);
CREATE INDEX ix_access_token_device_expiry ON case_access_tokens (issued_to_device_id, expires_at);

-- Each object receives an immutable retention deadline at intake/approval time.
ALTER TABLE document_files
  ADD COLUMN storage_state ENUM('quarantined','approved','deleted','purge_failed') NOT NULL DEFAULT 'quarantined' AFTER byte_size,
  ADD COLUMN malware_scan_status ENUM('pending','clean','infected','failed','not_applicable') NOT NULL DEFAULT 'pending' AFTER storage_state,
  ADD COLUMN retention_until DATETIME(6) NULL AFTER malware_scan_status,
  ADD COLUMN encryption_key_id VARCHAR(96) NULL AFTER retention_until,
  ADD CONSTRAINT chk_file_approved_retention CHECK (storage_state <> 'approved' OR retention_until IS NOT NULL);
CREATE INDEX ix_file_retention_lifecycle ON document_files (storage_state, retention_until);
CREATE INDEX ix_file_malware_scan ON document_files (malware_scan_status, storage_state);

-- Keep legacy ISO alpha-2 values only for migration context. ICAO issuing-state codes
-- are the fields used by document, MRZ, and rule validation going forward.
ALTER TABLE documents
  ADD COLUMN issuing_state_code CHAR(3) NULL AFTER issuing_country_code,
  ADD CONSTRAINT chk_document_issuing_state_code CHECK (issuing_state_code IS NULL OR issuing_state_code REGEXP '^[A-Z0-9]{3}$');
ALTER TABLE rule_sets
  ADD COLUMN issuing_state_code CHAR(3) NULL AFTER country_code,
  ADD CONSTRAINT chk_rule_issuing_state_code CHECK (issuing_state_code IS NULL OR issuing_state_code REGEXP '^[A-Z0-9]{3}$');
ALTER TABLE mrz_records
  ADD COLUMN issuing_state_code CHAR(3) NULL AFTER format_code,
  ADD CONSTRAINT chk_mrz_issuing_state_code CHECK (issuing_state_code IS NULL OR issuing_state_code REGEXP '^[A-Z0-9]{3}$');
CREATE INDEX ix_documents_issuing_state_type ON documents (issuing_state_code, document_type);
CREATE INDEX ix_rule_issuing_state_version ON rule_sets (issuing_state_code, document_type, status);

-- The only existing demo issuer is India; this makes its migrated records ICAO-compatible.
UPDATE documents SET issuing_state_code = 'IND' WHERE issuing_country_code = 'IN';
UPDATE rule_sets SET issuing_state_code = 'IND' WHERE country_code = 'IN';
UPDATE mrz_records mrz
JOIN extraction_runs er ON er.extraction_run_id = mrz.extraction_run_id
JOIN documents d ON d.document_id = er.document_id
SET mrz.issuing_state_code = d.issuing_state_code
WHERE d.issuing_state_code IS NOT NULL;

-- Case-level live captures are not files of a physical document.
CREATE TABLE case_media (
  case_media_id BINARY(16) NOT NULL,
  case_id BINARY(16) NOT NULL,
  media_role ENUM('selfie_image','selfie_video','case_photo','supporting_media') NOT NULL,
  storage_object_id BINARY(16) NOT NULL,
  storage_object_version VARCHAR(128) NULL,
  content_sha256 BINARY(32) NOT NULL,
  media_type VARCHAR(100) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  storage_state ENUM('quarantined','approved','deleted','purge_failed') NOT NULL DEFAULT 'quarantined',
  malware_scan_status ENUM('pending','clean','infected','failed','not_applicable') NOT NULL DEFAULT 'pending',
  retention_until DATETIME(6) NULL,
  encryption_key_id VARCHAR(96) NULL,
  capture_metadata JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (case_media_id),
  UNIQUE KEY uq_case_media_storage_object (storage_object_id),
  CONSTRAINT fk_case_media_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id),
  CONSTRAINT chk_case_media_size CHECK (byte_size > 0),
  CONSTRAINT chk_case_media_approved_retention CHECK (storage_state <> 'approved' OR retention_until IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE INDEX ix_case_media_case_role ON case_media (case_id, media_role);
CREATE INDEX ix_case_media_retention_lifecycle ON case_media (storage_state, retention_until);

-- Evidence crops now refer to a controlled document file, never a raw object ID.
ALTER TABLE forensic_findings
  ADD COLUMN evidence_document_file_id BINARY(16) NULL AFTER confidence,
  ADD CONSTRAINT fk_finding_evidence_file FOREIGN KEY (evidence_document_file_id) REFERENCES document_files(document_file_id);
UPDATE forensic_findings ff
JOIN document_files df ON df.storage_object_id = ff.evidence_object_id
SET ff.evidence_document_file_id = df.document_file_id;
UPDATE forensic_findings
SET evidence = JSON_SET(COALESCE(evidence, JSON_OBJECT()), '$.legacy_unresolved_evidence_object_id', HEX(evidence_object_id))
WHERE evidence_object_id IS NOT NULL AND evidence_document_file_id IS NULL;
ALTER TABLE forensic_findings DROP COLUMN evidence_object_id;
CREATE INDEX ix_finding_evidence_file ON forensic_findings (evidence_document_file_id);

-- A biometric result explicitly states which live and document evidence it used.
ALTER TABLE biometric_checks
  ADD COLUMN source_case_media_id BINARY(16) NULL AFTER document_id,
  ADD COLUMN source_document_file_id BINARY(16) NULL AFTER source_case_media_id,
  ADD CONSTRAINT fk_biometric_case_media FOREIGN KEY (source_case_media_id) REFERENCES case_media(case_media_id),
  ADD CONSTRAINT fk_biometric_document_file FOREIGN KEY (source_document_file_id) REFERENCES document_files(document_file_id),
  ADD CONSTRAINT chk_biometric_explicit_evidence CHECK (source_case_media_id IS NOT NULL OR source_document_file_id IS NOT NULL);
CREATE INDEX ix_biometric_case_media ON biometric_checks (source_case_media_id);
CREATE INDEX ix_biometric_document_file ON biometric_checks (source_document_file_id);

-- Closure and cancellation timestamps are now bidirectionally consistent.
ALTER TABLE screening_cases DROP CHECK chk_case_closed_at;
ALTER TABLE screening_cases ADD CONSTRAINT chk_case_closed_at
  CHECK ((status IN ('closed','cancelled') AND closed_at IS NOT NULL) OR
         (status NOT IN ('closed','cancelled') AND closed_at IS NULL));

-- The AI and workflow can hold a case for human action, but do not encode entry denial.
UPDATE workflow_decisions SET decision = 'hold' WHERE decision = 'deny_entry';
ALTER TABLE workflow_decisions
  MODIFY COLUMN decision ENUM('clear','refer','hold','cancelled') NOT NULL;
