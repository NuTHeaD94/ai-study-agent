import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import AISummary from '../components/AISummary'
import { aiAPI } from '../api/ai'
import '../styles/global.css'

export default function Dashboard() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDocId, setSelectedDocId] = useState(null)

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await aiAPI.getAllResults()
      setMaterials(response.data.results || [])
    } catch (err) {
      console.error('Failed to load study materials', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this study material?')) {
      try {
        await aiAPI.deleteResult(id)
        setMaterials(materials.filter(m => m._id !== id))
        if (selectedDocId === id) {
          setSelectedDocId(null)
        }
      } catch (err) {
        console.error('Failed to delete material', err)
        alert('Failed to delete. Please try again.')
      }
    }
  }

  const stats = [
    { icon: '📄', label: 'Materials', value: materials.length },
    { icon: '✦', label: 'Summaries', value: materials.filter(m => m.summary).length },
    { icon: '❓', label: 'Quizzes', value: materials.filter(m => m.quizQuestions && m.quizQuestions.length > 0).length },
    { icon: '⏱', label: 'Concepts', value: materials.reduce((acc, m) => acc + (m.concepts?.length || 0), 0) },
  ]

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Here's what you've been studying lately</p>
        </div>

        <div className="stats-row">
          {stats.map((s, i) => (
            <div className="stat-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="section-title">Your Study Materials</div>
        
        {loading ? (
          <p>Loading your materials...</p>
        ) : materials.length === 0 ? (
          <p>No study materials found. Upload a PDF to get started!</p>
        ) : (
          <div className="doc-list">
            {materials.map((doc, i) => (
              <div 
                className="doc-item" 
                key={doc._id} 
                style={{ animationDelay: `${0.2 + i * 0.07}s`, cursor: 'pointer' }}
                onClick={() => setSelectedDocId(doc._id)}
              >
                <div className="doc-icon">📑</div>
                <div className="doc-info">
                  <div className="doc-name">{doc.title}</div>
                  <div className="doc-meta">
                    {new Date(doc.createdAt).toLocaleDateString()} · {doc.concepts?.length || 0} Concepts
                  </div>
                  {doc.status === 'processing' && (
                    <div style={{ fontSize: '0.85rem', color: '#ff9800', marginTop: '4px', fontWeight: 'bold' }}>
                      ⏳ Processing AI Insights...
                    </div>
                  )}
                  {doc.status === 'failed' && (
                    <div style={{ fontSize: '0.85rem', color: '#d9534f', marginTop: '4px', fontWeight: 'bold' }}>
                      ❌ Processing Failed
                    </div>
                  )}
                  {doc.status === 'completed' && doc.summary && (
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {doc.summary}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span className="doc-badge" style={{ backgroundColor: doc.status === 'processing' ? '#ff9800' : doc.status === 'failed' ? '#d9534f' : '#28a745' }}>
                    {doc.status === 'processing' ? 'Processing' : doc.status === 'failed' ? 'Failed' : 'Ready'}
                  </span>
                  <button 
                    onClick={(e) => handleDelete(doc._id, e)}
                    style={{ background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedDocId && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             <AISummary pdfId={selectedDocId} onClose={() => setSelectedDocId(null)} />
          </div>
        )}
      </main>
    </div>
  )
}
