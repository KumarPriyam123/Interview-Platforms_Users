import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { mockInterviewReport } from '../services/mockInterviewData'

const p2pFeedbackCategories = [
  'Communication',
  'Technical Correctness',
  'Fluency',
  'Collaboration',
]

function createInitialRatings() {
  return p2pFeedbackCategories.reduce((ratings, category) => {
    ratings[category] = 4
    return ratings
  }, {})
}

export default function FeedbackPage() {
  const { state } = useLocation()
  const interviewerName = state?.interviewer?.name ?? 'AI Interviewer'
  const isP2PSession = state?.sessionType === 'p2p'
  const peerName = state?.peerName ?? interviewerName
  const sessionDuration = state?.duration ?? mockInterviewReport.duration
  const sessionReason = state?.reason ?? 'The session was completed.'

  const [peerRatings, setPeerRatings] = useState(createInitialRatings)
  const [selfRatings, setSelfRatings] = useState(createInitialRatings)
  const [peerComment, setPeerComment] = useState('')
  const [selfComment, setSelfComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (isP2PSession) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: '980px' }}>
          <header className="top-nav" style={{ marginBottom: '1rem' }}>
            <div className="brand">
              <span className="brand-dot" />
              <span>Talent IQ</span>
            </div>

            <nav className="nav-links">
              <Link to="/" className="btn btn-ghost">Dashboard</Link>
            </nav>
          </header>

          <section className="report-card">
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Peer Session Completed</h1>
            <p style={{ margin: '0.35rem 0 0', color: '#8ea3ad' }}>
              Room: {state?.roomId ?? 'P2P session'} · Duration: {sessionDuration} · Peer: {peerName}
            </p>

            <div className="challenge-box" style={{ marginTop: '1rem' }}>
              <strong>Session outcome</strong>
              <p style={{ margin: '0.4rem 0 0' }}>{sessionReason}</p>
            </div>

            <div className="feedback-form-grid">
              <article className="feedback-section">
                <h3>Feedback for {peerName}</h3>
                {p2pFeedbackCategories.map((category) => (
                  <label key={category} className="feedback-rating-row">
                    <span>{category}</span>
                    <div className="feedback-range-wrap">
                      <input
                        className="feedback-range"
                        type="range"
                        min="1"
                        max="5"
                        value={peerRatings[category]}
                        onChange={(event) => {
                          setPeerRatings((currentRatings) => ({
                            ...currentRatings,
                            [category]: Number(event.target.value),
                          }))
                        }}
                      />
                      <strong>{peerRatings[category]}/5</strong>
                    </div>
                  </label>
                ))}

                <label className="p2p-field">
                  <span>Notes for your peer</span>
                  <textarea
                    className="feedback-textarea"
                    value={peerComment}
                    onChange={(event) => setPeerComment(event.target.value)}
                    placeholder="Highlight strengths, gaps, and what they should improve next."
                  />
                </label>
              </article>

              <article className="feedback-section">
                <h3>Self reflection</h3>
                {p2pFeedbackCategories.map((category) => (
                  <label key={category} className="feedback-rating-row">
                    <span>{category}</span>
                    <div className="feedback-range-wrap">
                      <input
                        className="feedback-range"
                        type="range"
                        min="1"
                        max="5"
                        value={selfRatings[category]}
                        onChange={(event) => {
                          setSelfRatings((currentRatings) => ({
                            ...currentRatings,
                            [category]: Number(event.target.value),
                          }))
                        }}
                      />
                      <strong>{selfRatings[category]}/5</strong>
                    </div>
                  </label>
                ))}

                <label className="p2p-field">
                  <span>What you will do differently next time</span>
                  <textarea
                    className="feedback-textarea"
                    value={selfComment}
                    onChange={(event) => setSelfComment(event.target.value)}
                    placeholder="Capture the one or two changes you want to make in your next mock round."
                  />
                </label>
              </article>
            </div>

            <div className="hero-actions" style={{ justifyContent: 'flex-start', marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary" onClick={() => setSubmitted(true)}>
                Save Feedback
              </button>
              <Link to="/p2p-interview" className="btn btn-ghost">Start Another P2P Session</Link>
            </div>

            {submitted ? (
              <div className="challenge-box feedback-summary">
                <strong>Feedback captured</strong>
                <p>
                  Your ratings for {peerName} and your self reflection are ready to be submitted when backend persistence is added.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '980px' }}>
        <header className="top-nav" style={{ marginBottom: '1rem' }}>
          <div className="brand">
            <span className="brand-dot" />
            <span>Talent IQ</span>
          </div>
          <nav className="nav-links">
            <Link to="/" className="btn btn-ghost">Dashboard</Link>
          </nav>
        </header>

        <section className="report-card">
          <h1 style={{ margin: 0, fontSize: '2rem' }}>Interview Completed</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#8ea3ad' }}>
            #{mockInterviewReport.interviewId} · {mockInterviewReport.duration} · Interviewer: {interviewerName}
          </p>

          <div className="report-grid">
            <article className="report-card" style={{ margin: 0 }}>
              <h3 style={{ margin: 0 }}>Overall Match Score</h3>
              <div className="score-ring">{mockInterviewReport.score}</div>
              <p style={{ margin: 0, color: '#99aeb9' }}>
                Great job! Your current profile is trending toward strong frontend role readiness.
              </p>
            </article>

            <article className="report-card" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Performance Breakdown</h3>
              {mockInterviewReport.performance.map((metric) => (
                <div key={metric.name} className="metric">
                  <div className="metric-top">
                    <span>{metric.name}</span>
                    <span>{metric.score}%</span>
                  </div>
                  <div className="metric-bar">
                    <div className="metric-fill" style={{ width: `${metric.score}%` }} />
                  </div>
                </div>
              ))}
            </article>
          </div>

          <div className="feature-grid" style={{ marginTop: '0.9rem' }}>
            <article className="report-card" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Key Strengths</h3>
              <ul className="list">
                {mockInterviewReport.strengths.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </article>

            <article className="report-card" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Areas for Improvement</h3>
              <ul className="list">
                {mockInterviewReport.improvements.map((improvement) => (
                  <li key={improvement}>{improvement}</li>
                ))}
              </ul>
            </article>

            <article className="report-card" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Next Step</h3>
              <p style={{ color: '#9bb0ba', marginTop: 0 }}>
                Re-attempt a session with another interviewer to improve your consistency score.
              </p>
              <div className="stack" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Link to="/industry-leaders" className="btn btn-primary">New Interview</Link>
                <Link to="/" className="btn btn-ghost">Return Home</Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}
