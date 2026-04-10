import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import VideoRoom from '../components/VideoRoom'
import { CodeWorkspace } from '../components/CodeWorkspace'
import {
  mockChatMessages,
  mockInterviewPrompt,
  mockStarterCode,
} from '../services/mockInterviewData'

const interviewStructure = [
  { phase: 'Introduction', duration: '5 min', status: 'Completed' },
  { phase: 'Coding Challenge', duration: '45 min', status: 'In Progress' },
  { phase: 'System Design', duration: '15 min', status: 'Up Next' },
  { phase: 'Q&A', duration: '5 min', status: 'Pending' },
]

const fallbackInterviewer = {
  id: 'industry-lead',
  name: 'Sarah Miller',
  role: 'Staff Engineer · Stripe',
}

export default function IndustryLeaderInterviewPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [showLiveRoom, setShowLiveRoom] = useState(false)
  const [code, setCode] = useState(mockStarterCode)
  const [language, setLanguage] = useState('javascript')

  const interviewer = state?.interviewer ?? fallbackInterviewer
  const roomId = state?.roomId ?? `interview-${interviewer.id}`
  const userId = state?.userId ?? 'Candidate'
  const sessionId = useMemo(() => `${roomId.toUpperCase()}-B`, [roomId])

  const handleFinish = () => {
    navigate('/feedback', {
      state: {
        interviewer,
        roomId,
        userId,
      },
    })
  }

  return (
    <div className="page">
      <div className="container industry-container">
        <header className="top-nav industry-top-nav">
          <div className="brand">
            <span className="brand-dot" />
            <span>Talent IQ</span>
          </div>

          <nav className="nav-links industry-top-actions">
            <span className="session-pill">Session ID: {sessionId}</span>
            <span className="timer-pill">00:14:35</span>
            <button type="button" className="btn btn-danger" onClick={handleFinish}>
              Finish Interview
            </button>
          </nav>
        </header>

        <section className="interview-shell industry-shell">
          <aside className="panel industry-left-panel">
            <div className="panel-header industry-panel-header">
              <div>
                <p className="header-title">AI Interviewer</p>
                <p className="header-status">LISTENING</p>
              </div>
              <span className="tiny-gear">⚙</span>
            </div>

            <div className="panel-body stack industry-left-body">
              <div className="video-avatar industry-avatar">{interviewer.name}</div>

              <div className="challenge-box industry-quote-box">
                <p className="quote-text">"{mockInterviewPrompt}"</p>
              </div>

              <div className="tabs-row">
                <span className="tab active">Transcript</span>
                <span className="tab">Hints</span>
                <span className="tab">Resume Context</span>
              </div>

              <div className="challenge-box">
                <strong>{interviewer.role}</strong>
                <p className="muted-copy">
                  Asking real-time follow-up questions based on your approach.
                </p>
              </div>

              <div className="challenge-box">
                <strong>Interview Structure</strong>
                <div className="structure-list">
                  {interviewStructure.map((item) => (
                    <div key={item.phase} className="structure-item">
                      <span className="structure-dot" />
                      <div>
                        <p className="structure-phase">{item.phase}</p>
                        <p className="structure-meta">{item.duration} · {item.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="panel industry-main-panel">
            <CodeWorkspace
              mode="industry"
              language={language}
              onLanguageChange={setLanguage}
              code={code}
              onCodeChange={(val) => setCode(val || '')}
            />

            <div className="panel-body stack">
              <div className="challenge-box">
                <strong>Prompt</strong>
                <p className="prompt-copy">{mockInterviewPrompt}</p>
              </div>

              <div className="challenge-box">
                <strong>Test Cases (3/3)</strong>
                <p className="prompt-copy">
                  All tests passed. Ready to submit.
                </p>
              </div>

              <div className="stack action-row-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowLiveRoom((previous) => !previous)}
                >
                  {showLiveRoom ? 'Hide Video Room' : 'Open Video Room'}
                </button>
                <Link to="/industry-leaders" className="btn btn-ghost">Change Interviewer</Link>
                <button type="button" className="btn btn-primary" onClick={handleFinish}>
                  Submit Answer
                </button>
              </div>

              {showLiveRoom && (
                <div className="room-wrap">
                  <VideoRoom
                    roomId={roomId}
                    userId={userId}
                    onLeave={() => setShowLiveRoom(false)}
                  />
                </div>
              )}
            </div>
          </main>

          <aside className="panel industry-right-panel">
            <div className="panel-header">Chat</div>
            <div className="panel-body">
              <div className="chat-list">
                {mockChatMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`chat-msg ${message.sender === 'me' ? 'me' : ''}`}
                  >
                    <p className="chat-copy">{message.text}</p>
                    <div className="chat-time" style={{ marginTop: '0.35rem' }}>{message.time}</div>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
