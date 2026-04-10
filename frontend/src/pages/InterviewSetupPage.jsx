import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadResume } from '../services/interviewApi'
import '../styles/InterviewSetupPage.css'

const POPULAR_ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Scientist', 'DevOps Engineer', 'Mobile Developer', 'Machine Learning Engineer',
  'Cloud Architect', 'Product Manager', 'QA Engineer', 'System Designer',
]

const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 years)', icon: '🌱' },
  { value: 'mid', label: 'Mid-Level (2-5 years)', icon: '🌿' },
  { value: 'senior', label: 'Senior (5-10 years)', icon: '🌳' },
  { value: 'lead', label: 'Lead / Staff (10+ years)', icon: '🏔️' },
]

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', desc: 'Fundamentals & basics' },
  { value: 'medium', label: 'Medium', desc: 'Industry standard' },
  { value: 'hard', label: 'Hard', desc: 'Senior-level depth' },
]

const INTERVIEW_TYPES = [
  { value: 'technical', label: 'Technical', icon: '💻', desc: 'DSA, system design, coding' },
  { value: 'behavioral', label: 'Behavioral', icon: '🤝', desc: 'Soft skills & culture fit' },
  { value: 'mixed', label: 'Mixed', icon: '🎯', desc: 'Technical + behavioral blend' },
]

function InterviewSetupPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [resume, setResume] = useState(null)
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [interviewType, setInterviewType] = useState('mixed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roleSuggestions, setRoleSuggestions] = useState([])
  const [dragActive, setDragActive] = useState(false)

  const handleRoleInput = (value) => {
    setRole(value)
    if (value.length > 0) {
      const filtered = POPULAR_ROLES.filter(r => r.toLowerCase().includes(value.toLowerCase()))
      setRoleSuggestions(filtered.slice(0, 5))
    } else {
      setRoleSuggestions([])
    }
  }

  const selectRole = (r) => {
    setRole(r)
    setRoleSuggestions([])
  }

  const handleResumeChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setResume(file)
      setError('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
      setResume(file)
      setError('')
    } else {
      setError('Please upload a PDF or DOCX file')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedEmail = email.trim()
    const trimmedRole = role.trim()
    const trimmedCompany = company.trim()

    if (!resume || !trimmedRole || !trimmedCompany || !trimmedEmail) {
      setError('Please fill in all required fields (Email, Company, Role, and Resume)')
      return
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await uploadResume(resume, trimmedRole, trimmedCompany, trimmedEmail, {
        difficulty,
        interviewType,
        experienceLevel,
      })
      const { session_id } = response.data
      navigate(`/ai-interview/${session_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start interview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-container">
      <div className="setup-page">
        {/* Header */}
        <div className="setup-header">
          <h1>AI Mock Interview</h1>
          <p className="setup-subtitle">Practice with AI-powered interviews tailored to your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-grid">
          {/* Left Column - Basic Info */}
          <div className="setup-card">
            <div className="setup-card-header">
              <span className="setup-card-icon">👤</span>
              <h2>Basic Information</h2>
            </div>

            <div className="setup-field">
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

            <div className="setup-field">
              <label htmlFor="company">Target Company</label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Google, Microsoft, Amazon"
                required
              />
            </div>

            <div className="setup-field setup-field--autocomplete">
              <label htmlFor="role">Job Role</label>
              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => handleRoleInput(e.target.value)}
                onBlur={() => setTimeout(() => setRoleSuggestions([]), 150)}
                placeholder="e.g., Senior Software Engineer"
                autoComplete="off"
                required
              />
              {roleSuggestions.length > 0 && (
                <ul className="setup-suggestions">
                  {roleSuggestions.map((r) => (
                    <li key={r} onClick={() => selectRole(r)}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column - Interview Config */}
          <div className="setup-card">
            <div className="setup-card-header">
              <span className="setup-card-icon">⚙️</span>
              <h2>Interview Settings</h2>
            </div>

            <div className="setup-field">
              <label>Experience Level</label>
              <div className="setup-options setup-options--exp">
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    className={`setup-option ${experienceLevel === lvl.value ? 'setup-option--active' : ''}`}
                    onClick={() => setExperienceLevel(lvl.value)}
                  >
                    <span className="setup-option-icon">{lvl.icon}</span>
                    <span className="setup-option-label">{lvl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="setup-field">
              <label>Difficulty</label>
              <div className="setup-options setup-options--diff">
                {DIFFICULTY_LEVELS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`setup-pill ${difficulty === d.value ? 'setup-pill--active' : ''}`}
                    onClick={() => setDifficulty(d.value)}
                  >
                    <strong>{d.label}</strong>
                    <span>{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="setup-field">
              <label>Interview Type</label>
              <div className="setup-options setup-options--type">
                {INTERVIEW_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`setup-type-btn ${interviewType === t.value ? 'setup-type-btn--active' : ''}`}
                    onClick={() => setInterviewType(t.value)}
                  >
                    <span className="setup-type-icon">{t.icon}</span>
                    <div>
                      <strong>{t.label}</strong>
                      <span className="setup-type-desc">{t.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Width - Resume Upload */}
          <div className="setup-card setup-card--full">
            <div className="setup-card-header">
              <span className="setup-card-icon">📄</span>
              <h2>Resume</h2>
            </div>

            <div
              className={`setup-dropzone ${dragActive ? 'setup-dropzone--active' : ''} ${resume ? 'setup-dropzone--has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleResumeChange}
                accept=".pdf,.doc,.docx"
                hidden
              />
              {resume ? (
                <div className="setup-file-info">
                  <span className="setup-file-icon">✓</span>
                  <div>
                    <div className="setup-file-name">{resume.name}</div>
                    <div className="setup-file-size">{(resume.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    type="button"
                    className="setup-file-remove"
                    onClick={(e) => { e.stopPropagation(); setResume(null) }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="setup-dropzone-content">
                  <span className="setup-drop-icon">📎</span>
                  <p>Drag & drop your resume here, or <span className="setup-browse">browse</span></p>
                  <p className="setup-drop-hint">PDF or DOCX (max 10MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="setup-actions">
            {error && <div className="setup-error">{error}</div>}
            <button type="submit" disabled={loading} className="setup-submit">
              {loading ? (
                <><span className="setup-spinner" /> Preparing your interview...</>
              ) : (
                'Start Interview →'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InterviewSetupPage
