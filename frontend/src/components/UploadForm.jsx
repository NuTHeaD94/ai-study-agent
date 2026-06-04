import { useState } from 'react'
import { pdfAPI } from '../api/pdf'
import '../styles/upload-form.css'

export default function UploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = e => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please select a PDF file')
        setFile(null)
      }
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await pdfAPI.upload(formData)
      
      setMessage('✓ PDF uploaded successfully!')
      setFile(null)
      
      // Reset file input
      e.target.reset()

      // Notify parent to refresh list
      if (onUploadSuccess) {
        onUploadSuccess(response.data.pdf)
      }

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Upload failed. Please try again.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-form">
      <h3>Upload PDF</h3>
      
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form onSubmit={handleSubmit} className="form-upload">
        <div className="file-input-wrapper">
          <input
            type="file"
            id="pdf-input"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={loading}
            required
          />
          <label htmlFor="pdf-input" className="file-label">
            {file ? file.name : '📄 Choose PDF or drag here'}
          </label>
        </div>

        <button 
          type="submit" 
          className="btn-primary btn-upload"
          disabled={loading || !file}
        >
          {loading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>

      {file && (
        <div className="file-info">
          <p><strong>File:</strong> {file.name}</p>
          <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
    </div>
  )
}
