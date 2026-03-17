import { Link } from 'react-router-dom'
import { landingFeatures, landingStats } from '../services/mockInterviewData'

export default function LandingPage() {
  return (
    <div className="page">
      <div className="container">
        <header className="top-nav">
          <div className="brand">
            <span className="brand-dot" />
            <span>Talent IQ</span>
          </div>

          <nav className="nav-links">
            <button type="button" className="btn btn-ghost">Documentation</button>
            <button type="button" className="btn btn-ghost">Sign In</button>
          </nav>
        </header>

        <section className="hero">
          <span className="badge">New: AI-Powered Mock Interviews</span>
          <h1>
            Master Your
            <br />
            <span className="hero-highlight">Technical Interviews</span>
          </h1>
          <p>
            Collaborate in real-time, get instant AI feedback, and practice with
            peers and industry leaders to level up your career.
          </p>

          <div className="hero-actions">
            <Link to="/industry-leaders" className="btn btn-primary">Get Started</Link>
            <Link to="/p2p-interview" className="btn btn-ghost">Practice With Peer</Link>
            <Link to="/ai-interview" className="btn btn-ghost">Watch Demo</Link>
          </div>
        </section>

        <section className="stats-grid" aria-label="platform stats">
          {landingStats.map((stat) => (
            <article key={stat.label} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </article>
          ))}
        </section>

        <section className="section-title">
          <h2>Everything you need to succeed</h2>
          <p>Built for modern engineering teams and aspiring developers.</p>
        </section>

        <section className="feature-grid">
          {landingFeatures.map((feature) => (
            <article key={feature.id} className="card">
              <div className="icon-sq">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <footer className="footer">
          <span>Talent IQ</span>
          <span>© 2026 Talent IQ. All rights reserved.</span>
        </footer>
      </div>
    </div>
  )
}
