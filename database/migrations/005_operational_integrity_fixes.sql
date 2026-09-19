-- SentinelTrail: forward-only operational-integrity corrections for MySQL 8.0.
-- Apply after 001 through 004. No database is created or selected here.
SET time_zone = '+00:00';

-- Migration 003 pre-dates file lifecycle columns. Repair only its four synthetic files
-- before adding the approved-media safety constraint. A ten-year demo retention is
-- calculated at migration time and is not a production retention-policy default.
UPDATE document_files
SET storage_state = 'approved',
    malware_scan_status = 'not_applicable',
    retention_until = DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 3650 DAY),
    encryption_key_id = 'demo-key-not-production'
WHERE document_file_id IN (
  UUID_TO_BIN('72000000-0000-4000-8000-000000000001', 1),
  UUID_TO_BIN('72000000-0000-4000-8000-000000000002', 1),
  UUID_TO_BIN('72000000-0000-4000-8000-000000000003', 1),
  UUID_TO_BIN('72000000-0000-4000-8000-000000000004', 1)
);

ALTER TABLE document_files
  ADD CONSTRAINT chk_file_approved_malware
  CHECK (storage_state <> 'approved' OR malware_scan_status IN ('clean','not_applicable'));
ALTER TABLE case_media
  ADD CONSTRAINT chk_case_media_approved_malware
  CHECK (storage_state <> 'approved' OR malware_scan_status IN ('clean','not_applicable'));

-- Preserve existing document-file purge history while allowing exactly one target
-- (a document file or case-level media object) per purge item.
-- The replacement job index is added first because the old composite unique key also
-- supports the existing purge-job foreign key.
ALTER TABLE purge_job_items
  ADD KEY ix_purge_item_job (purge_job_id);
ALTER TABLE purge_job_items
  DROP FOREIGN KEY fk_purge_item_file;
ALTER TABLE purge_job_items
  DROP INDEX uq_purge_job_file;
ALTER TABLE purge_job_items
  MODIFY COLUMN document_file_id BINARY(16) NULL,
  ADD COLUMN case_media_id BINARY(16) NULL AFTER document_file_id,
  ADD UNIQUE KEY uq_purge_job_document_file (purge_job_id, document_file_id),
  ADD UNIQUE KEY uq_purge_job_case_media (purge_job_id, case_media_id),
  ADD KEY ix_purge_item_document_file (document_file_id),
  ADD KEY ix_purge_item_case_media (case_media_id),
  ADD CONSTRAINT fk_purge_item_file FOREIGN KEY (document_file_id) REFERENCES document_files(document_file_id),
  ADD CONSTRAINT fk_purge_item_case_media FOREIGN KEY (case_media_id) REFERENCES case_media(case_media_id),
  ADD CONSTRAINT chk_purge_item_one_target
  CHECK ((document_file_id IS NOT NULL AND case_media_id IS NULL) OR
         (document_file_id IS NULL AND case_media_id IS NOT NULL));

-- Face matching needs a live capture and a document portrait; liveness needs a live capture.
ALTER TABLE biometric_checks
  ADD CONSTRAINT chk_biometric_evidence_by_type
  CHECK ((check_type = 'face_match' AND source_case_media_id IS NOT NULL AND source_document_file_id IS NOT NULL) OR
         (check_type = 'liveness' AND source_case_media_id IS NOT NULL));

-- MySQL has no partial unique index. A NULL generated key for inactive rows makes the
-- unique index apply only to active rule versions. The backend must also reject
-- overlapping active effective-date windows before publishing a rule set.
ALTER TABLE rule_sets
  ADD COLUMN active_rule_identity VARCHAR(260)
  GENERATED ALWAYS AS (
    CASE WHEN status = 'active'
      THEN CONCAT(document_type, ':', issuing_state_code, ':', template_version, ':', rule_version)
      ELSE NULL
    END
  ) STORED,
  ADD CONSTRAINT chk_active_rule_issuing_state
  CHECK (status <> 'active' OR issuing_state_code IS NOT NULL),
  ADD UNIQUE KEY uq_active_rule_issuing_state_version (active_rule_identity);

-- CLI deployment ledger. Checksum values are SHA-256 bytes calculated from the exact
-- applied file; operator_identity is a human or CI/CD principal, not a database secret.
CREATE TABLE schema_migration_history (
  migration_version VARCHAR(16) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  checksum_sha256 BINARY(32) NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  operator_identity VARCHAR(191) NOT NULL,
  PRIMARY KEY (migration_version),
  UNIQUE KEY uq_schema_migration_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
