# Main App Fixes and Checks Brief

## Purpose

Use this brief to inspect, diagnose, and fix the VeriQuickX main app upload pipeline. The goal is to make the real app flow production-ready while keeping Azure Blob Storage as temporary staging only, not as the system of record.

This is an execution brief for the AI builder:

- Inspect the current implementation first.
- Fix only what the codebase actually supports.
- Report blockers explicitly.
- Validate the upload path end to end before closing the task.

## Current Contract

The main app should behave like this:

1. A user uploads a document from the portal.
2. The frontend requests a short-lived Azure SAS upload URL from the backend.
3. The browser uploads the file directly to Azure Blob Storage.
4. The backend processes the uploaded file.
5. The uploaded blob is deleted after processing unless an explicit retention rule says otherwise.
6. Only derived data, logs, and results remain in the application system of record.

Important:

- Azure Blob is staging only.
- Do not treat Blob as permanent document storage.
- Do not rely on Blob for long-term access after processing.

## What To Inspect

Inspect the real implementation before changing anything:

- `mainapp/backend/main.py`
- `mainapp/backend/azure_storage.py`
- `mainapp/backend/config.py`
- `mainapp/backend/document_processor.py`
- `mainapp/backend/validators.py`
- `mainapp/frontend/src/pages/UploadPage.jsx`
- `mainapp/frontend/src/pages/DashboardPage.jsx`
- `mainapp/frontend/src/utils/api.js`
- `mainapp/frontend/src/App.jsx`
- `mainapp/README.md`
- `mainapp/DEPLOYMENT.md`

## Fix Areas

### 1. Azure Blob staging flow

- Confirm the backend issues SAS URLs correctly.
- Confirm the frontend uses the real backend API in production.
- Confirm the browser PUT upload to Blob uses the expected headers and container rules.
- Confirm blob cleanup runs after successful processing and after failure paths.
- Confirm the frontend is not stuck in demo mode for production usage.

### 2. Upload completion flow

- Confirm `upload -> process -> verify -> cleanup` works without manual patching.
- Confirm failed uploads do not leave stale blobs or stale DB rows.
- Confirm successful uploads do not depend on permanent blob retention.
- Confirm multi-file uploads handle partial success and partial cleanup correctly.

### 3. Model integration reality

The repository has model registry abstractions, but the AI builder must verify whether the three deep-learning models actually exist as deployable artifacts.

Required actions:

- Check whether there are real model files, weights, packaged inference code, or startup wiring.
- If artifacts exist, define the production inference path and run it after upload processing.
- If artifacts do not exist, state that clearly as a blocker.
- Do not pretend the models are production-ready if they are only abstractions.

Use the model layer only in one of these ways:

- Production inference path if the artifacts and wiring are present.
- Explicit blocker and roadmap item if they are missing.

### 4. Compliance and certificate workstream

Clarify what “compliance” and “certificate” mean in this project before implementing them.

Check whether the app currently supports:

- audit logging
- consent or notice capture
- retention and deletion policy
- exportable records
- certificate generation

Record clearly:

- what is implemented
- what is partially implemented
- what is only planned
- what is missing entirely

Do not claim legal or regulatory compliance unless the code actually supports it.

## Checklist For Fixes

Use this checklist while working:

- Azure Blob connectivity and CORS
- SAS issuance and expiry
- frontend API base configuration
- backend API URL alignment
- blob cleanup after processing
- upload retry and failure handling
- model loading and inference readiness
- model-missing fallback behavior
- audit logs and error traces
- compliance/certificate data flow

## Check-In Format

Use this format for progress updates:

```text
Check-in
- What I inspected:
- What is currently broken:
- What I fixed:
- What remains:
- Blockers:
- Validation status:
```

## Expected Verification

Before finishing, verify the following:

- The doc references the real main-app upload flow.
- Blob storage is documented as temporary staging only.
- Missing model artifacts are reported, not assumed.
- The plan separates storage fixes from ML productionization.
- The plan separates compliance facts from compliance assumptions.
- The AI builder has a clear inspect -> diagnose -> fix -> validate sequence.

If automated validation is available, run it. If not, include a manual end-to-end checklist.

## Out Of Scope

- Do not add Dropbox instructions.
- Do not make Blob a permanent document repository.
- Do not invent model weights or inference services.
- Do not invent compliance claims.
- Do not rewrite the whole README unless the task explicitly asks for it.

