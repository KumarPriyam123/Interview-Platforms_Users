import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getInterviewQuestion, submitAnswer, endInterview } from '../services/api'
import '../styles/InterviewPage.css'

function InterviewPage() {
  const { id: sessionId } = useParams()
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    loadQuestion()
  }, [sessionId])

  const loadQuestion = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getInterviewQuestion(sessionId)

      if (response.data.status === 'completed') {
        setCompleted(true)
        window.location.href = `/report/${sessionId}`
      } else {
        setQuestion(response.data.question)
        setFeedback('')
        setEvaluation(null)
        setShowFeedback(false)
        setAnswer('')
        setQuestionCount(prev => prev + 1)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!answer.trim()) {
      setError('Please provide an answer')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await submitAnswer(sessionId, answer)
      setFeedback(response.data.feedback)
      setEvaluation(response.data)
      setShowFeedback(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEndInterview = async () => {
    if (window.confirm('Are you sure you want to end the interview?')) {
      try {
        await endInterview(sessionId)
        window.location.href = `/report/${sessionId}`
      } catch (err) {
        setError('Failed to end interview')
      }
    }
  }

  if (loading) {
    return <div className="interview-loading">Loading question...</div>
  }

  if (completed) {
    return <div className="interview-loading">Redirecting to report...</div>
  }

  return (
    <div className="interview-container">
      <div className="interview-header">
        <h1>AI Mock Interview</h1>
        <div className="interview-info">
          <span>Question {questionCount}</span>
          <button onClick={handleEndInterview} className="end-btn">End Interview</button>
        </div>
      </div>

      <div className="interview-content">
        <div className="question-section">
          <h2 className="question-title">Interviewer</h2>
          <p className="question-text">{question}</p>
        </div>

        {showFeedback && evaluation && (
          <div className="feedback-section">
            <div className="score-badge">
              <span className="score-value">{evaluation.score}</span>
              <span className="score-label">/ 100</span>
            </div>

            <div className="feedback-block">
              <h3>Feedback</h3>
              <p>{evaluation.feedback}</p>
            </div>

            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div className="feedback-block strengths-block">
                <h3>Strengths</h3>
                <ul>
                  {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {evaluation.improvements && evaluation.improvements.length > 0 && (
              <div className="feedback-block improvements-block">
                <h3>How to Improve</h3>
                <ul>
                  {evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {evaluation.model_answer && (
              <div className="feedback-block model-answer-block">
                <h3>Ideal Answer</h3>
                <p>{evaluation.model_answer}</p>
              </div>
            )}

            <button onClick={loadQuestion} className="next-btn">Next Question</button>
          </div>
        )}

        {!showFeedback && (
          <form onSubmit={handleSubmit} className="answer-form">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows="6"
              disabled={submitting}
            />
            {error && <div className="error-message">{error}</div>}
            <button
              type="submit"
              disabled={submitting || !answer.trim()}
              className="submit-btn"
            >
              {submitting ? 'Evaluating...' : 'Submit Answer'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default InterviewPage
