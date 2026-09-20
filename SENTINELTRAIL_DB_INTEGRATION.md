# SentinelTrail database integration

This project now has two database layers:

- `backend/veriquickx.db` is the existing lightweight SQLite database used by older upload, QR, and scan-log endpoints.
- `database/` is the database engineer's SentinelTrail MySQL 8.0 package. It is the structured system of record for screening cases, document evidence, live media, biometric checks, risk assessments, workflow decisions, retention, and audit events.

The app does not replace SQLite in one jump. The current integration writes the face-verification session into SentinelTrail when `SENTINEL_DB_ENABLED=true`, while leaving the older app behavior intact when MySQL is not configured.

## What is connected

When the upload wizard reaches the biometric step:

1. The frontend calls `POST /api/face-verification/compare`.
2. `backend/integration/face_validator.py` extracts the document portrait and compares it to the live capture with AWS Rekognition.
3. `backend/integration/sentinel_db.py` records a SentinelTrail case:
   - `screening_cases`: one review-ready case for the verification session.
   - `documents`: the uploaded document classification.
   - `document_files`: original document image plus extracted face crop evidence.
   - `case_media`: live selfie/capture evidence.
   - `biometric_checks`: AWS Rekognition face-match score.
   - `risk_assessments` and `risk_contributions`: advisory risk derived from similarity.
   - `audit_events`: hash-chained audit event for the biometric record.
4. The response includes `sentinel.case_reference`, `sentinel.case_id`, and `sentinel.biometric_check_id`.
5. The verification log drawer shows the SentinelTrail case reference for cross-checking.

No final `workflow_decisions` row is created automatically. The schema guardrails say AI output is advisory; final clear/refer/hold decisions should be officer actions.

## Install backend dependencies

From `mainapp/backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The database bridge needs:

```text
mysql-connector-python==9.0.0
```

## Install MySQL 8.0

Use MySQL 8.0.16 or newer. The package was documented against MySQL 8.0.45, and it depends on enforced `CHECK` constraints.

On Windows, install either:

- MySQL Installer for Windows, or
- Docker Desktop with a MySQL container.

Docker example:

```powershell
docker run --name talon-mysql `
  -e MYSQL_ROOT_PASSWORD=change-root-password `
  -e MYSQL_DATABASE=sentineltrail `
  -p 3306:3306 `
  -d mysql:8.0
```

## Create the application user

Log in as root:

```powershell
mysql -h 127.0.0.1 -P 3306 -u root -p
```

Run:

```sql
CREATE DATABASE IF NOT EXISTS sentineltrail
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'talon_app'@'%' IDENTIFIED BY 'replace-with-strong-password';
GRANT SELECT, INSERT, UPDATE ON sentineltrail.* TO 'talon_app'@'%';
FLUSH PRIVILEGES;
```

For local-only MySQL installed directly on Windows, you can use `'talon_app'@'localhost'` instead of `'%'`.

## Apply migrations

The SQL files do not create or select the database. Apply them to an empty database in filename order:

```powershell
mysql -h 127.0.0.1 -P 3306 -u root -p sentineltrail < database/migrations/001_initial_schema.sql
mysql -h 127.0.0.1 -P 3306 -u root -p sentineltrail < database/migrations/002_indexes_and_constraints.sql
mysql -h 127.0.0.1 -P 3306 -u root -p sentineltrail < database/migrations/003_seed_demo_data.sql
mysql -h 127.0.0.1 -P 3306 -u root -p sentineltrail < database/migrations/004_security_and_lifecycle_fixes.sql
mysql -h 127.0.0.1 -P 3306 -u root -p sentineltrail < database/migrations/005_operational_integrity_fixes.sql
```

Do not apply `003_seed_demo_data.sql` to real production data. It is synthetic demo data.

## Configure backend `.env`

Create `mainapp/backend/.env` from `backend/backend.env.template.txt`, then enable:

```env
SENTINEL_DB_ENABLED=true
SENTINEL_DB_STRICT=false
SENTINEL_DB_HOST=127.0.0.1
SENTINEL_DB_PORT=3306
SENTINEL_DB_NAME=sentineltrail
SENTINEL_DB_USER=talon_app
SENTINEL_DB_PASSWORD=replace-with-strong-password
SENTINEL_DB_SSL_DISABLED=true
SENTINEL_CHECKPOINT_COUNTRY=IN
SENTINEL_ISSUING_STATE_CODE=IND
```

Keep `SENTINEL_DB_STRICT=false` while testing. With strict mode off, Rekognition can still return results even if MySQL is down; the response will include `sentinel.recorded=false` and an error.

## Run and verify

Start the backend:

```powershell
cd mainapp/backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

Check database health:

```powershell
curl.exe -H "Authorization: Bearer veriquickx-secret-token-change-in-production" `
  http://127.0.0.1:8000/api/sentinel-db/health
```

Expected healthy response:

```json
{
  "enabled": true,
  "status": "ready",
  "database": "sentineltrail",
  "missing_tables": []
}
```

Then run a normal document upload and live face capture in the UI. The final screen should show a database reference such as `TALON-1A2B3C4D`.

## Query recorded face checks

In MySQL:

```sql
SELECT
  sc.case_reference,
  sc.status AS case_status,
  d.document_type,
  bc.result AS face_result,
  ROUND(bc.score * 100, 2) AS match_percentage,
  ra.band AS risk_band,
  ra.recommended_action
FROM screening_cases sc
JOIN documents d ON d.case_id = sc.case_id
JOIN biometric_checks bc ON bc.case_id = sc.case_id
LEFT JOIN risk_assessments ra ON ra.case_id = sc.case_id
WHERE sc.case_reference LIKE 'TALON-%'
ORDER BY sc.opened_at DESC
LIMIT 20;
```

To inspect UUIDs:

```sql
SELECT
  BIN_TO_UUID(case_id, 1) AS case_id,
  case_reference,
  opened_at
FROM screening_cases
ORDER BY opened_at DESC
LIMIT 10;
```

## Current limitations

- Media bytes are still processed transiently by FastAPI. MySQL stores hashes and generated object IDs, not actual images.
- The database package expects MinIO for originals, crops, live captures, and previews. That object-storage step is not yet implemented.
- Malware scanning is represented as `not_applicable` for the current prototype bridge.
- Workflow decisions are not automated. Add officer-review endpoints before writing `workflow_decisions`.
- SQLite remains in use for older upload/QR endpoints until those flows are migrated.
