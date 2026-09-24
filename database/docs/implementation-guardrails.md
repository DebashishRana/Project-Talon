# Talon implementation guardrails

These rules keep the SIH prototype aligned with its self-hosted, officer-assist design.

## Architecture boundaries

- Use self-hosted MySQL 8.0 as the sole structured system of record. Do not add an external database-as-a-service.
- Use self-hosted MinIO for originals, crops, previews, and model artifacts. Store generated object IDs and integrity hashes in MySQL; never direct MinIO URLs in the UI or QR codes.
- QR codes contain only short-lived opaque tokens. The backend resolves them after authorization and token-lifecycle checks.
- Do not add a vector database for one-to-one face matching. Compare the approved live capture with the document portrait within the controlled biometric worker.
- Do not add blockchain. Hash-chained `audit_events`, database access control, external audit-hash anchoring, and verified purge records are the appropriate prototype controls.

## Safety and privacy boundaries

- AI risk output is advisory. It may recommend `proceed`, `review`, or `escalate`; it must never create an automatic enforcement decision. Final workflow outcomes require an officer.
- Never store raw biometric embeddings, face templates, or liveness vectors in plaintext fields or JSON. Retain encrypted references only, for the shortest configured period.
- Encrypt sensitive identity values in the application before MySQL insertion. Use masked displays and HMAC lookup tokens, not plaintext search fields.
- Do not use real passport, visa, national-ID, licence, or biometric data in the demo. Use synthetic, openly licensed, or consent-based inputs only.
- Do not overwrite originals, especially forensic originals. Write derived material as new immutable objects.

## Processing and access boundaries

- Accept media for OCR/AI only after signature, size, dimensions, and malware checks; approved media must be `clean` or `not_applicable`.
- Deduplicate processing by content hash plus engine/model/rule version. Re-run only for changed content or changed versions.
- Consume QR/view tokens atomically: validate hash, expiry, purpose, role/device binding, revocation, and unused status, then set `consumed_at` once.
- Apply least privilege: workers cannot make workflow decisions; officers cannot bypass audit logging; services cannot update or delete audit events.
- Treat legal holds as a hard stop for automated deletion. Verify object deletion before recording a purge item as deleted.
