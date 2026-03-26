import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startInterview } from '../services/api'
import '../styles/SetupPage.css'

function SetupPage() {
  const navigate = useNavigate()
  const [resume, setResume] = useState(null)
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResumeChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const valid = ['.pdf', '.doc', '.docx']
      const ext = '.' + file.name.split('.').pop().toLowerCase()
      if (!valid.includes(ext)) {
        setError('Please upload a PDF or DOCX file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setResume(file)
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedEmail = email.trim()
    const trimmedRole = role.trim()
    const trimmedCompany = company.trim()

    if (!resume || !trimmedRole || !trimmedCompany || !trimmedEmail) {
      setError('Please fill in all fields and upload your resume')
      return
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await startInterview(resume, trimmedRole, trimmedCompany, trimmedEmail)
      const { session_id } = response.data
      navigate(`/interview/${session_id}`)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Failed to start interview. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-page">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner-lg" />
          <div className="loading-text">
            <strong>Preparing Your Interview</strong>
            Analyzing resume and generating personalized questions...
          </div>
        </div>
      )}

      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-icon">🎯</div>
          <h1>AI Mock Interview</h1>
          <p>Upload your resume, enter the company and role, and start a personalized AI-powered mock interview.</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="company">Company Name</label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Google, Microsoft, Amazon"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Applied Role</label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              required
            />
          </div>

          <div className="form-group">
            <label>Upload Resume (PDF / DOCX)</label>
            <div className={`file-upload-area ${resume ? 'has-file' : ''}`}>
              <input
                type="file"
                onChange={handleResumeChange}
                accept=".pdf,.doc,.docx"
              />
              {resume ? (
                <div className="file-name-display">
                  <span>📄</span>
                  <span>{resume.name}</span>
                  <span style={{ color: 'var(--success-400)', fontSize: '0.8rem' }}>
                    ({(resume.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📁</div>
                  <div className="upload-text">
                    <strong>Click to upload</strong> or drag and drop<br />
                    PDF or DOCX, max 10MB
                  </div>
                </>
              )}
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" disabled={loading || !resume} className="submit-btn">
            {loading ? (
              <>
                <span className="spinner" />
                Generating Questions...
              </>
            ) : (
              <>🚀 Start Interview</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SetupPage