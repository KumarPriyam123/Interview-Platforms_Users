import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mockIndustryLeaders } from '../services/mockInterviewData'

export default function IndustryLeadersPage() {
  const [query, setQuery] = useState('')
  const [candidateName, setCandidateName] = useState('Candidate')
  const navigate = useNavigate()

  const filteredLeaders = useMemo(() => {
    const value = query.trim().toLowerCase()

    if (!value) {
      return mockIndustryLeaders
    }

    return mockIndustryLeaders.filter(
      (leader) =>
        leader.name.toLowerCase().includes(value) ||
        leader.role.toLowerCase().includes(value) ||
        leader.focus.toLowerCase().includes(value),
    )
  }, [query])

  const handleStartInterview = (leader) => {
    navigate('/industry-leader-interview', {
      state: {
        interviewer: leader,
        roomId: `interview-${leader.id}`,
        userId: candidateName.trim() || 'Candidate',
      },
    })
  }

  return (
    <div className="page">
      <div className="container">
        <header className="top-nav">
          <div className="brand">
            <span className="brand-dot" />
            <span>Talent IQ</span>
          </div>
          <nav className="nav-links">
            <Link to="/" className="btn btn-ghost">Home</Link>
          </nav>
        </header>

        <section className="section-title" style={{ marginTop: 0 }}>
          <h2>Interview with Industry Leaders</h2>
          <p>Choose an interviewer and jump into a live mock interview.</p>
        </section>

        <div className="filter-bar">
          <input
            className="input"
            placeholder="Search by name, company, or focus"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <input
            className="input"
            placeholder="Your name for interview room"
            value={candidateName}
            onChange={(event) => setCandidateName(event.target.value)}
          />
        </div>

        <section className="leaders-grid">
          {filteredLeaders.map((leader) => (
            <article key={leader.id} className="card">
              <div className="icon-sq">👤</div>
              <h3>{leader.name}</h3>
              <p>{leader.role}</p>

              <div className="leader-meta">
                <span>{leader.experience}</span>
                <span>⭐ {leader.rating}</span>
              </div>

              <div className="leader-meta">
                <span>{leader.focus}</span>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleStartInterview(leader)}
                >
                  Start Live Interview
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
