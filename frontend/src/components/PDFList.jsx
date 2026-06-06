import { useState, useEffect } from 'react'
import { pdfAPI } from '../api/pdf'
import { aiAPI } from '../api/ai'
import '../styles/pdf-list.css'

export default function PDFList({ refreshTrigger, onProcessStart, onProcessComplete }) {
  const [pdfs, setPDFs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(null)
  const [aiResults, setAIResults] = useState({})

  useEffect(() => {
    fetchPDFs()
    fetchAIResults()
  }, [refreshTrigger])

  const fetchPDFs = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await pdfAPI.list()
      setPDFs(response.data.pdfs)
    } catch (err) {
      setError('Failed to load PDFs')
    } finally {
      setLoading(false)
    }
  }

  const fetchAIResults = async () => {
    try {
      const response = await aiAPI.getAllResults()
      const resultsMap = {}
      // Map by title since StudyMaterial doesn't store pdfId
      response.data.results.forEach(result => {
        resultsMap[result.title] = result
      })
      setAIResults(resultsMap)
    } catch (err) {
      // Silently fail, AI results are optional
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PDF?')) {
      return
    }

    try {
      await pdfAPI.delete(id)
      setPDFs(pdfs.filter(pdf => pdf._id !== id))
    } catch (err) {
      setError('Failed to delete PDF')
    }
  }

  const handleProcessPDF = async (pdfId) => {
    const pdf = pdfs.find(p => p._id === pdfId);
    const existingResult = aiResults[pdf?.originalName];

    if (existingResult) {
      // Already processed, open results with StudyMaterial ID
      onProcessComplete?.(existingResult._id)
      return
    }

    setProcessing(pdfId)
    try {
      onProcessStart?.(pdfId)
      const response = await aiAPI.processPDF(pdfId)
      await fetchAIResults()
      onProcessComplete?.(response.data.result._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process PDF')
    } finally {
      setProcessing(null)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusLabel = (result) => {
    if (!result) return 'Not processed'
    if (result.status === 'processing') return 'Processing'
    if (result.status === 'failed') return 'Failed'
    return 'Ready'
  }

  if (loading) {
    return <div className="pdf-list"><p>Loading PDFs...</p></div>
  }

  if (error) {
    return <div className="pdf-list"><p className="error">{error}</p></div>
  }

  return (
    <div className="pdf-list">
      <h3>Your PDFs ({pdfs.length})</h3>
      
      {pdfs.length === 0 ? (
        <p className="empty-message">No PDFs uploaded yet. Upload one to get started!</p>
      ) : (
        <div className="pdf-items">
          {pdfs.map(pdf => {
            const result = aiResults[pdf.originalName]
            const hasResult = !!result
            const statusLabel = getStatusLabel(result)
            return (
              <div key={pdf._id} className="pdf-item">
                <div className="pdf-icon">📄</div>
                <div className="pdf-details">
                  <div className="pdf-name">{pdf.originalName}</div>
                  <div className="pdf-meta">
                    {formatFileSize(pdf.fileSize)} · Uploaded {formatDate(pdf.uploadedAt)}
                    <span className={`badge-status status-${result?.status || 'new'}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="pdf-info-grid">
                    <span><strong>File Name</strong>{pdf.originalName}</span>
                    <span><strong>Upload Date</strong>{formatDate(pdf.uploadedAt)}</span>
                    <span><strong>Processing Status</strong>{statusLabel}</span>
                    <span><strong>Concepts</strong>{result?.concepts?.length || 0}</span>
                    <span><strong>Quiz Questions</strong>{result?.quizQuestions?.length || 0}</span>
                    {pdf.pageCount && <span><strong>Pages</strong>{pdf.pageCount}</span>}
                  </div>
                </div>
                <div className="pdf-actions">
                  <button
                    className={`btn-process ${hasResult ? 'btn-processed' : ''}`}
                    onClick={() => handleProcessPDF(pdf._id)}
                    disabled={processing === pdf._id}
                    title={hasResult ? 'View AI Results' : 'Generate AI Results'}
                  >
                    <span className="btn-process-icon">
                      {processing === pdf._id ? '⏳' : hasResult ? '📊' : '✨'}
                    </span>
                    <span>
                      {processing === pdf._id
                        ? 'Processing...'
                        : hasResult
                          ? 'View AI Results'
                          : 'Generate AI Results'}
                    </span>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(pdf._id)}
                    title="Delete PDF"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
