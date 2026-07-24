# VeriQuickX - Document Verification System

A comprehensive full-stack application for document upload, temporary Azure Blob staging, document processing, and verification. Supports Aadhaar and PAN card processing with advanced validation algorithms.

## ðŸš€ Features

- **Document Upload**: Upload PDF or image documents (Aadhaar, PAN, or any ID)
- **Azure Blob Storage**: Temporary staging only with SAS-based upload access
- **QR Code Support**: Demo-mode or retention-enabled QR flows only
- **QR Scanner**: Scan QR codes when a retained document flow is enabled
- **Metadata Extraction**: Automatic extraction of name, DOB, PAN/Aadhaar numbers
- **Document Validation**: PAN checksum validation, Aadhaar QR validation
- **Verification Lifecycle**: Documents move from incoming staging to processed results, then Blob is cleaned up by default
- **Admin Panel**: Manage files, view scan logs, delete documents
- **Multi-file Upload**: Upload multiple documents at once
- **Direct Upload**: Frontend uploads directly to Azure (no backend file streaming)

## ðŸ”’ Why SAS Instead of Public Links?

**Security by Design:**
- **No Public Access**: Containers are private; only SAS tokens grant temporary upload access
- **Time-Limited**: Uploaded blobs are cleaned up after processing unless retention is explicitly enabled
- **Credential Isolation**: Azure credentials never leave the backend
- **No Permanent Storage Assumption**: Production uploads are not treated as long-lived documents in Blob
- **No Metadata Leakage**: QR codes are not used as a permanent document-sharing mechanism

## ðŸ“‹ Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn
- Azure Storage Account with access key
- Tesseract OCR (for image text extraction)

### Installing Tesseract

**Windows:**
```bash
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Or use chocolatey:
choco install tesseract
```

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

## ðŸ› ï¸ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Veriquick Cloud"
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env and add your Azure Storage credentials
# AZURE_STORAGE_ACCOUNT_NAME=your_account_name
# AZURE_STORAGE_ACCOUNT_KEY=your_account_key
# AZURE_STORAGE_CONTAINER_INCOMING=incoming-docs
# AZURE_STORAGE_CONTAINER_VERIFIED=verified-docs  # Optional, only if you later enable retention
# API_TOKEN=your_secret_token_here
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create public directory for assets
mkdir -p public/sounds
```

### 4. Add Sound Files

Place the following sound files in `frontend/public/sounds/`:
- `success.wav` - Played on successful scan
- `error.wav` - Played on scan error
- `upload.wav` - Played on upload completion

If you don't have sound files, the app will work without them (errors will be logged to console).

### 5. Add Logo

Place your logo file as `frontend/public/logo.png` (or update the path in `Navbar.jsx`).

## ðŸš€ Running the Application

### Start Backend

```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

### Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## ðŸ“ Project Structure

```
Veriquick Cloud/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ main.py                 # FastAPI application
â”‚   â”œâ”€â”€ config.py               # Configuration settings
â”‚   â”œâ”€â”€ document_processor.py   # Document processing & metadata extraction
â”‚   â”œâ”€â”€ validators.py           # Document validation functions
â”‚   â”œâ”€â”€ requirements.txt        # Python dependencies
â”‚   â”œâ”€â”€ .env.example            # Environment variables template
â”‚   â””â”€â”€ veriquickx.db           # SQLite database (created automatically)
â”‚
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/         # React components
â”‚   â”‚   â”‚   â””â”€â”€ Navbar.jsx
â”‚   â”‚   â”œâ”€â”€ pages/              # Page components
â”‚   â”‚   â”‚   â”œâ”€â”€ UploadPage.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ScannerPage.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminPage.jsx
â”‚   â”‚   â”‚   â””â”€â”€ AboutPage.jsx
â”‚   â”‚   â”œâ”€â”€ App.jsx             # Main app component
â”‚   â”‚   â”œâ”€â”€ main.jsx            # Entry point
â”‚   â”‚   â””â”€â”€ index.css           # Global styles
â”‚   â”œâ”€â”€ public/
â”‚   â”‚   â”œâ”€â”€ sounds/             # Sound effects
â”‚   â”‚   â””â”€â”€ logo.png            # Logo file
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ vite.config.js
â”‚
â””â”€â”€ README.md
```

## ðŸ”§ Configuration

