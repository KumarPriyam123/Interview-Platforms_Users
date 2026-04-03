import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadResume } from '../services/interviewApi'
import '../styles/InterviewSetupPage.css'

function InterviewSetupPage() {
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
      setError('Please fill in all fields (Email, Company, Role, and Resume)')
      return
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await uploadResume(resume, trimmedRole, trimmedCompany, trimmedEmail)
      const { session_id } = response.data
      navigate(`/ai-interview/${session_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start interview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1>AI Mock Interview</h1>
        <p className="subtitle">Prepare for your next interview with AI-powered mock interviews</p>

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
              placeholder="e.g., Google, Microsoft"
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
            <label htmlFor="resume">Upload Resume (PDF/DOCX)</label>
            <div className="file-input-wrapper">
              <input
                id="resume"
                type="file"
                onChange={handleResumeChange}
                accept=".pdf,.doc,.docx"
                required
              />
              <span className="file-name">
                {resume ? resume.name : 'Choose a file...'}
              </span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Starting Interview...' : 'Start Interview'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default InterviewSetupPage
