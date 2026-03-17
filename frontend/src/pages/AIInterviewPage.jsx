import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import VideoRoom from '../components/VideoRoom'
import {
  mockChatMessages,
  mockInterviewPrompt,
  mockStarterCode,
} from '../services/mockInterviewData'

const DEFAULT_INTERVIEWER = {
  id: 'ai-agent',
  name: 'AI Interviewer',
  role: 'Technical Interview Coach',
}

export default function AIInterviewPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [showLiveRoom, setShowLiveRoom] = useState(false)

  const interviewer = state?.interviewer ?? DEFAULT_INTERVIEWER
  const roomId = state?.roomId ?? 'mock-session-room'
  const userId = state?.userId ?? 'Candidate'

  const sessionId = useMemo(() => `${roomId.toUpperCase()}-B`, [roomId])

  const handleFinishInterview = () => {
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
      <div className="container">
        <header className="top-nav" style={{ marginBottom: '0.9rem' }}>
          <div className="brand">
            <span className="brand-dot" />
            <span>Talent IQ</span>
          </div>

          <nav className="nav-links">
            <span className="btn btn-ghost">Session ID: {sessionId}</span>
            <button type="button" className="btn btn-primary" onClick={handleFinishInterview}>
              Finish Interview
            </button>
          </nav>
        </header>

        <section className="interview-shell">
          <aside className="panel">
            <div className="panel-header">Interviewer Panel</div>
            <div className="panel-body stack">
              <div className="video-avatar">{interviewer.name}</div>

              <div className="challenge-box">
                <strong>{interviewer.name}</strong>
                <p style={{ margin: '0.45rem 0 0', color: '#93a7b2' }}>{interviewer.role}</p>
              </div>

              <div className="challenge-box">
                <strong>Prompt</strong>
                <p style={{ margin: '0.55rem 0 0' }}>{mockInterviewPrompt}</p>
              </div>

              <div className="stack" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowLiveRoom((previous) => !previous)}
                >
                  {showLiveRoom ? 'Hide Live Room' : 'Start Live Room'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleFinishInterview}>
                  Submit
                </button>
              </div>
            </div>
          </aside>

          <main className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>JavaScript (Node v18)</span>
              <button type="button" className="btn btn-ghost">Run Code</button>
            </div>

            <div className="code-surface">{mockStarterCode}</div>

            <div className="panel-body">
              <div className="challenge-box">
                <strong>Test Cases (3/3)</strong>
                <p style={{ margin: '0.5rem 0 0' }}>
                  Case 1: [4,2,7,1,3,6,9] → Passed · Case 2: [] → Passed · Case 3: [1,2] → Passed
                </p>
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

          <aside className="panel">
            <div className="panel-header">Chat</div>
            <div className="panel-body">
              <div className="chat-list">
                {mockChatMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`chat-msg ${message.sender === 'me' ? 'me' : ''}`}
                  >
                    <p style={{ margin: 0 }}>{message.text}</p>
                    <div className="chat-time" style={{ marginTop: '0.35rem' }}>{message.time}</div>
                  </article>
                ))}
              </div>

              <div style={{ marginTop: '0.8rem' }}>
                <Link to="/industry-leaders" className="btn btn-ghost" style={{ display: 'inline-flex' }}>
                  Change Interviewer
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