### Backend Configuration

Edit `backend/.env`:

```env
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
AZURE_STORAGE_CONTAINER_INCOMING=incoming-docs
AZURE_STORAGE_CONTAINER_VERIFIED=verified-docs
API_TOKEN=your_secret_api_token
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend Configuration

Set environment variables for the frontend (recommended) in `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
VITE_API_TOKEN=your_secret_token_here
VITE_DEMO_UPLOAD=false
```

These must match the backend `API_TOKEN` (see `backend/.env`).

### Admin Password

Default admin password is `admin123`. Change it in `frontend/src/pages/AdminPage.jsx`:

```javascript
const ADMIN_PASSWORD = 'your_secure_password'
```

## ðŸ“¡ API Endpoints

### Public Endpoints

- `GET /` - API information
- `POST /api/upload` - Upload single document
- `POST /api/upload-multiple` - Upload multiple documents
- `GET /api/generate-qr/{file_id}` - Generate QR code image when retained storage is enabled
- `POST /api/scan-qr` - Process scanned QR code
- `GET /api/validate-document` - Validate document metadata

### Admin Endpoints (Require Authentication)

- `GET /api/admin/files` - List all uploaded files
- `DELETE /api/admin/files/{file_id}` - Delete a file
- `GET /api/admin/logs` - Get scan logs

All endpoints require Bearer token authentication:
```
Authorization: Bearer your_api_token
```

## ðŸ” Security Notes

1. **Change Default Tokens**: Update `API_TOKEN` in production
2. **Change Admin Password**: Update `ADMIN_PASSWORD` in `AdminPage.jsx`
3. **Use HTTPS**: Deploy with HTTPS in production
4. **Environment Variables**: Never commit `.env` files
5. **Azure Storage Credentials**: Keep your Azure storage credentials secure

## ðŸš¢ Deployment

### Backend Deployment (Render/Railway)

1. Create a new service
2. Set environment variables:
   - `AZURE_STORAGE_ACCOUNT_NAME`
   - `AZURE_STORAGE_ACCOUNT_KEY`
   - `AZURE_STORAGE_CONTAINER_INCOMING`
   - `AZURE_STORAGE_CONTAINER_VERIFIED` (optional)
   - `API_TOKEN`
   - `ALLOWED_ORIGINS` (your frontend URL)
3. Deploy from `backend/` directory
4. Update frontend API URL to point to deployed backend

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `dist/` folder
3. Update API proxy or use environment variables for API URL

### Streamlit Cloud (Alternative)

If you prefer Streamlit, you can convert the React frontend to Streamlit, but the current implementation uses React for better UX.

## ðŸ§ª Testing

### Test Document Upload

1. Go to Upload page
2. Select a PDF or image file
3. Click Upload
4. Verify the document is processed and Blob cleanup completes

### Test QR Scanner

1. Go to Scan QR page
2. Click "Start Scanning"
3. Point camera at a QR code
4. Verify document retrieval only works when a retained flow is enabled

### Test Admin Panel

1. Go to Admin page
2. Login with password
3. View files and logs
4. Test file deletion

## ðŸ› Troubleshooting

### Camera Not Working

- Ensure browser permissions are granted
- Try different browsers (Chrome recommended)
- Check HTTPS requirement for camera access

### Azure Blob Upload Fails

- Verify Azure account name and key are correct
- Check the storage account is reachable
- Ensure the incoming container exists and CORS allows the frontend

### OCR Not Working

- Install Tesseract OCR
- Set `TESSDATA_PREFIX` environment variable if needed
- Check Tesseract is in PATH

### QR Code Not Scanning

- Ensure good lighting
- Hold QR code steady
- Try increasing scan interval in `ScannerPage.jsx`

## ðŸ“ License

Â© 2025 VeriQuickX. All rights reserved.
Proprietary software - Permission required to edit and modify.

## ðŸ‘¤ Contact

- GitHub: [@DebashishRana](https://www.github.com/DebashishRana)
- Email: dimareznokov@gmail.com
- Phone: +91 9304211754
- LinkedIn: [devarana](https://www.linkedin.com/in/devarana)

## ðŸ™ Acknowledgments

- Azure Blob Storage for temporary staging
- FastAPI for backend framework
- React for frontend framework
- jsQR for QR code scanning
- All open-source libraries used in this project

