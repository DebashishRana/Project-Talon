# SIH-demo cost and retention policy

> **Demo defaults only:** These settings are configurable for the Smart India Hackathon demonstration. They are not legal, regulatory, or production retention policy. A `legal_holds` record overrides every automated deletion action.

## Suggested defaults

| Data class | SIH-demo default | Storage and deletion rule |
| --- | ---: | --- |
| Quarantined media | 24 hours | Delete automatically unless it becomes approved evidence or is held. |
| Clear-case original document media | 7 days | Shortest practical period for repeat officer review; purge by each file's `retention_until`. |
| Flagged/review-case documents and evidence | 30 days | Restricted access; retain only review-relevant originals and crops. |
| Live selfie/video and biometric references | 12 hours | Shortest retention class; encrypt references and purge quickly after assessment. |
| Legal-hold material | Until release | Suspend automated purge; release requires an authorized, audited action. |

Set `retention_until` when media is approved. A mutable policy is guidance for assigning future deadlines, not a reason to retroactively extend or shorten an object already assigned a deadline.

## Low-cost, security-safe processing

- Before OCR or AI, verify media signature, MIME consistency, dimensions, byte size, and malware status. Process only approved `clean` or `not_applicable` media.
- Cache work by content SHA-256 plus engine, model, and rule version. Reuse a completed OCR, forensic, or validation result only when this full key matches.
- Reprocess only when source content changes or the engine, model, or rule version changes.
- Generate low-resolution, redacted dashboard previews once; do not repeatedly fetch original media for ordinary lists or dashboards.
- Keep full forensic crops and model artifacts only for review/high-risk cases. Store their generated MinIO object IDs and integrity hashes, never public URLs.
- Use bounded worker concurrency, per-job timeouts, limited retries with backoff, and a dead-letter queue/workflow for jobs that exhaust retries. An officer or operator must explicitly retry a dead-letter item.
- Never recompress, alter, or overwrite forensic originals. Derived previews and crops are separate immutable objects with their own hashes.

## Practical operating targets

- Start small: 2 OCR workers and 1 forensic worker per demo host; measure queue depth and CPU before increasing concurrency.
- Enforce upload limits at the gateway and worker: reject oversized, malformed, encrypted/archive-bomb, or unsupported inputs before MinIO processing.
- Run purge jobs in small batches, recheck legal holds immediately before deletion, and mark deletion only after the object-store deletion is verified and recorded.
- Keep MinIO and MySQL on the project-controlled host/network. Back up encrypted metadata and audit hashes; never copy demonstration media into external analytics services.
