import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
          <div className="report-hero">
            <div>
              <div className="report-eyebrow">Interview Review</div>
              <h1>Report unavailable</h1>
              <p>{error}</p>
            </div>
          </div>
          <button className="back-home-btn" onClick={() => navigate('/setup')}>Start New Interview</button>
        </div>
      </div>
    )
  }

  if (!report) return null

  const overallScore = report.overall_score || 0
  const dashOffset = circumference - (overallScore / 10) * circumference
  const scoreClass = getScoreClass(overallScore)
  const answeredCount = (report.questions || []).filter((q) => q.answer).length

  return (
    <div className="report-page">
      <div className="report-container">
        <section className="report-hero">
          <div className="report-hero-copy">
            <div className="report-eyebrow">Interview Review</div>
            <h1>Performance Summary</h1>
            <p>{report.summary}</p>
            <div className="report-hero-chips">
              <span className="report-chip">{answeredCount} answered</span>
              <span className="report-chip">{report.section_scores?.length || 0} sections reviewed</span>
              <span className={'report-chip score ' + scoreClass}>Overall {overallScore}/10</span>
            </div>
          </div>

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
          </div>
        </section>

        <section className="report-grid">
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
              <h3>Areas To Improve</h3>
              <ul className="report-list">
                {report.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </section>

        {report.recommendations?.length > 0 && (
          <section className="report-card recommendations report-section">
            <h3>Recommended Next Steps</h3>
            <ul className="report-list">
              {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </section>
        )}

        {report.section_scores?.length > 0 && (
          <section className="section-scores report-section">
            <div className="section-heading">
              <h3>Section Performance</h3>
              <p>How you performed across each stage of the interview.</p>
            </div>
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
          </section>
        )}

        {report.skill_assessment?.length > 0 && (
          <section className="skill-assessment report-section">
            <div className="section-heading">
              <h3>Skill Assessment</h3>
              <p>Your current level across the main skills detected during the interview.</p>
            </div>
            <div className="skills-grid">
              {report.skill_assessment.map((sk, i) => (
                <div key={i} className="skill-item">
                  <span className="skill-name">{sk.skill}</span>
                  <span className={'skill-level ' + sk.level}>{sk.level}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {report.questions?.length > 0 && (
          <section className="questions-breakdown report-section">
            <div className="section-heading">
              <h3>Question Review</h3>
              <p>A cleaner breakdown of your answers, follow-ups, and ideal direction.</p>
            </div>

            {report.questions.map((q, i) => {
              const sc = getScoreClass(q.score)
              return (
                <article key={i} className="question-review">
                  <div className="question-review-header">
                    <div>
                      <div className="question-review-index">Question {i + 1}</div>
                      <div className="question-review-q">{q.question}</div>
                      <div className="question-review-meta">
                        {q.section_title && <span className="question-meta-chip">{q.section_title}</span>}
                        {q.difficulty && <span className={'question-meta-chip ' + q.difficulty}>{q.difficulty}</span>}
                      </div>
                    </div>
                    <span className={'question-review-score score-badge ' + sc}>
                      {q.score !== null ? q.score + '/10' : 'N/A'}
                    </span>
                  </div>

                  <div className="review-panels">
                    {q.answer && (
                      <div className="review-panel">
                        <div className="question-review-answer-label">Your Answer</div>
                        <div className="question-review-answer">{q.answer}</div>
                      </div>
                    )}

                    {q.feedback && (
                      <div className="review-panel feedback-panel">
                        <div className="question-review-answer-label">Feedback</div>
                        <div className="question-review-feedback">{q.feedback}</div>
                      </div>
                    )}
                  </div>

                  {q.model_answer && (
                    <div className="model-answer review-model-answer">
                      <div className="model-answer-label">Ideal Approach</div>
                      {q.model_answer}
                    </div>
                  )}

                  {q.counter_questions?.length > 0 && (
                    <div className="followup-list">
                      {q.counter_questions.map((cq, ci) => (
                        <div key={ci} className="followup-card">
                          <div className="followup-title">Follow-up {ci + 1}</div>
                          <div className="followup-question">{cq.question}</div>
                          {cq.answer && <div className="followup-answer">Your answer: {cq.answer}</div>}
                          {cq.feedback && <div className="followup-feedback">{cq.feedback}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        )}

        <button className="back-home-btn" onClick={() => navigate('/setup')}>
          Start New Interview
        </button>
      </div>
    </div>
  )
}

export default ReportPage
