import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getInterviewReport } from '../services/api'
import '../styles/ReportPage.css'

function ReportPage() {
  const { id: sessionId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReport()
  }, [sessionId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await getInterviewReport(sessionId)
      setReport(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="report-loading">Loading report...</div>
  }

  if (error) {
    return <div className="report-error">{error}</div>
  }

  if (!report) {
    return <div className="report-error">No report available</div>
  }

  return (
    <div className="report-container">
      <div className="report-header">
        <h1>Interview Report</h1>
        <button onClick={() => window.location.href = '/setup'} className="restart-btn">
          Start New Interview
        </button>
      </div>

      <div className="report-content">
        <div className="score-card">
          <div className="score-value">{report.overall_score}%</div>
          <div className="score-label">Overall Score</div>
        </div>

        <section className="report-section">
          <h2>Summary</h2>
          <p>{report.summary}</p>
        </section>

        <section className="report-section">
          <h2>Strengths</h2>
          <ul>
            {report.strengths?.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </section>

        <section className="report-section">
          <h2>Areas for Improvement</h2>
          <ul>
            {report.weaknesses?.map((weakness, idx) => (
              <li key={idx}>{weakness}</li>
            ))}
          </ul>
        </section>

        <section className="report-section">
          <h2>Recommendations</h2>
          <ul>
            {report.recommendations?.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </section>

        <section className="report-section">
          <h2>Questions Asked</h2>
          <div className="questions-list">
            {report.questions?.map((q, idx) => (
              <div key={idx} className="question-item">
                <h4>Q{idx + 1}: {q.question}</h4>
                <p><strong>Your Answer:</strong> {q.answer}</p>
                <p><strong>Score:</strong> {q.score}%</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ReportPage
