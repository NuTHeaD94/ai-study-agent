import { useState, useEffect, useMemo, useRef } from 'react'
import { aiAPI } from '../api/ai'
import ReactMarkdown from 'react-markdown'
import '../styles/ai-summary.css'

const PROMPT_LEAKAGE_PATTERN = /\b(input|task|format|output|rules?|study material|instructions?|return only|json|example|check against constraints|ensure|strict json|json array|prompt labels|markdown)\b\s*:?\s*/i
const SUMMARY_TEMPLATE_LEAKAGE_PATTERN = /(<main topic>|<important point>|<concept>|<likely exam|250[-–]400 words maximum|use only this format|no giant paragraphs|short bullets, student-friendly|no prompt labels|study material provided|exam-friendly study summary|rules:|input:|task:|format:|```)/i

const cleanConceptDisplayText = (value) => {
  return String(value || '')
    .replace(/\$?\\rightarrow\$?/g, 'to')
    .replace(/→/g, 'to')
    .replace(/[`_$]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^Concept\s+\d+:\s*/i, '')
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

const isPromptLeakage = (value) => PROMPT_LEAKAGE_PATTERN.test(cleanConceptDisplayText(value))

const formatSummaryMarkdown = (summary = '') => {
  return String(summary)
    .replace(/^\s*(Input|Task|Format|Output|Rules|Study material)\s*:.*$/gim, '')
    .replace(/^\s*Topic:\s*/im, '### Topic: ')
    .replace(/^\s*(Key Points|Important Concepts|Exam Focus|Quick Revision):\s*$/gim, '### $1')
    .replace(/^\s*[•]\s*/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const hasBadSummaryTemplateLeakage = (summary = '') => SUMMARY_TEMPLATE_LEAKAGE_PATTERN.test(String(summary))

const getAnswerLetter = (value = '') => {
  const match = String(value).trim().match(/^([A-D])(?:\)|\.|:)?/i)
  return match ? match[1].toUpperCase() : ''
}

const getOptionLabel = (option, index) => getAnswerLetter(option) || String.fromCharCode(65 + index)

const isCorrectAnswer = (selectedOption, question) => {
  const correctAnswer = question?.answer || question?.correctAnswer
  if (!selectedOption || !correctAnswer) return false

  const selectedLetter = getAnswerLetter(selectedOption)
  const correctLetter = getAnswerLetter(correctAnswer)
  if (selectedLetter && correctLetter) return selectedLetter === correctLetter

  return selectedOption.trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
}

export default function AISummary({ pdfId, onClose }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [submittedAnswers, setSubmittedAnswers] = useState({})

  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const contentRef = useRef(null)
  const chatEndRef = useRef(null)

  const quizQuestions = result?.quizQuestions || []
  const displayedConcepts = useMemo(() => {
    return (result?.concepts || [])
      .map(getConceptDisplayParts)
      .filter(({ title, explanation }) => title && !isPromptLeakage(title) && !isPromptLeakage(explanation))
  }, [result?.concepts])
  const submittedCount = Object.keys(submittedAnswers).length
  const quizScore = useMemo(() => {
    return quizQuestions.reduce((score, question, index) => {
      return score + (submittedAnswers[index] && isCorrectAnswer(selectedAnswers[index], question) ? 1 : 0)
    }, 0)
  }, [quizQuestions, selectedAnswers, submittedAnswers])

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

  useEffect(() => {
    setSelectedAnswers({})
    setSubmittedAnswers({})
  }, [result?._id])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    content.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [activeTab])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, chatLoading, activeTab])

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

  const handleSubmitAnswer = (questionIndex) => {
    if (!selectedAnswers[questionIndex]) return

    setSubmittedAnswers(prev => ({
      ...prev,
      [questionIndex]: true,
    }))
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

      <div className="summary-content" ref={contentRef}>
        {activeTab === 'summary' && (
          <div className="tab-content">
            <h3>Summary</h3>
            {hasBadSummaryTemplateLeakage(result.summary) ? (
              <div className="generation-warning">
                Summary could not be generated cleanly. Please reprocess this PDF.
              </div>
            ) : (
              <div className="summary-text markdown-content">
                <ReactMarkdown>{formatSummaryMarkdown(result.summary)}</ReactMarkdown>
              </div>
            )}
            <p className="processed-time">
              Processed: {new Date(result.createdAt).toLocaleString()}
            </p>
          </div>
        )}

        {activeTab === 'concepts' && (
          <div className="tab-content">
            <h3>Key Concepts</h3>
            <ul className="concepts-list">
              {displayedConcepts.length > 0 ? (
                displayedConcepts.map(({ title, explanation }, index) => (
                    <li key={index} className="concept-item">
                      <div className="concept-title">{title}</div>
                      {explanation && (
                        <div className="concept-explanation">{explanation}</div>
                      )}
                    </li>
                ))
              ) : result.aiErrors?.concepts ? (
                <div className="generation-warning">
                  {result.aiErrors.concepts}
                </div>
              ) : (
                <p>No concepts extracted</p>
              )}
            </ul>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="tab-content quiz-tab">
            <div className="quiz-header">
              <h3>Practice Questions</h3>
              {quizQuestions.length > 0 && (
                <div className="quiz-score">
                  Score: {quizScore}/{quizQuestions.length}
                </div>
              )}
            </div>
            <div className="questions-list">
              {quizQuestions.length > 0 ? (
                quizQuestions.map((question, index) => {
                  const submitted = submittedAnswers[index]
                  const selectedOption = selectedAnswers[index]
                  const isCorrect = isCorrectAnswer(selectedOption, question)
                  const correctAnswer = question.answer || question.correctAnswer
                  const correctLetter = getAnswerLetter(correctAnswer)

                  return (
                    <div key={index} className={`question-card ${submitted ? (isCorrect ? 'is-correct' : 'is-incorrect') : ''}`}>
                    <div className="question-number">Question {index + 1}</div>
                    <p className="question-text">{question.question}</p>
                    <div className="options">
                      {question.options && question.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`option ${selectedOption === option ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`q${index}`}
                            value={option}
                            checked={selectedOption === option}
                            disabled={submitted}
                            onChange={() => setSelectedAnswers(prev => ({ ...prev, [index]: option }))}
                          />
                          <span className="option-letter">{getOptionLabel(option, optIndex)}</span>
                          <span className="option-text">{option.replace(/^[A-D](?:\)|\.|:)?\s*/i, '')}</span>
                        </label>
                      ))}
                    </div>
                    {!submitted ? (
                      <button
                        type="button"
                        className="btn-submit-answer"
                        disabled={!selectedOption}
                        onClick={() => handleSubmitAnswer(index)}
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <div className={`answer-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                        <div className="answer-status">
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </div>
                        {!isCorrect && (
                          <div className="correct-answer">
                            Correct Answer: {correctLetter || correctAnswer}
                          </div>
                        )}
                        <div className="answer-explanation">
                          <strong>Explanation:</strong> {question.explanation || `The correct answer is ${correctAnswer}.`}
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })
              ) : (
                <div className="generation-warning">
                  {result.aiErrors?.quiz || 'Quiz questions could not be generated cleanly for this PDF. Please reprocess the document.'}
                </div>
              )}
            </div>
            {quizQuestions.length > 0 && submittedCount === quizQuestions.length && (
              <div className="final-score">
                Final score: {quizScore}/{quizQuestions.length}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="tab-content chat-tab">
            <h3>Chat with Study Material</h3>
            <div className="chat-messages">
              {chatHistory.length === 0 ? (
                <p className="chat-empty">Ask a question about this material.</p>
              ) : (
                chatHistory.map((msg, index) => (
                  <div key={index} className={`chat-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
                    <div className={`chat-bubble ${msg.role === 'ai' ? 'markdown-content' : ''}`}>
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
                <div className="chat-row ai">
                  <div className="chat-bubble typing-indicator" aria-label="AI is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="chat-form">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask a question..."
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatMessage.trim()}
                aria-label="Send message"
              >
                <span className="send-label">Send</span>
                <span className="send-icon" aria-hidden="true">↑</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
