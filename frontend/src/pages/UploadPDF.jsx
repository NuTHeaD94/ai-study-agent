import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import UploadForm from '../components/UploadForm'
import PDFList from '../components/PDFList'
import AISummary from '../components/AISummary'
import '../styles/upload-page.css'

export default function UploadPDF() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedPdfId, setSelectedPdfId] = useState(null)
  const [processingMessage, setProcessingMessage] = useState('')

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleProcessStart = (pdfId) => {
    setProcessingMessage(`Processing PDF with AI... This may take a minute.`)
  }

  const handleProcessComplete = (pdfId) => {
    setProcessingMessage('')
    setSelectedPdfId(pdfId)
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>Upload PDF</h1>
          <p>Upload study materials and get AI-powered summaries</p>
        </div>

        {processingMessage && (
          <div className="processing-notification">
            <span>⏳ {processingMessage}</span>
          </div>
        )}

        <div className="upload-section">
          <UploadForm onUploadSuccess={handleUploadSuccess} />
          <PDFList
            refreshTrigger={refreshTrigger}
            onProcessStart={handleProcessStart}
            onProcessComplete={handleProcessComplete}
          />
        </div>

        {selectedPdfId && (
          <div className="ai-summary-modal">
            <div className="modal-overlay" onClick={() => setSelectedPdfId(null)} />
            <div className="modal-content">
              <AISummary
                pdfId={selectedPdfId}
                onClose={() => setSelectedPdfId(null)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
