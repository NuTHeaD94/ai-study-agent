import { useState, useEffect } from 'react'
import { aiAPI } from '../api/ai'
import ReactMarkdown from 'react-markdown'
import '../styles/ai-summary.css'

const cleanConceptDisplayText = (value) => {
  return String(value || '')
    .replace(/\$?\\rightarrow\$?/g, 'to')
    .replace(/→/g, 'to')
    .replace(/[`_$]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim()
}

const getConceptDisplayParts = (concept) => {
  const lines = String(concept || '')
    .split('\n')
    .map(cleanConceptDisplayText)
    .filter(Boolean)

  return {
    title: lines[0] || '',
    explanation: lines.slice(1).join(' '),
  }
}

export default function AISummary({ pdfId, onClose }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')

  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    fetchResult()
    
    let intervalId;
    if (result?.status === 'processing') {
      intervalId = setInterval(fetchResult, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [pdfId, result?.status])

  const fetchResult = async () => {
    // Only show loading initially
    if (!result) setLoading(true)
    setError('')
    try {
      const response = await aiAPI.getResult(pdfId)
      setResult(response.data)
      if (response.data.chatHistory) {
         setChatHistory(response.data.chatHistory)
      }
    } catch (err) {
      setError('Failed to load AI results')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return
    
    if (result?.status === 'processing') {
      alert("Material is still processing. Please wait.");
      return;
    }

    const newMessage = { role: 'user', content: chatMessage }
    setChatHistory([...chatHistory, newMessage])
    setChatMessage('')
    setChatLoading(true)

    try {
      const response = await aiAPI.chatWithMaterial(pdfId, newMessage.content)
      setChatHistory(response.data.chatHistory)
    } catch (err) {
      console.error('Failed to send message', err)
      const errorMessage = err.response?.data?.message || 'Sorry, I encountered an error. Please try again.'
      setChatHistory([...chatHistory, newMessage, { role: 'ai', content: errorMessage }])
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="ai-summary">
        <div className="summary-header">
          <h2>Loading...</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <p className="loading">Loading AI results...</p>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="ai-summary">
        <div className="summary-header">
          <h2>Error</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <p className="error-text">{error || 'No results found'}</p>
      </div>
    )
  }
  
  if (result.status === 'processing') {
    return (
      <div className="ai-summary">
        <div className="summary-header">
          <h2>⚙️ Processing Document...</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p>We are extracting insights, generating summaries, and building quizzes.</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>This may take a minute. You can wait here or close this and check back later.</p>
        </div>
      </div>
    )
  }
  
  if (result.status === 'failed') {
    return (
      <div className="ai-summary">
        <div className="summary-header">
          <h2>❌ Processing Failed</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#d9534f' }}>
          <p>{result.processingError || 'We encountered an error while processing this document.'}</p>
          <p>Please try uploading it again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-summary">
      <div className="summary-header">
        <h2>📊 AI Analysis</h2>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      <div className="summary-tabs">
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-btn ${activeTab === 'concepts' ? 'active' : ''}`}
          onClick={() => setActiveTab('concepts')}
        >
          Concepts
        </button>
        <button
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Quiz
        </button>
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
      </div>

      <div className="summary-content">
        {activeTab === 'summary' && (
          <div className="tab-content">
            <h3>Summary</h3>
            <p className="summary-text">{result.summary}</p>
            <p className="processed-time">
              Processed: {new Date(result.createdAt).toLocaleString()}
            </p>
          </div>
        )}

        {activeTab === 'concepts' && (
          <div className="tab-content">
            <h3>Key Concepts</h3>
            <ul className="concepts-list">
              {result.concepts && result.concepts.length > 0 ? (
                result.concepts.map((concept, index) => {
                  const { title, explanation } = getConceptDisplayParts(concept)

                  return (
                    <li key={index} className="concept-item">
                      <div className="concept-title">{title}</div>
                      {explanation && (
                        <div className="concept-explanation">{explanation}</div>
                      )}
                    </li>
                  )
                })
              ) : (
                <p>No concepts extracted</p>
              )}
            </ul>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="tab-content">
            <h3>Practice Questions</h3>
            <div className="questions-list">
              {result.quizQuestions && result.quizQuestions.length > 0 ? (
                result.quizQuestions.map((question, index) => (
                  <div key={index} className="question-card">
                    <div className="question-number">Q{index + 1}</div>
                    <p className="question-text">{question.question}</p>
                    <div className="options">
                      {question.options && question.options.map((option, optIndex) => (
                        <label key={optIndex} className="option">
                          <input type="radio" name={`q${index}`} disabled />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    <p className="correct-answer">
                      <strong>Answer:</strong> {question.correctAnswer}
                    </p>
                  </div>
                ))
              ) : (
                <p>No questions generated</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="tab-content chat-tab">
            <h3>Chat with Study Material</h3>
            <div className="chat-messages" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
              {chatHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>Ask a question about this material!</p>
              ) : (
                chatHistory.map((msg, index) => (
                  <div key={index} style={{ marginBottom: '15px', textAlign: msg.role === 'user' ? 'right' : 'left', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? '#007bff' : '#ffffff',
                      color: msg.role === 'user' ? 'white' : '#333',
                      border: msg.role === 'user' ? 'none' : '1px solid #e0e0e0',
                      maxWidth: '85%',
                      textAlign: 'left',
                      lineHeight: '1.6',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }} className={msg.role === 'ai' ? 'markdown-content' : ''}>
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div style={{ textAlign: 'left', marginBottom: '10px' }}>
                  <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '8px', background: '#e9ecef', color: '#666' }}>
                    Typing...
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask a question..."
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatMessage.trim()}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#007bff', color: 'white', cursor: chatLoading || !chatMessage.trim() ? 'not-allowed' : 'pointer' }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
