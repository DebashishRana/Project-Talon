-- SentinelTrail: initial relational schema. MySQL 8.0 / InnoDB only.
-- Forward-only migration. Do not add CREATE DATABASE or USE statements here.
SET time_zone = '+00:00';
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE organizations (
  organization_id BINARY(16) NOT NULL,
  organization_code VARCHAR(48) NOT NULL,
  name VARCHAR(160) NOT NULL,
  status ENUM('active','suspended','retired') NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (organization_id), UNIQUE KEY uq_organizations_code (organization_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE checkpoints (
  checkpoint_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL,
  checkpoint_code VARCHAR(48) NOT NULL, name VARCHAR(160) NOT NULL,
  country_code CHAR(2) NOT NULL, timezone_name VARCHAR(64) NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (checkpoint_id), UNIQUE KEY uq_checkpoint_code (organization_id, checkpoint_code),
  CONSTRAINT fk_checkpoint_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE users (
  user_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL,
  external_subject VARCHAR(191) NOT NULL, display_name VARCHAR(160) NOT NULL,
  status ENUM('active','disabled','locked') NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_login_at DATETIME(6) NULL,
  PRIMARY KEY (user_id), UNIQUE KEY uq_user_identity (organization_id, external_subject),
  CONSTRAINT fk_user_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE roles (
  role_id BINARY(16) NOT NULL, role_code VARCHAR(48) NOT NULL, description VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (role_id), UNIQUE KEY uq_role_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE user_roles (
  user_id BINARY(16) NOT NULL, role_id BINARY(16) NOT NULL, granted_by_user_id BINARY(16) NULL,
  granted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
  CONSTRAINT fk_user_role_granter FOREIGN KEY (granted_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE registered_devices (
  device_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL, assigned_user_id BINARY(16) NULL,
  device_public_id VARCHAR(96) NOT NULL, device_type ENUM('workstation','mobile','scanner','camera') NOT NULL,
  public_key_fingerprint BINARY(32) NOT NULL, status ENUM('active','revoked','retired') NOT NULL DEFAULT 'active',
  registered_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), last_seen_at DATETIME(6) NULL,
  PRIMARY KEY (device_id), UNIQUE KEY uq_device_public_id (organization_id, device_public_id),
  CONSTRAINT fk_device_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  CONSTRAINT fk_device_user FOREIGN KEY (assigned_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE screening_cases (
  case_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL, checkpoint_id BINARY(16) NOT NULL,
  intake_device_id BINARY(16) NULL, case_token_hash BINARY(32) NOT NULL, case_reference VARCHAR(64) NOT NULL,
  status ENUM('open','in_review','awaiting_information','closed','cancelled') NOT NULL DEFAULT 'open',
  opened_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), closed_at DATETIME(6) NULL,
  created_by_user_id BINARY(16) NOT NULL, PRIMARY KEY (case_id),
  UNIQUE KEY uq_case_reference (organization_id, case_reference), UNIQUE KEY uq_case_token_hash (case_token_hash),
  CONSTRAINT fk_case_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  CONSTRAINT fk_case_checkpoint FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(checkpoint_id),
  CONSTRAINT fk_case_device FOREIGN KEY (intake_device_id) REFERENCES registered_devices(device_id),
  CONSTRAINT fk_case_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE case_subjects (
  subject_id BINARY(16) NOT NULL, case_id BINARY(16) NOT NULL, full_name_ciphertext BLOB NULL, full_name_lookup_token BINARY(32) NULL,
  date_of_birth_ciphertext BLOB NULL, date_of_birth_lookup_token BINARY(32) NULL, nationality_code CHAR(2) NULL,
  encryption_key_id VARCHAR(96) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (subject_id), UNIQUE KEY uq_subject_case (case_id),
  CONSTRAINT fk_subject_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE documents (
  document_id BINARY(16) NOT NULL, case_id BINARY(16) NOT NULL,
  document_type ENUM('passport','visa','national_id','driving_licence','permit') NOT NULL,
  issuing_country_code CHAR(2) NULL, document_number_ciphertext BLOB NULL, document_number_lookup_token BINARY(32) NULL,
  encryption_key_id VARCHAR(96) NULL, status ENUM('received','processing','review_ready','invalidated') NOT NULL DEFAULT 'received',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (document_id),
  CONSTRAINT fk_document_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE document_files (
  document_file_id BINARY(16) NOT NULL, document_id BINARY(16) NOT NULL,
  file_role ENUM('front','back','pdf','evidence_crop','selfie_video','supporting') NOT NULL,
  storage_object_id BINARY(16) NOT NULL, storage_object_version VARCHAR(128) NULL,
  content_sha256 BINARY(32) NOT NULL, media_type VARCHAR(100) NOT NULL, byte_size BIGINT UNSIGNED NOT NULL,
  original_filename_ciphertext BLOB NULL, capture_metadata JSON NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (document_file_id), UNIQUE KEY uq_file_storage_object (storage_object_id),
  CONSTRAINT fk_file_document FOREIGN KEY (document_id) REFERENCES documents(document_id),
  CONSTRAINT chk_file_size CHECK (byte_size > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE extraction_runs (
  extraction_run_id BINARY(16) NOT NULL, document_id BINARY(16) NOT NULL, source_file_id BINARY(16) NOT NULL,
  engine_name VARCHAR(96) NOT NULL, engine_version VARCHAR(96) NOT NULL, model_version VARCHAR(96) NULL,
  status ENUM('queued','completed','failed') NOT NULL, started_at DATETIME(6) NOT NULL, completed_at DATETIME(6) NULL,
  payload JSON NULL, PRIMARY KEY (extraction_run_id),
  CONSTRAINT fk_extraction_document FOREIGN KEY (document_id) REFERENCES documents(document_id),
  CONSTRAINT fk_extraction_file FOREIGN KEY (source_file_id) REFERENCES document_files(document_file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE extracted_fields (
  extracted_field_id BINARY(16) NOT NULL, extraction_run_id BINARY(16) NOT NULL, field_name VARCHAR(80) NOT NULL,
  value_ciphertext BLOB NULL, value_lookup_token BINARY(32) NULL, display_value VARCHAR(255) NULL,
  confidence DECIMAL(5,4) NOT NULL, normalized_format VARCHAR(80) NULL, page_number SMALLINT UNSIGNED NULL,
  bounding_box JSON NULL, PRIMARY KEY (extracted_field_id), UNIQUE KEY uq_extract_field (extraction_run_id, field_name),
  CONSTRAINT fk_field_run FOREIGN KEY (extraction_run_id) REFERENCES extraction_runs(extraction_run_id),
  CONSTRAINT chk_field_confidence CHECK (confidence >= 0 AND confidence <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE mrz_records (
  mrz_record_id BINARY(16) NOT NULL, extraction_run_id BINARY(16) NOT NULL, raw_mrz_ciphertext BLOB NOT NULL,
  format_code VARCHAR(16) NOT NULL, document_number_checksum_valid BOOLEAN NOT NULL, birth_date_checksum_valid BOOLEAN NOT NULL,
  expiry_date_checksum_valid BOOLEAN NOT NULL, composite_checksum_valid BOOLEAN NULL,
  visual_mrz_contradiction BOOLEAN NOT NULL DEFAULT FALSE, contradiction_summary VARCHAR(500) NULL,
  PRIMARY KEY (mrz_record_id), UNIQUE KEY uq_mrz_run (extraction_run_id),
  CONSTRAINT fk_mrz_run FOREIGN KEY (extraction_run_id) REFERENCES extraction_runs(extraction_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE rule_sets (
  rule_set_id BINARY(16) NOT NULL, document_type ENUM('passport','visa','national_id','driving_licence','permit') NOT NULL,
  country_code CHAR(2) NOT NULL, template_version VARCHAR(64) NOT NULL, rule_version VARCHAR(64) NOT NULL,
  status ENUM('draft','active','retired') NOT NULL DEFAULT 'draft', rules_payload JSON NOT NULL,
  effective_from DATETIME(6) NOT NULL, effective_to DATETIME(6) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (rule_set_id), UNIQUE KEY uq_rule_version (document_type, country_code, template_version, rule_version),
  CONSTRAINT chk_rule_window CHECK (effective_to IS NULL OR effective_to > effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE validation_runs (
  validation_run_id BINARY(16) NOT NULL, document_id BINARY(16) NOT NULL, rule_set_id BINARY(16) NOT NULL,
  engine_name VARCHAR(96) NOT NULL, engine_version VARCHAR(96) NOT NULL, status ENUM('completed','failed') NOT NULL,
  run_at DATETIME(6) NOT NULL, PRIMARY KEY (validation_run_id),
  CONSTRAINT fk_validation_document FOREIGN KEY (document_id) REFERENCES documents(document_id),
  CONSTRAINT fk_validation_rule FOREIGN KEY (rule_set_id) REFERENCES rule_sets(rule_set_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE validation_results (
  validation_result_id BINARY(16) NOT NULL, validation_run_id BINARY(16) NOT NULL, rule_code VARCHAR(96) NOT NULL,
  severity ENUM('info','low','medium','high','critical') NOT NULL, passed BOOLEAN NOT NULL,
  evidence JSON NULL, explanation VARCHAR(1000) NOT NULL, PRIMARY KEY (validation_result_id),
  CONSTRAINT fk_validation_result_run FOREIGN KEY (validation_run_id) REFERENCES validation_runs(validation_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE forensic_runs (
  forensic_run_id BINARY(16) NOT NULL, document_id BINARY(16) NOT NULL, source_file_id BINARY(16) NOT NULL,
  engine_name VARCHAR(96) NOT NULL, engine_version VARCHAR(96) NOT NULL, model_version VARCHAR(96) NULL,
  status ENUM('completed','failed') NOT NULL, run_at DATETIME(6) NOT NULL, payload JSON NULL, PRIMARY KEY (forensic_run_id),
  CONSTRAINT fk_forensic_document FOREIGN KEY (document_id) REFERENCES documents(document_id),
  CONSTRAINT fk_forensic_file FOREIGN KEY (source_file_id) REFERENCES document_files(document_file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE forensic_findings (
  forensic_finding_id BINARY(16) NOT NULL, forensic_run_id BINARY(16) NOT NULL,
  finding_type ENUM('photo_replacement','text_manipulation','copy_move','resampling','fake_stamp','metadata_anomaly') NOT NULL,
  severity ENUM('info','low','medium','high','critical') NOT NULL, confidence DECIMAL(5,4) NOT NULL,
  evidence_object_id BINARY(16) NULL, evidence JSON NULL, explanation VARCHAR(1000) NOT NULL,
  PRIMARY KEY (forensic_finding_id),
  CONSTRAINT fk_finding_run FOREIGN KEY (forensic_run_id) REFERENCES forensic_runs(forensic_run_id),
  CONSTRAINT chk_finding_confidence CHECK (confidence >= 0 AND confidence <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE biometric_checks (
  biometric_check_id BINARY(16) NOT NULL, case_id BINARY(16) NOT NULL, document_id BINARY(16) NULL,
  check_type ENUM('face_match','liveness') NOT NULL, engine_name VARCHAR(96) NOT NULL, engine_version VARCHAR(96) NOT NULL,
  model_version VARCHAR(96) NOT NULL, result ENUM('pass','fail','inconclusive','error') NOT NULL,
  score DECIMAL(7,6) NULL, biometric_reference_ciphertext BLOB NULL, encryption_key_id VARCHAR(96) NULL,
  retention_until DATETIME(6) NULL, evidence JSON NULL, performed_at DATETIME(6) NOT NULL,
  PRIMARY KEY (biometric_check_id),
  CONSTRAINT fk_biometric_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id),
  CONSTRAINT fk_biometric_document FOREIGN KEY (document_id) REFERENCES documents(document_id),
  CONSTRAINT chk_biometric_score CHECK (score IS NULL OR (score >= 0 AND score <= 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE risk_assessments (
  risk_assessment_id BINARY(16) NOT NULL, case_id BINARY(16) NOT NULL, engine_name VARCHAR(96) NOT NULL,
  engine_version VARCHAR(96) NOT NULL, model_version VARCHAR(96) NULL, policy_version VARCHAR(96) NOT NULL,
  score DECIMAL(6,3) NOT NULL, band ENUM('low','medium','high','critical') NOT NULL,
  recommended_action ENUM('proceed','review','escalate') NOT NULL, assessed_at DATETIME(6) NOT NULL,
  PRIMARY KEY (risk_assessment_id),
  CONSTRAINT fk_risk_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id),
  CONSTRAINT chk_risk_score CHECK (score >= 0 AND score <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE risk_contributions (
  risk_contribution_id BINARY(16) NOT NULL, risk_assessment_id BINARY(16) NOT NULL, source_type VARCHAR(48) NOT NULL,
  source_id BINARY(16) NULL, contribution_points DECIMAL(6,3) NOT NULL, reason_code VARCHAR(96) NOT NULL,
  evidence JSON NOT NULL, explanation VARCHAR(1000) NOT NULL, PRIMARY KEY (risk_contribution_id),
  CONSTRAINT fk_contribution_risk FOREIGN KEY (risk_assessment_id) REFERENCES risk_assessments(risk_assessment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE workflow_decisions (
  workflow_decision_id BINARY(16) NOT NULL, case_id BINARY(16) NOT NULL, officer_user_id BINARY(16) NOT NULL,
  decision ENUM('clear','refer','deny_entry','cancelled') NOT NULL, rationale VARCHAR(2000) NOT NULL,
  decision_at DATETIME(6) NOT NULL, supersedes_decision_id BINARY(16) NULL, PRIMARY KEY (workflow_decision_id),
  CONSTRAINT fk_decision_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id),
  CONSTRAINT fk_decision_officer FOREIGN KEY (officer_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_decision_prior FOREIGN KEY (supersedes_decision_id) REFERENCES workflow_decisions(workflow_decision_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_events (
  audit_event_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL, actor_user_id BINARY(16) NULL,
  case_id BINARY(16) NULL, event_type VARCHAR(96) NOT NULL, entity_type VARCHAR(96) NOT NULL, entity_id BINARY(16) NULL,
  occurred_at DATETIME(6) NOT NULL, payload JSON NOT NULL, previous_event_hash BINARY(32) NULL, event_hash BINARY(32) NOT NULL,
  PRIMARY KEY (audit_event_id), UNIQUE KEY uq_audit_hash (event_hash),
  CONSTRAINT fk_audit_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_audit_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE retention_policies (
  retention_policy_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL,
  document_type ENUM('passport','visa','national_id','driving_licence','permit','all') NOT NULL,
  retention_days INT UNSIGNED NOT NULL, biometric_retention_days INT UNSIGNED NOT NULL,
  status ENUM('active','retired') NOT NULL DEFAULT 'active', effective_from DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (retention_policy_id),
  CONSTRAINT fk_retention_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  CONSTRAINT chk_retention_days CHECK (retention_days > 0 AND biometric_retention_days > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE legal_holds (
  legal_hold_id BINARY(16) NOT NULL, case_id BINARY(16) NOT NULL, hold_reference VARCHAR(96) NOT NULL,
  reason VARCHAR(1000) NOT NULL, placed_by_user_id BINARY(16) NOT NULL, placed_at DATETIME(6) NOT NULL,
  released_by_user_id BINARY(16) NULL, released_at DATETIME(6) NULL, PRIMARY KEY (legal_hold_id), UNIQUE KEY uq_hold_ref (hold_reference),
  CONSTRAINT fk_hold_case FOREIGN KEY (case_id) REFERENCES screening_cases(case_id),
  CONSTRAINT fk_hold_placer FOREIGN KEY (placed_by_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_hold_releaser FOREIGN KEY (released_by_user_id) REFERENCES users(user_id),
  CONSTRAINT chk_hold_release CHECK ((released_by_user_id IS NULL) = (released_at IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE purge_jobs (
  purge_job_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL, retention_policy_id BINARY(16) NOT NULL,
  status ENUM('planned','running','completed','failed','cancelled') NOT NULL DEFAULT 'planned',
  requested_at DATETIME(6) NOT NULL, completed_at DATETIME(6) NULL, requested_by_user_id BINARY(16) NOT NULL,
  execution_evidence JSON NULL, PRIMARY KEY (purge_job_id),
  CONSTRAINT fk_purge_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  CONSTRAINT fk_purge_policy FOREIGN KEY (retention_policy_id) REFERENCES retention_policies(retention_policy_id),
  CONSTRAINT fk_purge_requester FOREIGN KEY (requested_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE purge_job_items (
  purge_job_item_id BINARY(16) NOT NULL, purge_job_id BINARY(16) NOT NULL, document_file_id BINARY(16) NOT NULL,
  status ENUM('pending','deleted','skipped_legal_hold','failed') NOT NULL DEFAULT 'pending',
  object_deletion_verified_at DATETIME(6) NULL, deletion_certificate JSON NULL, failure_reason VARCHAR(1000) NULL,
  PRIMARY KEY (purge_job_item_id), UNIQUE KEY uq_purge_job_file (purge_job_id, document_file_id),
  CONSTRAINT fk_purge_item_job FOREIGN KEY (purge_job_id) REFERENCES purge_jobs(purge_job_id),
  CONSTRAINT fk_purge_item_file FOREIGN KEY (document_file_id) REFERENCES document_files(document_file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
