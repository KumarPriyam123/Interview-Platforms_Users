import { Link, useLocation } from 'react-router-dom'
import { mockInterviewReport } from '../services/mockInterviewData'

export default function FeedbackPage() {
  const { state } = useLocation()
  const interviewerName = state?.interviewer?.name ?? 'AI Interviewer'

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
