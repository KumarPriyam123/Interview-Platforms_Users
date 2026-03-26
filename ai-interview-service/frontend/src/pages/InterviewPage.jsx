import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAllQuestions,
  getCurrentQuestion,
  submitAnswer,
  submitCounterAnswer,
  moveToNext,
  askDoubt,
  endInterview,
} from '../services/api'
import '../styles/InterviewPage.css'

function InterviewPage() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()

  const [sections, setSections] = useState([])
  const [currentQ, setCurrentQ] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [counterQuestion, setCounterQuestion] = useState(null)
  const [counterAnswer, setCounterAnswer] = useState('')
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittingCounter, setSubmittingCounter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const synthRef = useRef(window.speechSynthesis)
  const [doubtOpen, setDoubtOpen] = useState(false)
  const [doubtText, setDoubtText] = useState('')
  const [doubtMessages, setDoubtMessages] = useState([])
  const [sendingDoubt, setSendingDoubt] = useState(false)
  const doubtEndRef = useRef(null)

  const loadSidebar = useCallback(async () => {
    try {
      const res = await getAllQuestions(sessionId)
      setSections(res.data.sections || [])
      if (res.data.status === 'completed') setCompleted(true)
    } catch (err) {
      console.error('Failed to load sidebar:', err)
    }
  }, [sessionId])

  const loadCurrentQuestion = useCallback(async () => {
    try {
      const res = await getCurrentQuestion(sessionId)
      if (res.data.status === 'completed') { setCompleted(true); return }
      setCurrentQ(res.data)
      setAnswer('')
      setFeedback(null)
      setCounterQuestion(null)
      setCounterAnswer('')
    } catch (err) {
      setError('Failed to load question')
    }
  }, [sessionId])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadSidebar()
      await loadCurrentQuestion()
      setLoading(false)
    }
    init()
  }, [loadSidebar, loadCurrentQuestion])

  const speak = useCallback((text) => {
    const synth = synthRef.current
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.pitch = 1
    u.volume = 1
    const voices = synth.getVoices()
    const v = voices.find(x => x.lang.startsWith('en') && x.name.includes('Google'))
      || voices.find(x => x.lang.startsWith('en-US'))
      || voices.find(x => x.lang.startsWith('en'))
    if (v) u.voice = v
    u.onstart = () => setIsSpeaking(true)
    u.onend = () => setIsSpeaking(false)
    u.onerror = () => setIsSpeaking(false)
    synth.speak(u)
  }, [])

  const toggleTTS = () => {
    const synth = synthRef.current
    if (synth.speaking) { synth.cancel(); setIsSpeaking(false) }
    else if (currentQ) speak(currentQ.question)
  }

  useEffect(() => {
    if (currentQ && currentQ.question && !feedback) {
      const t = setTimeout(() => speak(currentQ.question), 500)
      return () => clearTimeout(t)
    }
  }, [currentQ?.question_number])

  useEffect(() => { return () => synthRef.current.cancel() }, [])

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await submitAnswer(sessionId, answer.trim())
      setFeedback(res.data)
      if (res.data.has_counter_question && res.data.counter_question) {
        setCounterQuestion(res.data.counter_question)
        setTimeout(() => speak(res.data.counter_question), 800)
      }
      await loadSidebar()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitCounterAnswer = async () => {
    if (!counterAnswer.trim() || submittingCounter) return
    setSubmittingCounter(true)
    try {
      const res = await submitCounterAnswer(sessionId, counterAnswer.trim(), currentQ?.question_number)
      setFeedback(prev => ({ ...prev, counter_feedback: res.data.feedback, score_adjustment: res.data.score_adjustment }))
      setCounterQuestion(null)
      setCounterAnswer('')
    } catch (err) {
      setError('Failed to submit follow-up answer')
    } finally {
      setSubmittingCounter(false)
    }
  }

  const handleNext = async () => {
    try {
      const res = await moveToNext(sessionId)
      if (res.data.status === 'completed') { setCompleted(true); return }
      setCurrentQ(res.data)
      setAnswer('')
      setFeedback(null)
      setCounterQuestion(null)
      setCounterAnswer('')
      await loadSidebar()
    } catch (err) {
      setError('Failed to load next question')
    }
  }

  const handleSkip = async () => {
    try { await submitAnswer(sessionId, '(Skipped)'); await handleNext() }
    catch (err) { await handleNext() }
  }

  const handleEndInterview = async () => {
    if (!window.confirm('Are you sure you want to end the interview?')) return
    try { await endInterview(sessionId); setCompleted(true) }
    catch (err) { setError('Failed to end interview') }
  }

  const handleSendDoubt = async () => {
    if (!doubtText.trim() || sendingDoubt) return
    const text = doubtText.trim()
    setDoubtText('')
    setDoubtMessages(prev => [...prev, { role: 'user', content: text }])
    setSendingDoubt(true)
    try {
      const res = await askDoubt(sessionId, text)
      setDoubtMessages(prev => [...prev, { role: 'ai', content: res.data.response, hint: res.data.hint }])
    } catch (err) {
      setDoubtMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I could not process your question.' }])
    } finally {
      setSendingDoubt(false)
    }
  }

  const handleDoubtKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDoubt() }
  }

  useEffect(() => { doubtEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [doubtMessages])

  const getScoreClass = (score) => score >= 8 ? 'high' : score >= 5 ? 'mid' : 'low'
  const cqn = currentQ?.current_index ?? 0
  const tq = currentQ?.total_questions ?? 0
  const ac = sections.reduce((s, sec) => s + sec.questions.filter(q => q.answered).length, 0)
  const tc = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const pct = tq > 0 ? ((cqn + (feedback ? 1 : 0)) / tq) * 100 : 0

  if (loading) {
    return (
      <div className="interview-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem' }}>
          <div className="inline-spinner" style={{ width: 32, height: 32 }} />
          <span style={{ color: 'var(--text-secondary)' }}>Loading interview...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="interview-page">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Questions</h2>
          <span className="sidebar-progress">{ac}/{tc}</span>
        </div>
        <div className="sidebar-sections">
          {sections.map((section, si) => (
            <div key={si} className="sidebar-section">
              <div className={'section-header' + (si === (currentQ?.section_index ?? 0) ? ' active' : '')}>
                <span className="section-icon" />
                {section.title}
              </div>
              <div className="section-questions">
                {section.questions.map((q) => {
                  const isCur = q.questionNumber === cqn && !completed
                  return (
                    <div key={q.questionNumber}
                      className={'sidebar-question' + (isCur ? ' current' : '') + (q.answered ? ' answered' : '')}>
                      <span className={'q-status ' + (isCur ? 'active' : q.answered ? 'done' : 'pending')}>
                        {q.answered ? '\u2713' : isCur ? '\u25B8' : ''}
                      </span>
                      <span className="q-text">{q.question}</span>
                      <span className={'difficulty-badge ' + q.difficulty}>{q.difficulty}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {!completed && (
          <button className="end-interview-btn" onClick={handleEndInterview}>End Interview</button>
        )}
      </aside>

      <div className="main-content">
        <div className="interview-topbar">
          <div className="topbar-left">
            <span className="topbar-section-title">
              <strong>{currentQ?.section_title || 'Interview'}</strong>
              {currentQ && (' - Q' + (cqn + 1) + ' of ' + tq)}
            </span>
          </div>
          <div className="topbar-right">
            <button className={'tts-btn' + (isSpeaking ? ' speaking' : '')} onClick={toggleTTS}>
              {isSpeaking ? 'Speaking...' : 'Read Aloud'}
            </button>
            <button className={'doubt-toggle-btn' + (doubtOpen ? ' active' : '')}
              onClick={() => setDoubtOpen(!doubtOpen)}>
              {doubtOpen ? 'Close Doubt' : 'Ask Doubt'}
            </button>
          </div>
        </div>

        <div className="question-area">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: pct + '%' }} />
            </div>
            <span className="progress-text">{Math.round(pct)}%</span>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {completed ? (
            <div className="completion-card">
              <div className="completion-icon" style={{ fontSize: '3rem' }}>&#127881;</div>
              <h2>Interview Complete!</h2>
              <p>Great job! Your responses have been evaluated.</p>
              <button className="view-report-btn" onClick={() => navigate('/report/' + sessionId)}>
                View Detailed Report
              </button>
            </div>
          ) : currentQ ? (
            <>
              <div className="question-card" key={currentQ.question_number}>
                <div className="question-meta">
                  <span className="question-label">Question {cqn + 1}</span>
                  <span className={'difficulty-badge ' + currentQ.difficulty}>{currentQ.difficulty}</span>
                </div>
                <p className="question-text">{currentQ.question}</p>
              </div>

              {!feedback && (
                <div className="answer-area animate-fade-in">
                  <textarea className="answer-textarea"
                    placeholder="Type your answer here... Be specific and include examples where possible."
                    value={answer} onChange={(e) => setAnswer(e.target.value)}
                    disabled={submitting}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSubmitAnswer() }}
                  />
                  <div className="answer-actions">
                    <button className="skip-btn" onClick={handleSkip} disabled={submitting}>Skip</button>
                    <button className="answer-btn" onClick={handleSubmitAnswer}
                      disabled={!answer.trim() || submitting}>
                      {submitting ? (<><span className="inline-spinner" /> Evaluating...</>) : 'Submit Answer'}
                    </button>
                  </div>
                </div>
              )}

              {feedback && (
                <div className="feedback-card">
                  <div className="feedback-header">
                    <span className="feedback-title">Evaluation</span>
                    <span className={'score-badge ' + getScoreClass(feedback.score)}>
                      {feedback.score}/10
                      {feedback.score_adjustment ? (' (' + (feedback.score_adjustment > 0 ? '+' : '') + feedback.score_adjustment + ')') : ''}
                    </span>
                  </div>
                  <p className="feedback-text">{feedback.feedback}</p>
                  {feedback.strengths?.length > 0 && (
                    <div className="feedback-section">
                      <div className="feedback-section-title">Strengths</div>
                      <ul className="feedback-list strengths">
                        {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {feedback.improvements?.length > 0 && (
                    <div className="feedback-section">
                      <div className="feedback-section-title">Areas to Improve</div>
                      <ul className="feedback-list improvements">
                        {feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {feedback.model_answer && (
                    <div className="model-answer">
                      <div className="model-answer-label">Ideal Answer Approach</div>
                      {feedback.model_answer}
                    </div>
                  )}
                  {feedback.counter_feedback && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(139,92,246,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139,92,246,0.15)' }}>
                      <div className="feedback-section-title" style={{ color: 'var(--accent-400)' }}>Follow-up Feedback</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{feedback.counter_feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {counterQuestion && (
                <div className="counter-question-card">
                  <div className="counter-label">Follow-up Question</div>
                  <p className="counter-question-text">{counterQuestion}</p>
                  <div className="answer-area">
                    <textarea className="answer-textarea" placeholder="Answer the follow-up question..."
                      value={counterAnswer} onChange={(e) => setCounterAnswer(e.target.value)}
                      disabled={submittingCounter} style={{ minHeight: '80px' }} />
                    <div className="answer-actions">
                      <button className="skip-btn" onClick={() => { setCounterQuestion(null); setCounterAnswer('') }}>
                        Skip follow-up
                      </button>
                      <button className="answer-btn" onClick={handleSubmitCounterAnswer}
                        disabled={!counterAnswer.trim() || submittingCounter}>
                        {submittingCounter ? (<><span className="inline-spinner" /> Evaluating...</>) : 'Submit Follow-up'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {feedback && !counterQuestion && (
                <div className="answer-actions" style={{ justifyContent: 'center' }}>
                  <button className="next-btn" onClick={handleNext}>Next Question &#8594;</button>
                </div>
              )}
            </>
          ) : (
            <div className="thinking-indicator">
              <div className="thinking-dots"><span /><span /><span /></div>
              Loading question...
            </div>
          )}
        </div>

        {doubtOpen && (
          <div className="doubt-panel">
            <div className="doubt-panel-header">
              <h3>Ask a Doubt</h3>
              <button className="close-doubt-btn" onClick={() => setDoubtOpen(false)}>&#10005;</button>
            </div>
            <div className="doubt-messages">
              {doubtMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                  Ask any question about the current interview question. I will help clarify without giving away the answer!
                </div>
              )}
              {doubtMessages.map((msg, i) => (
                <div key={i} className={'doubt-msg ' + msg.role}>
                  {msg.content}
                  {msg.hint && <div className="hint">Hint: {msg.hint}</div>}
                </div>
              ))}
              {sendingDoubt && (
                <div className="thinking-indicator">
                  <div className="thinking-dots"><span /><span /><span /></div>
                  Thinking...
                </div>
              )}
              <div ref={doubtEndRef} />
            </div>
            <div className="doubt-input-area">
              <input className="doubt-input" placeholder="Type your doubt..."
                value={doubtText} onChange={(e) => setDoubtText(e.target.value)}
                onKeyDown={handleDoubtKeyDown} disabled={sendingDoubt} />
              <button className="doubt-send-btn" onClick={handleSendDoubt}
                disabled={!doubtText.trim() || sendingDoubt}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InterviewPage
