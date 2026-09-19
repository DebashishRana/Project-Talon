# MySQL 8.0 disposable-database validation plan

> **Do not run this against production.** Execute only after a MySQL host, account, and empty disposable database are explicitly authorized. This plan does not authorize a connection today.

## Preconditions

1. Confirm `SELECT VERSION();` reports MySQL **8.0.16 or newer**. Earlier versions do not enforce the required `CHECK` constraints.
2. Create or select an empty disposable database with `utf8mb4`; set the client session to UTC.
3. Record the operator identity and SHA-256 checksum of each exact migration file for the migration ledger.
4. Apply, in order, `001_initial_schema.sql` through `005_operational_integrity_fixes.sql`. Stop on the first error. After each file, run `SHOW WARNINGS;`.

## Schema and seed checks

| Test | Command / action | Expected result |
| --- | --- | --- |
| All migrations | `SHOW TABLES;` | Includes `case_access_tokens`, `case_media`, and `schema_migration_history`. |
| Final columns | `SHOW COLUMNS FROM extracted_fields;` | `redacted_display_value` exists; `display_value` does not. |
| Synthetic file lifecycle | Query the four IDs beginning `72000000-...` using `BIN_TO_UUID(document_file_id,1)` | Exactly 4 rows; each is `approved`, `not_applicable`, has future `retention_until`, and key ID `demo-key-not-production`. |
| Clear case closure | Query `SYN-CASE-001` | `status='closed'`, non-null `closed_at`. |
| Issuer migration | Query active demo `rule_sets` | `issuing_state_code='IND'`; legacy alpha-2 code is not used for active identity. |
| Ledger | Insert one verified row per applied migration | Inserts succeed once; duplicate version or filename fails. |

## Constraint and foreign-key tests

Use fresh generated UUIDs and valid existing parent IDs for all test inserts. Roll back test data after each group.

| Test | Expected pass/fail |
| --- | --- |
| Insert an approved `document_files` row with `malware_scan_status='clean'` and non-null `retention_until` | **Pass**. |
| Insert approved document/case media with `infected` or `pending` malware status | **Fail**: approved-media malware check. |
| Insert approved document/case media with null `retention_until` | **Fail**: approved-media retention check. |
| Insert `purge_job_items` with only an existing `document_file_id` | **Pass**. |
| Insert `purge_job_items` with only an existing `case_media_id` | **Pass**. |
| Insert a purge item with neither target or with both targets | **Fail**: exactly-one-target check. |
| Insert a second identical target in the same purge job | **Fail**: relevant per-job unique key. |
| Insert a purge item pointing to a nonexistent file/media UUID | **Fail**: foreign key. |
| Insert `face_match` with both live case media and document-file sources | **Pass**. |
| Insert `face_match` missing either source | **Fail**: biometric evidence-by-type check. |
| Insert `liveness` with live case media | **Pass**. |
| Insert `liveness` without live case media | **Fail**: biometric evidence-by-type check. |
| Insert a second active rule with identical document type, ICAO issuing state, template, and rule version | **Fail**: active-rule unique key. |
| Insert inactive/draft rules with that same identity | **Pass**: active-only generated identity is null for inactive rows. |

## Token and workflow tests

1. Create a `case_access_tokens` row with only a hash, a future expiry, permitted purpose, issuer, and optional device. **Expected: pass.**
2. Attempt expiry before issue time. **Expected: fail** the token expiry check.
3. In the backend test harness, run two concurrent token-consumption attempts. The first validated transaction sets `consumed_at`; the second sees it consumed and is rejected. **Expected: exactly one success.**
4. Attempt a QR/view request with the wrong purpose, expired token, revoked token, wrong device, or unauthorized role. **Expected: reject without setting `consumed_at`.**
5. Verify a risk assessment alone cannot create a final workflow decision. **Expected: an authenticated officer action and audit event are required.**

## Operational verification

- Confirm OCR, validation, and forensic demo runs reference approved synthetic files, never quarantined or infected media.
- Create a legal hold for a case, schedule its media for purge, and verify the purge workflow records `skipped_legal_hold` rather than deletion.
- For an eligible object, delete it in MinIO through the controlled worker, verify absence, then set the purge item to `deleted` with `object_deletion_verified_at` and deletion certificate. Attempting `deleted` without verification must fail.
- Publish rule sets through the backend workflow: attempt overlapping active effective-date windows with the same active identity. **Expected: backend rejects**; MySQL 8.0 has no exclusion constraint for date ranges.

## Final checkpoint

Only after every check passes on the disposable MySQL 8.0 database may the team generate a visual Mermaid ER diagram and optional SVG from `SHOW CREATE TABLE` output of the actual schema. Until then, maintain [the textual ER diagram](erd.md) as the source of truth.
