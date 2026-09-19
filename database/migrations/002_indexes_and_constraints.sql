-- SentinelTrail: performance indexes and additive integrity constraints.
SET time_zone = '+00:00';

CREATE INDEX ix_case_checkpoint_status_opened ON screening_cases (checkpoint_id, status, opened_at);
CREATE INDEX ix_case_org_opened ON screening_cases (organization_id, opened_at);
CREATE INDEX ix_document_case_type ON documents (case_id, document_type);
CREATE INDEX ix_document_number_token ON documents (document_number_lookup_token);
CREATE INDEX ix_subject_name_token ON case_subjects (full_name_lookup_token);
CREATE INDEX ix_subject_dob_token ON case_subjects (date_of_birth_lookup_token);
CREATE INDEX ix_file_document_role ON document_files (document_id, file_role);
CREATE INDEX ix_extraction_document_completed ON extraction_runs (document_id, completed_at);
CREATE INDEX ix_field_lookup_token ON extracted_fields (value_lookup_token);
CREATE INDEX ix_validation_document_run_at ON validation_runs (document_id, run_at);
CREATE INDEX ix_validation_result_run_rule ON validation_results (validation_run_id, rule_code);
CREATE INDEX ix_forensic_document_run_at ON forensic_runs (document_id, run_at);
CREATE INDEX ix_finding_type_severity ON forensic_findings (finding_type, severity);
CREATE INDEX ix_biometric_case_type ON biometric_checks (case_id, check_type, performed_at);
CREATE INDEX ix_biometric_retention ON biometric_checks (retention_until);
CREATE INDEX ix_risk_case_assessed ON risk_assessments (case_id, assessed_at);
CREATE INDEX ix_decision_case_at ON workflow_decisions (case_id, decision_at);
CREATE INDEX ix_audit_org_occurred ON audit_events (organization_id, occurred_at);
CREATE INDEX ix_audit_case_occurred ON audit_events (case_id, occurred_at);
CREATE INDEX ix_hold_case_open ON legal_holds (case_id, released_at);
CREATE INDEX ix_purge_job_status ON purge_jobs (organization_id, status, requested_at);
CREATE INDEX ix_purge_item_status ON purge_job_items (status, document_file_id);

-- MySQL CHECK constraints are enforced in MySQL 8.0.16+.
ALTER TABLE screening_cases ADD CONSTRAINT chk_case_closed_at
  CHECK ((status IN ('closed','cancelled') AND closed_at IS NOT NULL) OR (status NOT IN ('closed','cancelled')));
ALTER TABLE workflow_decisions ADD CONSTRAINT chk_decision_time
  CHECK (decision_at >= '2000-01-01 00:00:00');
ALTER TABLE purge_job_items ADD CONSTRAINT chk_purge_verification
  CHECK (status <> 'deleted' OR object_deletion_verified_at IS NOT NULL);
