

## Detailed Database Analysis: Project Fennec 
### **Overall Architecture**

The mainapp uses a **hybrid multi-database system**:

1. **SQLite (Local)** — Document records and scan logs
2. **Azure Blob Storage** — Actual image/PDF files  
3. **PostgreSQL (Remote)** — Dashboard integration for verification events

---

### **1. SQLite Database** (`veriquickx.db`)

Located at: `veriquickx.db`

This is a **local SQLite database** that stores all document processing records:

#### **`uploads` Table** — Core verification records
| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT (UUID) | Unique upload identifier |
| `filename` | TEXT | Original document filename |
| `file_type` | TEXT | MIME type (pdf, jpeg, png) |
| `document_type` | TEXT | Detected type (Aadhaar, Passport, PAN) |
| `blob_name` | TEXT | Path in Azure (`{uuid}/filename`) |
| `container` | TEXT | Azure container (`incoming-docs` or `verified-docs`) |
| `verified` | BOOLEAN | 1 = passed verification, 0 = failed/pending |
| `storage_status` | TEXT | 'staged', 'retained', or 'deleted' |
| `retention_until` | TEXT | ISO timestamp for retention policy |
| `metadata` | TEXT (JSON) | OCR text, model scores, confidence, extracted fields |
| `created_at` | TEXT | Upload timestamp |
| `verified_at` | TEXT | Verification completion timestamp |

**Example metadata JSON stored:**
```json
{
  "extracted_text": "PAN: AAACR5055K...",
  "document_type": "PAN",
  "model_result": {
    "confidence": 0.95,
    "expected_document": true,
    "document_type": "PAN"
  },
  "qr_data": "..."
}
```

#### **`scan_logs` Table** — QR code tracking
| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Auto-increment ID |
| `qr_id` | TEXT | Reference to `uploads.id` |
| `scanned_at` | TEXT | Scan timestamp |
| `ip_address` | TEXT | Scanner's IP |
| `user_agent` | TEXT | Device/browser info |
| `success` | BOOLEAN | Scan successful? |
| `error_message` | TEXT | Error details |

---

### **2. Image Storage: Azure Blob Storage**

Documents are **not stored in SQLite** — only references to Azure are stored.

**Two Containers:**
- **`incoming-docs`** → Staging area for newly uploaded files (deleted after verification)
- **`verified-docs`** → Permanent storage for verified documents

**Access Model:**
- **Upload**: Write-only SAS token, 5-minute expiry
- **Download**: Read-only SAS token, 30-60 second expiry (embedded in QR codes)

The backend generates SAS (Shared Access Signature) URLs with:
- Time-limited access (prevents unauthorized sharing)
- Permission-limited (read-only or write-only)
- No permanent URLs

---

### **3. PostgreSQL Database** (Web App & Dashboard)

This is a **separate remote database** used by the web app dashboard to show analytics:

#### **`users` Table**
- Stores user accounts with OAuth (Google Sign-In)
- Tracks login history

#### **`documents` Table**
- References documents uploaded by users
- Stores verification status (`pending`, `verified`, `rejected`)
- Contains `results` (JSONB) with verification output

#### **`verification_events` Table** (Most Important)
Receives events published by mainapp backend via webhook:

| Column | Type | Content |
|--------|------|---------|
| `user_id` | INTEGER | Associated user |
| `document_type` | VARCHAR | Detected type |
| `metadata` | JSONB | Full verification pipeline data |
| `received_at` | TIMESTAMP | Event arrival time |

**Metadata includes:**
```json
{
  "status": "verified",
  "confidence": 0.95,
  "api_source": "upload_ocr_models",
  "risk_score": 0.1,
  "extracted_fields": { ... },
  "pipeline": {
    "uploaded": true,
    "document_detected": true,
    "ocr_successful": true,
    "authenticity_passed": true
  }
}
```

---

### **Data Flow Diagram**

```
User Upload
    ↓
[FastAPI Backend]
    ↓
1. Create SQLite record in uploads table
2. Generate Azure SAS URL (write-only)
3. User uploads file directly to Azure Blob
    ↓
4. Process document:
   - OCR extraction (pytesseract)
   - Model inference (Aadhaar/Passport detection)
   - Store metadata in SQLite metadata column
    ↓
5. Publish event to PostgreSQL dashboard
   - webhook: POST /api/verification-ingest
   - Signature-verified with HMAC-SHA256
    ↓
6. Generate QR code with SAS URL
   - QR contains read-only Azure SAS URL
   - Expires in 30-60 seconds
    ↓
7. Log scan in scan_logs when QR is scanned
```

---

### **Why This Architecture?**

| Decision | Reason |
|----------|--------|
| **SQLite for mainapp** | Local processing, fast OCR/model inference, no network latency |
| **Azure Blob Storage** | Scalable, secure, temporary file retention, compliance-ready |
| **PostgreSQL for dashboard** | Multi-user analytics, ACID transactions, complex queries |
| **SAS tokens** | Secure, time-limited, no permanent credentials exposed |
| **Webhook integration** | Decoupled services, dashboard doesn't block document processing |

---

### **Important Notes**

1. **Images are NOT stored in SQLite** — only JSON metadata
2. **Azure Blob is the source of truth** for actual documents
3. **PostgreSQL dashboard is optional** — mainapp works standalone
4. **Records stay in SQLite** unless explicitly migrated
5. **Verified documents can be retained or deleted** based on `storage_status` policy