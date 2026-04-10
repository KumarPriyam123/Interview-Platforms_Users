import { Link } from 'react-router-dom'
import { landingFeatures, landingStats, landingHowItWorks, landingTrustedBy } from '../services/mockInterviewData'

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Ambient background orbs */}
      <div className="landing-orb landing-orb--teal" />
      <div className="landing-orb landing-orb--violet" />

      {/* ── Navbar ── */}
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-brand">
            <span className="landing-brand__dot" />
            <span className="landing-brand__text">Talent IQ</span>
          </Link>

          <nav className="landing-nav__links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
          </nav>

          <div className="landing-nav__actions">
            <Link to="/dashboard" className="landing-btn landing-btn--ghost">Sign In</Link>
            <Link to="/dashboard" className="landing-btn landing-btn--primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-container">
          <span className="landing-badge">
            <span className="landing-badge__dot" />
            AI-Powered Mock Interviews
          </span>

          <h1 className="landing-hero__title">
            Master Your Next<br />
            <span className="landing-gradient-text">Technical Interview</span>
          </h1>

          <p className="landing-hero__subtitle">
            Practice with adaptive AI, collaborate with peers in real-time, and get
            instant feedback to land your dream role at top tech companies.
          </p>

          <div className="landing-hero__actions">
            <Link to="/interview-setup" className="landing-btn landing-btn--primary landing-btn--lg">
              Start Practicing Free
              <span className="landing-btn__arrow">→</span>
            </Link>
            <Link to="/p2p-interview" className="landing-btn landing-btn--outline landing-btn--lg">
              Try Peer Practice
            </Link>
          </div>

          {/* Floating code preview */}
          <div className="landing-preview">
            <div className="landing-preview__header">
              <span className="landing-preview__dot" style={{ background: '#f85149' }} />
              <span className="landing-preview__dot" style={{ background: '#d29922' }} />
              <span className="landing-preview__dot" style={{ background: '#3fb950' }} />
              <span className="landing-preview__title">interview.js</span>
            </div>
            <div className="landing-preview__body">
              <code>
                <span className="code-kw">function</span> <span className="code-fn">solve</span>(nums, target) {'{'}<br />
                {'  '}<span className="code-kw">const</span> map = <span className="code-kw">new</span> <span className="code-fn">Map</span>();<br />
                {'  '}<span className="code-kw">for</span> (<span className="code-kw">let</span> i = <span className="code-num">0</span>; i {'<'} nums.length; i++) {'{'}<br />
                {'    '}<span className="code-kw">const</span> complement = target - nums[i];<br />
                {'    '}<span className="code-kw">if</span> (map.<span className="code-fn">has</span>(complement))<br />
                {'      '}<span className="code-kw">return</span> [map.<span className="code-fn">get</span>(complement), i];<br />
                {'    '}map.<span className="code-fn">set</span>(nums[i], i);<br />
                {'  '}{'}'}<br />
                {'}'}
              </code>
              <div className="landing-preview__cursor" />
            </div>
            <div className="landing-preview__feedback">
              <span className="landing-preview__ai-dot" />
              <span>AI: Optimal O(n) solution — great use of hash map!</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted By ── */}
      <section className="landing-trust">
        <div className="landing-container">
          <p className="landing-trust__label">Trusted by engineers at</p>
          <div className="landing-trust__logos">
            {landingTrustedBy.map((name) => (
              <span key={name} className="landing-trust__company">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats">
        <div className="landing-container">
          <div className="landing-stats__grid">
            {landingStats.map((stat) => (
              <article key={stat.label} className="landing-stat">
                <div className="landing-stat__value">{stat.value}</div>
                <div className="landing-stat__label">{stat.label}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-badge landing-badge--sm">Features</span>
            <h2>Everything you need to succeed</h2>
            <p>Built for modern engineers preparing for top-tier technical interviews.</p>
          </div>

          <div className="landing-features__grid">
            {landingFeatures.map((feature) => (
              <article key={feature.id} className="landing-feature-card">
                <div className="landing-feature-card__icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-steps" id="how-it-works">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-badge landing-badge--sm">How It Works</span>
            <h2>Three steps to interview confidence</h2>
            <p>Get from zero to interview-ready in record time.</p>
          </div>

          <div className="landing-steps__grid">
            {landingHowItWorks.map((item) => (
              <article key={item.step} className="landing-step-card">
                <div className="landing-step-card__number">{item.step}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta__card">
            <div className="landing-cta__glow" />
            <h2>Ready to ace your next interview?</h2>
            <p>Join thousands of engineers who landed their dream roles with Talent IQ.</p>
            <Link to="/interview-setup" className="landing-btn landing-btn--primary landing-btn--lg">
              Start Practicing Free
              <span className="landing-btn__arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer__inner">
            <div className="landing-brand">
              <span className="landing-brand__dot" />
              <span className="landing-brand__text">Talent IQ</span>
            </div>
            <span className="landing-footer__copy">© 2026 Talent IQ. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
