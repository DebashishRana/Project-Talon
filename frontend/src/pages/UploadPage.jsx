import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import './UploadPage.css'

const steps = ['Workspace', 'Import', 'Document type', 'Verification', 'Review', 'Complete']

function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResults, setUploadResults] = useState([])

  const handleFileSelect = (selectedFiles) => {
    const validFiles = Array.from(selectedFiles).filter(file => {
      const extension = file.name.toLowerCase().split('.').pop()
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
        alert(`${file.name} is not supported. Use PDF, JPG, or PNG.`)
        return false
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} exceeds the 20MB size limit.`)
        return false
      }
      return true
    })
    setFiles(previous => [...previous, ...validFiles])
  }

  const handleUpload = async () => {
    if (!files.length) return alert('Choose at least one document to continue.')
    setUploading(true)
    setUploadProgress(0)
    setUploadResults([])
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      const response = await api.post('/api/process-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: event => event.total && setUploadProgress(Math.round((event.loaded / event.total) * 100))
      })
      setUploadResults(response.data.results || [])
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.detail || error.message))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="import-page">
      <div className="import-shell">
        <div className="import-header"><div><p className="import-kicker">VERIFICATION PANNEL</p><h1>Get started </h1></div><span className="import-id"></span></div>
        <div className="stepper" aria-label="Document verification steps">{steps.map((step, index) => <div className={`step ${index === 1 ? 'current' : index === 0 ? 'complete' : ''}`} key={step}><span className="step-mark">{index === 0 ? '✓' : index + 1}</span><span>{step}</span></div>)}</div>

        <main className="import-workspace">
          <section className="import-form-panel">
            <div className="section-intro"><div><p className="form-kicker">STEP 02 / IMPORT</p><h2>Bring in verification documents</h2><p></p></div><span className="security-label">● SECURE INTAKE</span></div>
            <div className="import-drop-zone" onDrop={event => { event.preventDefault(); handleFileSelect(event.dataTransfer.files) }} onDragOver={event => event.preventDefault()} onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={event => handleFileSelect(event.target.files)} />
              <span className="cloud-icon">↑</span><strong>Upload documents here</strong><span>or <button type="button" onClick={event => { event.stopPropagation(); fileInputRef.current?.click() }}></button></span><small>PDF, JPG, or PNG · Maximum 20MB per file</small>
            </div>

            <div className="import-fields"><label>Document purpose<select defaultValue="identity"><option value="identity">Identity verification</option><option value="address">Address verification</option><option value="business">Business verification</option></select></label><label>Verification profile<select defaultValue="standard"><option value="standard">Standard identity check</option><option value="enhanced">Enhanced due diligence</option><option value="manual">Manual review only</option></select></label><label>Reference note<input placeholder="Optional note for this verification batch" /></label></div>

            <div className="import-options"><label><input type="checkbox" defaultChecked /> Run OCR extraction</label><label><input type="checkbox" defaultChecked /> Detect document type automatically</label></div>
            {files.length > 0 && <div className="selected-files"><div className="selected-heading"><strong>Selected documents</strong><span>{files.length} file{files.length > 1 ? 's' : ''}</span></div>{files.map((file, index) => <div className="selected-file" key={`${file.name}-${index}`}><span className="file-type">DOC</span><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div><button onClick={() => setFiles(previous => previous.filter((_, fileIndex) => fileIndex !== index))}>×</button></div>)}</div>}
            {uploading && <div className="import-progress"><span>Processing secure intake...</span><strong>{uploadProgress}%</strong><div><i style={{ width: `${uploadProgress}%` }} /></div></div>}
            <div className="import-actions"><button className="save-stage" type="button">▣ Save stage</button><div><button className="back-button" type="button" onClick={() => navigate('/dashboard')}>‹ Back</button><button className="next-button" type="button" disabled={uploading} onClick={handleUpload}>{uploading ? 'Processing...' : 'Next ›'}</button></div></div>
          </section>
        </main>

        {uploadResults.length > 0 && <section className="import-results"><div className="section-intro"><div><p className="form-kicker">PROCESSING COMPLETE</p><h2>Verification intake results</h2></div></div><div className="results-grid">{uploadResults.map((result, index) => <article className={`result-card ${result.success ? 'success' : 'error'}`} key={index}><strong>{result.metadata?.file_name || result.filename || 'Document'}</strong><span>{result.success ? 'Accepted for verification' : result.error}</span></article>)}</div></section>}
      </div>
    </div>
  )
}

export default UploadPage
