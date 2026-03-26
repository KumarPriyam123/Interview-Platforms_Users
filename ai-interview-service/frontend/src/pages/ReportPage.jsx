import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReport } from '../services/api'
import '../styles/ReportPage.css'

function ReportPage() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      try {
        const res = await getReport(sessionId)
        setReport(res.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load report. Make sure you have answered some questions.')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [sessionId])

  const getScoreClass = (score) => score >= 8 ? 'high' : score >= 5 ? 'mid' : 'low'

  const circumference = 2 * Math.PI * 60

  if (loading) {
    return (
      <div className="report-page">
        <div className="report-loading">
          <div className="loading-spinner-lg" style={{ width: 48, height: 48, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: 'var(--primary-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div className="report-loading-text">
            <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Generating Report</strong>
            Analyzing your performance...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="report-page">
        <div className="report-container">
          <div className="report-header">
            <h1>Report</h1>
          </div>
          <div className="error-msg" style={{ maxWidth: 500, margin: '2rem auto' }}>{error}</div>
          <button className="back-home-btn" onClick={() => navigate('/setup')}>Start New Interview</button>
        </div>
      </div>
    )
  }

  if (!report) return null

  const overallScore = report.overall_score || 0
  const dashOffset = circumference - (overallScore / 10) * circumference
  const scoreClass = getScoreClass(overallScore)

  return (
    <div className="report-page">
      <div className="report-container">
        <div className="report-header">
          <h1>Interview Report</h1>
          <p>Your detailed performance analysis</p>
        </div>

        {/* Overall Score */}
        <div className="score-overview">
          <div className="score-circle-wrapper">
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle className="score-circle-bg" cx="75" cy="75" r="60" />
              <circle
                className={'score-circle-fill ' + scoreClass}
                cx="75" cy="75" r="60"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 75 75)"
              />
            </svg>
            <div className="score-circle-text">
              <span className={'score-number ' + scoreClass}>{overallScore}</span>
              <span className="score-label-txt">out of 10</span>
            </div>
          </div>
          <div className="score-summary">
            <p>{report.summary}</p>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="report-grid">
          {report.strengths?.length > 0 && (
            <div className="report-card strengths">
              <h3>Strengths</h3>
              <ul className="report-list">
                {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {report.weaknesses?.length > 0 && (
            <div className="report-card weaknesses">
              <h3>Weaknesses</h3>
              <ul className="report-list">
                {report.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {report.recommendations?.length > 0 && (
          <div className="report-card recommendations" style={{ marginBottom: '2rem' }}>
            <h3>Recommendations</h3>
            <ul className="report-list">
              {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* Section Scores */}
        {report.section_scores?.length > 0 && (
          <div className="section-scores">
            <h3>Section Performance</h3>
            {report.section_scores.map((sec, i) => {
              const sc = getScoreClass(sec.score)
              return (
                <div key={i} className="section-score-item">
                  <div className="section-score-bar">
                    <div className="section-score-name">{sec.sectionTitle}</div>
                    <div className="section-bar">
                      <div className={'section-bar-fill ' + sc} style={{ width: (sec.score * 10) + '%' }} />
                    </div>
                    {sec.feedback && <div className="section-feedback">{sec.feedback}</div>}
                  </div>
                  <div className={'section-score-value ' + sc}>{sec.score}/10</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Skill Assessment */}
        {report.skill_assessment?.length > 0 && (
          <div className="skill-assessment">
            <h3>Skill Assessment</h3>
            <div className="skills-grid">
              {report.skill_assessment.map((sk, i) => (
                <div key={i} className="skill-item">
                  <span className="skill-name">{sk.skill}</span>
                  <span className={'skill-level ' + sk.level}>{sk.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question by Question */}
        {report.questions?.length > 0 && (
          <div className="questions-breakdown">
            <h3>Question-by-Question Review</h3>
            {report.questions.map((q, i) => {
              const sc = getScoreClass(q.score)
              return (
                <div key={i} className="question-review">
                  <div className="question-review-header">
                    <div className="question-review-q">
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>Q{i + 1}.</span>
                      {q.question}
                    </div>
                    <span className={'question-review-score score-badge ' + sc}>
                      {q.score !== null ? q.score + '/10' : 'N/A'}
                    </span>
                  </div>
                  {q.answer && (
                    <div className="question-review-answer">
                      <div className="question-review-answer-label">Your Answer</div>
                      {q.answer}
                    </div>
                  )}
                  {q.feedback && (
                    <div className="question-review-feedback">{q.feedback}</div>
                  )}
                  {q.model_answer && (
                    <div className="model-answer" style={{ marginTop: '0.5rem' }}>
                      <div className="model-answer-label">Ideal Approach</div>
                      {q.model_answer}
                    </div>
                  )}
                  {q.counter_questions?.length > 0 && (
                    <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(139,92,246,0.3)' }}>
                      {q.counter_questions.map((cq, ci) => (
                        <div key={ci} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                          <div style={{ color: 'var(--accent-400)', fontWeight: 500 }}>Follow-up: {cq.question}</div>
                          {cq.answer && <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Your answer: {cq.answer}</div>}
                          {cq.feedback && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.15rem' }}>{cq.feedback}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button className="back-home-btn" onClick={() => navigate('/setup')}>
          Start New Interview
        </button>
      </div>
    </div>
  )
}

export default ReportPage
