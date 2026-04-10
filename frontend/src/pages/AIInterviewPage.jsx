import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAllQuestions,
  getCurrentQuestion,
  submitAnswer,
  submitCounterAnswer,
  moveToNext,
  askDoubt,
  endInterview,
  cleanQuestionText,
} from '../services/interviewApi'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeWorkspace } from '../components/CodeWorkspace'
import {
  buildCodingStarter,
  buildCodingTestCases,
  createDefaultTestCases,
  formatStructuredCaseInput,
  formatExampleInput,
} from '../components/CodeWorkspace'
import '../styles/AIInterviewPage.css'

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// ── Component ──

export default function AIInterviewPage() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()

  // Core state
  const [sections, setSections] = useState([])
  const [currentQ, setCurrentQ] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [counterQuestion, setCounterQuestion] = useState(null)
  const [counterAnswer, setCounterAnswer] = useState('')
  const [counterMessages, setCounterMessages] = useState([])
  const [activeCounterIndex, setActiveCounterIndex] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittingCounter, setSubmittingCounter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // UI state
  const [activeTab, setActiveTab] = useState('transcript')
  const [elapsed, setElapsed] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const synthRef = useRef(window.speechSynthesis)

  // Doubt panel
  const [doubtOpen, setDoubtOpen] = useState(false)
  const [doubtText, setDoubtText] = useState('')
  const [doubtMessages, setDoubtMessages] = useState([])
  const [sendingDoubt, setSendingDoubt] = useState(false)
  const doubtEndRef = useRef(null)

  // Code state
  const [ideLanguage, setIdeLanguage] = useState('javascript')
  const [testCases, setTestCases] = useState(createDefaultTestCases())
  const [cleanedQuestion, setCleanedQuestion] = useState(null)
  const [cleaningQuestion, setCleaningQuestion] = useState(false)

  // Speech
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTarget, setRecordingTarget] = useState(null)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [soundPulse, setSoundPulse] = useState(0)
  const recognitionRef = useRef(null)
  const audioPulseRef = useRef(null)
  const recordingBaseTextRef = useRef('')
  const recordingFinalTextRef = useRef('')

  // Camera
  const [camActive, setCamActive] = useState(false)
  const videoRef = useRef(null)

  // ── Timer ──
  useEffect(() => {
    const interval = setInterval(() => setElapsed((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Webcam ──
  useEffect(() => {
    let stream
    if (camActive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
        .catch(() => {})
    }
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()) }
  }, [camActive])

  // ── Speech-to-Text Init ──
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setSpeechSupported(false); return }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      let len = 0
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0]?.transcript || ''
        len += t.length
        if (event.results[i].isFinal) finalTranscript += t
        else interimTranscript += t
      }
      setSoundPulse(Math.min(1, Math.max(0.15, len / 60)))
      if (finalTranscript) recordingFinalTextRef.current += finalTranscript + ' '
      const text = (recordingBaseTextRef.current + recordingFinalTextRef.current + interimTranscript).trimStart()
      setRecordingTarget((prev) => {
        if (prev === 'answer') setAnswer(text)
        else if (prev === 'counter') setCounterAnswer(text)
        else if (prev === 'doubt') setDoubtText(text)
        return prev
      })
    }
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') { setIsRecording(false); setRecordingTarget(null); setSoundPulse(0) }
    }
    recognition.onend = () => {
      setIsRecording((prev) => {
        if (!prev) setSoundPulse(0)
        if (prev && recognitionRef.current) { try { recognitionRef.current.start() } catch {} }
        return prev
      })
    }
    return () => recognition.stop()
  }, [])

  const toggleRecording = useCallback((target) => {
    if (!recognitionRef.current) return
    if (isRecording && recordingTarget === target) {
      recognitionRef.current.stop()
      setIsRecording(false); setRecordingTarget(null); setSoundPulse(0)
    } else {
      if (isRecording) recognitionRef.current.stop()
      recordingBaseTextRef.current = target === 'answer' ? answer : target === 'counter' ? counterAnswer : doubtText
      recordingFinalTextRef.current = ''
      setRecordingTarget(target); setIsRecording(true)
      try { recognitionRef.current.start() } catch { setIsRecording(false); setRecordingTarget(null); setSoundPulse(0) }
    }
  }, [isRecording, recordingTarget, answer, counterAnswer, doubtText])

  // ── TTS ──
  const speak = useCallback((text) => {
    const synth = synthRef.current
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95; u.pitch = 1; u.volume = 1
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

  const toggleTTS = useCallback(() => {
    const synth = synthRef.current
    if (synth.speaking) { synth.cancel(); setIsSpeaking(false) }
    else if (currentQ) speak(currentQ.question)
  }, [currentQ, speak])

  useEffect(() => { return () => synthRef.current.cancel() }, [])

  // ── Data loading ──
  const loadSidebar = useCallback(async () => {
    try {
      const res = await getAllQuestions(sessionId)
      setSections(res.data.sections || [])
      if (res.data.status === 'completed') setCompleted(true)
    } catch (err) { console.error('Failed to load sidebar:', err) }
  }, [sessionId])

  const loadCurrentQuestion = useCallback(async () => {
    try {
      const res = await getCurrentQuestion(sessionId)
      if (res.data.status === 'completed') { setCompleted(true); return }
      setCurrentQ(res.data)
      setAnswer('')
      setFeedback(null)
      setCounterQuestion(null); setCounterAnswer(''); setCounterMessages([]); setActiveCounterIndex(null)
      setTestCases(buildCodingTestCases(res.data.coding))
      setCleanedQuestion(null); setCleaningQuestion(false)
      setDoubtMessages([]); setDoubtOpen(false)
      recognitionRef.current?.stop()
      setIsRecording(false); setRecordingTarget(null); setSoundPulse(0)
    } catch { setError('Failed to load question') }
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

  // ── Auto-TTS for text questions ──
  useEffect(() => {
    if (currentQ && currentQ.question && currentQ.type !== 'coding' && !feedback && !isRecording) {
      const t = setTimeout(() => speak(currentQ.question), 500)
      return () => clearTimeout(t)
    }
  }, [currentQ?.question_number])

  // ── Coding question setup ──
  // Track the language that was used to generate the current starter code
  const lastStarterLangRef = useRef(ideLanguage)

  useEffect(() => {
    if (currentQ?.type === 'coding') {
      const nextLang = ideLanguage
      lastStarterLangRef.current = nextLang
      setAnswer(buildCodingStarter(nextLang, currentQ.question, currentQ.coding))

      const mongoTC = currentQ?.coding?.visibleTestCases
      const hasMongo = Array.isArray(mongoTC) && mongoTC.length > 0
      if (hasMongo) {
        setTestCases(mongoTC.slice(0, 3).map((tc, i) => ({
          id: i + 1, name: `Case ${i + 1}`,
          input: JSON.stringify(Object.fromEntries(Object.entries(tc).filter(([k]) => k !== 'output' && k !== 'hidden')), null, 2),
          expectedOutput: String(tc.output || ''), actualOutput: '', status: 'idle', passed: null, structured: true,
        })))
      } else {
        setTestCases(buildCodingTestCases(currentQ.coding))
      }

      setCleanedQuestion(null); setCleaningQuestion(true)
      cleanQuestionText(currentQ.question, currentQ?.coding?.source?.title || '')
        .then((res) => {
          setCleanedQuestion(res.data)
          if (!hasMongo && Array.isArray(res.data.testCases) && res.data.testCases.length > 0) {
            setTestCases(res.data.testCases.slice(0, 3).map((tc, i) => {
              let inputStr = ''
              if (typeof tc.input === 'object' && tc.input !== null) inputStr = JSON.stringify(tc.input, null, 2)
              else if (typeof tc.input === 'string') { try { inputStr = JSON.stringify(JSON.parse(tc.input), null, 2) } catch { inputStr = tc.input } }
              return {
                id: i + 1, name: `Case ${i + 1}`, input: inputStr,
                expectedOutput: typeof tc.expectedOutput === 'object' ? JSON.stringify(tc.expectedOutput) : String(tc.expectedOutput || ''),
                actualOutput: '', status: 'idle', passed: null,
                structured: currentQ?.coding?.executionStyle === 'leetcode',
              }
            }))
          }
        })
        .catch(() => setCleanedQuestion(null))
        .finally(() => setCleaningQuestion(false))
    }
  }, [currentQ?.question_number, currentQ?.type])

  // Regenerate starter code when language changes (any coding question)
  const handleLanguageChange = useCallback((newLang) => {
    setIdeLanguage(newLang)
    if (currentQ?.type === 'coding') {
      // Only regenerate if user hasn't modified the code beyond the starter template
      const currentStarter = buildCodingStarter(lastStarterLangRef.current, currentQ.question, currentQ.coding)
      if (answer === currentStarter || !answer.trim()) {
        lastStarterLangRef.current = newLang
        setAnswer(buildCodingStarter(newLang, currentQ.question, currentQ.coding))
      } else {
        lastStarterLangRef.current = newLang
      }
    }
  }, [currentQ, answer])

  // ── Sound pulse decay ──
  useEffect(() => {
    if (!isRecording) { setSoundPulse(0); return }
    audioPulseRef.current = window.setInterval(() => setSoundPulse((p) => (p > 0.2 ? +(p - 0.08).toFixed(2) : 0.18)), 180)
    return () => { if (audioPulseRef.current) window.clearInterval(audioPulseRef.current) }
  }, [isRecording])

  // ── Doubt scroll ──
  useEffect(() => { doubtEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [doubtMessages])

  // ── Handlers ──
  const handleSubmitAnswer = async () => {
    if (!answer.trim() || submitting) return
    if (isRecording) toggleRecording('answer')
    setSubmitting(true); setError('')
    try {
      const res = await submitAnswer(sessionId, answer.trim())
      setFeedback(res.data)
      if (res.data.has_counter_question && res.data.counter_question) {
        setCounterQuestion(res.data.counter_question)
        setCounterMessages([{ role: 'assistant', content: res.data.counter_question }])
        setActiveCounterIndex(res.data.counter_index ?? 0)
        setTimeout(() => speak(res.data.counter_question), 800)
      }
      await loadSidebar()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to submit answer') }
    finally { setSubmitting(false) }
  }

  const handleSubmitCounterAnswer = async () => {
    if (!counterAnswer.trim() || submittingCounter) return
    if (isRecording) toggleRecording('counter')
    setSubmittingCounter(true)
    try {
      const text = counterAnswer.trim()
      setCounterMessages((prev) => [...prev, { role: 'user', content: text }])
      const res = await submitCounterAnswer(sessionId, text, currentQ?.question_number, activeCounterIndex, counterQuestion)
      setCounterMessages((prev) => [...prev, { role: 'assistant', content: res.data.feedback, type: 'feedback' }])
      setFeedback((prev) => ({ ...prev, counter_feedback: res.data.feedback, score_adjustment: res.data.score_adjustment }))
      setCounterQuestion(null); setActiveCounterIndex(null); setCounterAnswer('')
    } catch { setError('Failed to submit follow-up answer') }
    finally { setSubmittingCounter(false) }
  }

  const handleNext = async () => {
    try {
      if (isRecording) toggleRecording(recordingTarget)
      const res = await moveToNext(sessionId)
      if (res.data.status === 'completed') { setCompleted(true); return }
      setCurrentQ(res.data)
      setAnswer(''); setFeedback(null)
      setCounterQuestion(null); setCounterAnswer(''); setCounterMessages([]); setActiveCounterIndex(null)
      setTestCases(buildCodingTestCases(res.data.coding))
      setDoubtMessages([]); setDoubtOpen(false)
      await loadSidebar()
    } catch { setError('Failed to load next question') }
  }

  const handleSkip = async () => {
    if (isRecording) toggleRecording(recordingTarget)
    try {
      submitAnswer(sessionId, '(Skipped)').catch(() => {})
      await handleNext()
    } catch { setError('Failed to skip question') }
  }

  const handleEndInterview = async () => {
    if (!window.confirm('Are you sure you want to end the interview?')) return
    if (isRecording) toggleRecording(recordingTarget)
    try { await endInterview(sessionId); setCompleted(true) }
    catch { setError('Failed to end interview') }
  }

  const handleSendDoubt = async () => {
    if (!doubtText.trim() || sendingDoubt) return
    if (isRecording && recordingTarget === 'doubt') toggleRecording('doubt')
    const text = doubtText.trim()
    setDoubtText('')
    setDoubtMessages((prev) => [...prev, { role: 'user', content: text }])
    setSendingDoubt(true)
    try {
      const activeContext = counterQuestion || currentQ?.question || ''
      const res = await askDoubt(sessionId, text, activeContext)
      const short = (res.data.response || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).slice(0, 4).join(' ')
      const response = short.length > 420 ? short.slice(0, 417).trimEnd() + '...' : short
      setDoubtMessages((prev) => [...prev, { role: 'assistant', content: response || 'Try focusing on the key requirement.', hint: res.data.hint }])
      speak(response || 'Try focusing on the key requirement.')
    } catch { setDoubtMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not process your question.' }]) }
    finally { setSendingDoubt(false) }
  }

  // ── Computed ──
  const isStructuredCoding = currentQ?.coding?.executionStyle === 'leetcode'
  const codingSource = currentQ?.coding?.source || null
  const cqn = currentQ?.current_index ?? 0
  const tq = currentQ?.total_questions ?? 0
  const ac = sections.reduce((s, sec) => s + sec.questions.filter((q) => q.answered).length, 0)
  const tc = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const pct = tq > 0 ? ((cqn + (feedback ? 1 : 0)) / tq) * 100 : 0

  // ── Transcript messages from conversation ──
  const transcriptMessages = useMemo(() => {
    const msgs = []
    if (currentQ?.question) {
      msgs.push({ id: 'q-' + currentQ.question_number, sender: 'ai', text: currentQ.question, time: '' })
    }
    if (feedback) {
      msgs.push({ id: 'a-' + currentQ?.question_number, sender: 'me', text: answer, time: '' })
    }
    if (counterMessages.length > 0) {
      counterMessages.forEach((cm, i) => {
        msgs.push({ id: 'cm-' + i, sender: cm.role === 'user' ? 'me' : 'ai', text: cm.content, time: '' })
      })
    }
    return msgs
  }, [currentQ, feedback, answer, counterMessages])

  // ── Loading / Completed states ──
  if (loading) {
    return (
      <div className="ai-interview-page">
        <div className="ai-loading-screen">
          <div className="ai-loading-spinner" />
          <span>Loading interview...</span>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="ai-interview-page">
        <div className="ai-loading-screen">
          <div style={{ fontSize: '3rem' }}>🎉</div>
          <h2 style={{ color: '#e0e8ed', margin: '0.5rem 0' }}>Interview Complete!</h2>
          <p style={{ color: '#7a8f9a' }}>Great job! Your responses have been evaluated.</p>
          <button type="button" className="ai-run-btn" style={{ marginTop: '1rem' }} onClick={() => navigate(`/interview-report/${sessionId}`)}>
            View Detailed Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-interview-page">
      {/* ── Header ── */}
      <header className="ai-header">
        <div className="ai-header-left">
          <span className="ai-header-dot" />
          <span className="ai-header-title">
            {currentQ?.section_title || 'AI Interview'} — Q{cqn + 1} of {tq}
          </span>
          {currentQ?.difficulty && (
            <span className={`ai-difficulty-badge ai-difficulty-badge--${currentQ.difficulty}`}>
              {currentQ.difficulty}
            </span>
          )}
          {currentQ?.type === 'coding' && <span className="ai-difficulty-badge ai-difficulty-badge--medium" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}>Code</span>}
        </div>

        <div className="ai-header-center">
          <span className="ai-rec-dot" />
          <span className="ai-timer">{formatTime(elapsed)}</span>
        </div>

        <div className="ai-header-right">
          <button type="button" className="ai-finish-btn" onClick={handleEndInterview}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
            Finish Interview
          </button>
        </div>
      </header>

      {/* ── Workspace ── */}
      <div className={`ai-workspace ${doubtOpen ? 'ai-workspace--with-doubt' : ''}`}>

        {/* ── Left Panel ── */}
        <div className="ai-left-panel">
          {/* Interviewer Header */}
          <div className="ai-interviewer-header">
            <div className="ai-interviewer-info">
              <div className="ai-interviewer-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <div>
                <div className="ai-interviewer-name">AI Interviewer</div>
                <div className="ai-interviewer-status">{isSpeaking ? 'Speaking' : isRecording ? 'Listening' : 'Ready'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {currentQ?.type !== 'coding' && (
                <button type="button" className={`ai-settings-btn ${isSpeaking ? 'ai-action-btn--active' : ''}`} title={isSpeaking ? 'Stop reading' : 'Read aloud'} onClick={toggleTTS} style={isSpeaking ? { color: '#18c2a4' } : {}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
                </button>
              )}
              <button type="button" className={`ai-settings-btn ${doubtOpen ? 'ai-action-btn--active' : ''}`} title="Ask doubt" onClick={() => setDoubtOpen(!doubtOpen)} style={doubtOpen ? { color: '#18c2a4' } : {}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </button>
            </div>
          </div>

          {/* Audio Viz */}
          {(isSpeaking || isRecording) && (
            <div className="ai-audio-viz-area">
              <div className="ai-audio-circle">
                <span className="ai-audio-bar" /><span className="ai-audio-bar" /><span className="ai-audio-bar" /><span className="ai-audio-bar" /><span className="ai-audio-bar" />
              </div>
            </div>
          )}

          {/* Progress */}
          <div style={{ padding: '0 0.85rem', marginTop: '0.5rem' }}>
            <div className="ai-progress-bar">
              <div className="ai-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#5a6f7a', marginTop: '0.25rem' }}>
              <span>{ac}/{tc} answered</span>
              <span>{Math.round(pct)}%</span>
            </div>
          </div>

          {/* Question Card */}
          {currentQ && currentQ.type !== 'coding' && (
            <div className="ai-question-card">
              <p className="ai-question-text">&ldquo;{currentQ.question}&rdquo;</p>
            </div>
          )}

          {/* Sidebar Sections */}
          <div className="ai-tabs">
            <button type="button" className={`ai-tab ${activeTab === 'transcript' ? 'ai-tab--active' : ''}`} onClick={() => setActiveTab('transcript')}>Transcript</button>
            <button type="button" className={`ai-tab ${activeTab === 'questions' ? 'ai-tab--active' : ''}`} onClick={() => setActiveTab('questions')}>Questions</button>
            <button type="button" className={`ai-tab ${activeTab === 'hints' ? 'ai-tab--active' : ''}`} onClick={() => setActiveTab('hints')}>Hints</button>
          </div>

          {activeTab === 'transcript' && (
            <div className="ai-transcript">
              {transcriptMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#4a5f6a', padding: '2rem 1rem', fontSize: '0.82rem' }}>Conversation will appear here...</div>
              )}
              {transcriptMessages.map((msg) => (
                <div key={msg.id} className="ai-chat-msg">
                  <div className="ai-chat-sender">
                    <span className={`ai-chat-sender-icon ${msg.sender === 'me' ? 'ai-chat-sender-icon--you' : 'ai-chat-sender-icon--ai'}`}>{msg.sender === 'me' ? 'Y' : 'AI'}</span>
                    <span className="ai-chat-sender-name">{msg.sender === 'me' ? 'You' : 'AI Agent'}</span>
                  </div>
                  <div className={`ai-chat-bubble ${msg.sender === 'me' ? 'ai-chat-bubble--you' : 'ai-chat-bubble--ai'}`}>{msg.text}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="ai-sidebar-sections">
              {sections.map((section, si) => (
                <div key={si} className="ai-sidebar-section">
                  <div className={`ai-sidebar-section-title ${si === (currentQ?.section_index ?? 0) ? 'ai-sidebar-section-title--active' : ''}`}>{section.title}</div>
                  {section.questions.map((q) => {
                    const isCur = q.questionNumber === cqn && !completed
                    return (
                      <div key={q.questionNumber} className={`ai-sidebar-q ${isCur ? 'ai-sidebar-q--current' : ''} ${q.answered ? 'ai-sidebar-q--done' : ''}`}>
                        <span className="ai-sidebar-q-status">{q.answered ? '✓' : isCur ? '▸' : '○'}</span>
                        <span className="ai-sidebar-q-text">{q.question}</span>
                        <span className={`ai-sidebar-q-diff ai-sidebar-q-diff--${q.difficulty}`}>{q.difficulty}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hints' && (
            <div className="ai-hints-content">
              {doubtMessages.filter((m) => m.hint).map((m, i) => (
                <div key={i} className="ai-hint-card">
                  <div className="ai-hint-label">Hint {i + 1}</div>
                  <p className="ai-hint-text">{m.hint}</p>
                </div>
              ))}
              {doubtMessages.filter((m) => m.hint).length === 0 && (
                <div style={{ textAlign: 'center', color: '#4a5f6a', padding: '2rem 1rem', fontSize: '0.82rem' }}>Use the doubt panel (?) to get hints from the AI coach.</div>
              )}
            </div>
          )}

          {/* Speak / Mic bar */}
          <div className="ai-speak-bar">
            <button type="button" className={`ai-speak-btn ${isRecording && recordingTarget === 'answer' ? 'ai-speak-btn--active' : ''}`} onClick={() => toggleRecording('answer')}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
              {isRecording && recordingTarget === 'answer' ? 'Recording... click to stop' : speechSupported ? 'Click to speak answer' : 'Speech not supported'}
            </button>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="ai-right-panel">
          {error && <div className="ai-error-banner">{error}<button type="button" onClick={() => setError('')}>✕</button></div>}

          {/* ── Text answer mode ── */}
          {currentQ?.type !== 'coding' && !feedback && !counterQuestion && (
            <div className="ai-text-answer-area">
              <textarea
                className="ai-answer-textarea"
                placeholder="Type your answer here or use the microphone..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={submitting}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSubmitAnswer() }}
              />
              {isRecording && recordingTarget === 'answer' && (
                <div className="ai-mic-visualizer">
                  <span style={{ transform: `scaleY(${0.45 + soundPulse})` }} />
                  <span style={{ transform: `scaleY(${0.65 + soundPulse / 1.4})` }} />
                  <span style={{ transform: `scaleY(${0.35 + soundPulse / 1.8})` }} />
                  <span style={{ transform: `scaleY(${0.8 + soundPulse / 1.2})` }} />
                </div>
              )}
              <div className="ai-answer-actions">
                <button type="button" className="ai-skip-btn" onClick={handleSkip} disabled={submitting}>Skip</button>
                <button type="button" className="ai-submit-btn" onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting}>
                  {submitting ? 'Evaluating...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          )}

          {/* ── Counter-question ── */}
          {counterQuestion && (
            <div className="ai-counter-card">
              <div className="ai-counter-label">Follow-up Question</div>
              <p className="ai-counter-text">{counterQuestion}</p>
              <textarea
                className="ai-answer-textarea"
                placeholder="Answer the follow-up question or use the mic..."
                value={counterAnswer}
                onChange={(e) => setCounterAnswer(e.target.value)}
                disabled={submittingCounter}
                style={{ minHeight: '80px' }}
              />
              {isRecording && recordingTarget === 'counter' && (
                <div className="ai-mic-visualizer">
                  <span style={{ transform: `scaleY(${0.45 + soundPulse})` }} />
                  <span style={{ transform: `scaleY(${0.65 + soundPulse / 1.4})` }} />
                  <span style={{ transform: `scaleY(${0.35 + soundPulse / 1.8})` }} />
                  <span style={{ transform: `scaleY(${0.8 + soundPulse / 1.2})` }} />
                </div>
              )}
              <div className="ai-answer-actions">
                <button type="button" className={`ai-counter-mic-btn ${isRecording && recordingTarget === 'counter' ? 'ai-counter-mic-btn--active' : ''}`} onClick={() => toggleRecording('counter')} title={isRecording && recordingTarget === 'counter' ? 'Stop recording' : 'Speak answer'} disabled={!speechSupported}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                  {isRecording && recordingTarget === 'counter' ? 'Stop' : 'Mic'}
                </button>
                <button type="button" className="ai-skip-btn" onClick={() => { setCounterQuestion(null); setCounterAnswer(''); setCounterMessages([]); setActiveCounterIndex(null) }}>Close</button>
                <button type="button" className="ai-submit-btn" onClick={handleSubmitCounterAnswer} disabled={!counterAnswer.trim() || submittingCounter}>
                  {submittingCounter ? 'Sending...' : 'Send Follow-up'}
                </button>
              </div>
            </div>
          )}

          {/* ── Next question card ── */}
          {feedback && !counterQuestion && currentQ?.type !== 'coding' && (
            <div className="ai-next-card">
              <div><strong>Answer saved</strong><p style={{ color: '#7a8f9a', margin: '0.25rem 0 0', fontSize: '0.82rem' }}>Move ahead when you are ready.</p></div>
              <button type="button" className="ai-run-btn" onClick={handleNext}>Next Question →</button>
            </div>
          )}

          {/* ── Coding mode ── */}
          {currentQ?.type === 'coding' && (
            <div className="ai-coding-split">
              {/* Problem Panel */}
              <div className="ai-problem-panel">
                <div className="ai-problem-header">
                  <h3 className="ai-problem-title">
                    {codingSource?.questionId ? `${codingSource.questionId}. ` : ''}
                    {cleanedQuestion?.title || codingSource?.title || 'Coding Challenge'}
                  </h3>
                  <span className={`ai-difficulty-badge ai-difficulty-badge--${currentQ.difficulty}`}>{currentQ.difficulty}</span>
                </div>
                {codingSource?.tags?.length > 0 && (
                  <div className="ai-problem-tags">{codingSource.tags.map((t) => <span key={t} className="ai-problem-tag">{t}</span>)}</div>
                )}
                {cleaningQuestion && <div className="ai-problem-loading"><div className="ai-loading-spinner" style={{ width: 18, height: 18 }} /><span>Formatting...</span></div>}
                <div className="ai-problem-body">
                  {cleanedQuestion ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanedQuestion.description}</ReactMarkdown>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentQ.question}</ReactMarkdown>
                  )}
                  {(() => {
                    const examples = currentQ?.coding?.examples?.length > 0 ? currentQ.coding.examples : cleanedQuestion?.examples
                    return examples?.length > 0 && examples.map((ex, i) => (
                      <div key={i} className="ai-example">
                        <p><strong>Example {i + 1}:</strong></p>
                        <div className="ai-example-block">
                          <div><strong>Input:</strong> <code>{formatExampleInput(ex.input)}</code></div>
                          <div><strong>Output:</strong> <code>{typeof ex.output === 'object' ? JSON.stringify(ex.output) : ex.output}</code></div>
                          {ex.explanation && <div><strong>Explanation:</strong> {ex.explanation}</div>}
                        </div>
                      </div>
                    ))
                  })()}
                  {(() => {
                    const constraints = currentQ?.coding?.constraints?.length > 0 ? currentQ.coding.constraints : cleanedQuestion?.constraints
                    return constraints?.length > 0 && (
                      <div className="ai-constraints"><p><strong>Constraints:</strong></p><ul>{constraints.map((c, i) => <li key={i}><code>{c}</code></li>)}</ul></div>
                    )
                  })()}
                </div>
                {/* Submit coding answer */}
                <div className="ai-answer-actions" style={{ padding: '0.6rem 0.85rem', borderTop: '1px solid #1e272e' }}>
                  <button type="button" className="ai-skip-btn" onClick={handleSkip} disabled={submitting}>Skip</button>
                  <button type="button" className="ai-submit-btn" onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting}>
                    {submitting ? 'Evaluating...' : 'Submit Answer'}
                  </button>
                </div>
                {/* Next after feedback for coding */}
                {feedback && !counterQuestion && (
                  <div className="ai-next-card" style={{ margin: '0.5rem 0.85rem', borderRadius: '8px' }}>
                    <div><strong>Answer saved</strong></div>
                    <button type="button" className="ai-run-btn" onClick={handleNext}>Next →</button>
                  </div>
                )}
              </div>

              {/* Editor Panel — CodeWorkspace */}
              <CodeWorkspace
                key={currentQ?.question_number}
                mode="ai"
                language={ideLanguage}
                onLanguageChange={handleLanguageChange}
                code={answer}
                onCodeChange={(val) => setAnswer(val || '')}
                languageDisabled={false}
                testCases={testCases}
                onTestCasesChange={setTestCases}
                isStructuredCoding={isStructuredCoding}
                headerExtra={
                  <button type="button" className={`ai-settings-btn ${isRecording && recordingTarget === 'answer' ? 'ai-action-btn--active' : ''}`} onClick={() => toggleRecording('answer')} title="Dictate code" disabled={!speechSupported}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                  </button>
                }
              />
            </div>
          )}
        </div>

        {/* ── Doubt Panel ── */}
        {doubtOpen && (
          <div className="ai-doubt-panel">
            <div className="ai-doubt-header">
              <div><strong>Interview Coach</strong><p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#5a6f7a' }}>Ask about the current question.</p></div>
              <button type="button" className="ai-settings-btn" onClick={() => setDoubtOpen(false)}>✕</button>
            </div>
            <div className="ai-doubt-messages">
              {doubtMessages.length === 0 && <div style={{ textAlign: 'center', color: '#4a5f6a', padding: '2rem 1rem', fontSize: '0.82rem' }}>Ask any question. I&apos;ll help without spoiling the answer!</div>}
              {doubtMessages.map((msg, i) => (
                <div key={i} className={`ai-doubt-msg ai-doubt-msg--${msg.role}`}>
                  <div className="ai-doubt-msg-role">{msg.role === 'user' ? 'You' : 'Coach'}</div>
                  <div>{msg.content}</div>
                  {msg.hint && <div className="ai-doubt-hint">💡 {msg.hint}</div>}
                </div>
              ))}
              {sendingDoubt && <div style={{ color: '#5a6f7a', fontSize: '0.82rem', padding: '0.5rem' }}>Thinking...</div>}
              <div ref={doubtEndRef} />
            </div>
            <div className="ai-doubt-input-area">
              <input className="ai-doubt-input" placeholder="Type your doubt..." value={doubtText} onChange={(e) => setDoubtText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDoubt() } }} disabled={sendingDoubt} />
              <button type="button" className="ai-doubt-send" onClick={handleSendDoubt} disabled={!doubtText.trim() || sendingDoubt}>Send</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating action bar ── */}
      <div className="ai-action-bar">
        <button type="button" className={`ai-action-btn ${isRecording ? 'ai-action-btn--active' : ''}`} onClick={() => toggleRecording('answer')} title={isRecording ? 'Stop' : 'Speak answer'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
        </button>
        <button type="button" className={`ai-action-btn ${camActive ? 'ai-action-btn--active' : ''}`} onClick={() => setCamActive(!camActive)} title={camActive ? 'Camera off' : 'Camera on'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
        </button>
      </div>

      {/* ── User Video ── */}
      {camActive && (
        <div className="ai-user-video">
          <video ref={videoRef} autoPlay muted playsInline />
          <span className="ai-user-video-label">YOU</span>
        </div>
      )}
    </div>
  )
}
