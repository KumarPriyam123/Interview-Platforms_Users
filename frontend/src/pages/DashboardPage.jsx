import { Link } from 'react-router-dom'
import MockrChrome from '../components/MockrChrome'
import {
  completedInterviews,
  dashboardNav,
  dashboardQuickActions,
  dashboardSummary,
} from '../services/mockProductData'

export default function DashboardPage() {
  return (
    <div className="mockr-page">
      <MockrChrome navItems={dashboardNav} />

      <main className="mockr-frame mockr-dashboard">
        <section className="mockr-dashboard__main">
          {/* Quick Actions */}
          <div className="mockr-grid mockr-grid--actions">
            {dashboardQuickActions.map((action) => (
              <article
                key={action.id}
                className={`mockr-card mockr-action-card ${action.tone === 'dark' ? 'is-dark' : ''}`}
              >
                <p className="mockr-eyebrow">{action.eyebrow}</p>
                <h2>{action.title}</h2>
                <p className="mockr-copy">{action.description}</p>
                <Link
                  to={action.buttonTo}
                  className={`mockr-button ${action.tone === 'dark' ? 'mockr-button--primary' : 'mockr-button--ghost'}`}
                >
                  {action.buttonLabel}
                </Link>
              </article>
            ))}
          </div>

          {/* Stats row — simplified to one card */}
          <div className="mockr-grid mockr-grid--stats">
            <article className="mockr-card mockr-stat-card">
              <div className="mockr-stat-card__header">
                <h3>Total Interviews</h3>
              </div>
              <div className="mockr-stat-card__value">{dashboardSummary.totalInterviews.value}</div>
              <div className="mockr-stat-card__footer">
                {dashboardSummary.totalInterviews.splits.map((item) => (
                  <span key={item.label}>{item.label}: {item.value}</span>
                ))}
              </div>
            </article>

            <article className="mockr-card mockr-stat-card">
              <div className="mockr-stat-card__header">
                <h3>Problems Solved</h3>
              </div>
              <div className="mockr-stat-card__value">{dashboardSummary.problemBreakdown.total}</div>
              <div className="mockr-segmented-bar">
                {dashboardSummary.problemBreakdown.segments.map((segment) => (
                  <span
                    key={segment.label}
                    className={`mockr-segmented-bar__item is-${segment.color}`}
                    style={{ width: `${(segment.value / dashboardSummary.problemBreakdown.total) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mockr-legend">
                {dashboardSummary.problemBreakdown.segments.map((segment) => (
                  <span key={segment.label} className={`mockr-legend__item is-${segment.color}`}>
                    {segment.label} ({segment.value})
                  </span>
                ))}
              </div>
            </article>

            <article className="mockr-card mockr-stat-card">
              <div className="mockr-stat-card__header">
                <h3>Avg Score</h3>
              </div>
              <div className="mockr-stat-card__value" style={{ color: 'var(--mockr-green)' }}>85%</div>
              <div className="mockr-stat-card__footer">
                <span>Across all sessions</span>
              </div>
            </article>
          </div>

          {/* Completed Interviews */}
          <section className="mockr-section">
            <h2>Recent Interviews</h2>
            <div className="mockr-card mockr-completed-list">
              {completedInterviews.map((item) => (
                <article key={item.id} className="mockr-completed-item">
                  <div className="mockr-completed-item__left">
                    <span className="mockr-score-pill">{item.score}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <div className="mockr-inline-tags">
                        <span className="mockr-chip mockr-chip--soft">{item.tag}</span>
                        <span>{item.category}</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mockr-completed-item__actions">
                    <button type="button" className="mockr-button mockr-button--ghost">Transcript</button>
                    <button type="button" className="mockr-button mockr-button--soft">AI Summary</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        {/* Sidebar — simplified */}
        <aside className="mockr-dashboard__rail">
          <article className="mockr-card mockr-rail-card">
            <div className="mockr-rail-card__title">
              <span className="mockr-orb" />
              <h2>AI Assistant</h2>
            </div>
            <p className="mockr-copy">
              Get personalized tips, track your weak areas, and prepare smarter with AI-powered insights.
            </p>
            <Link to="/interview-setup" className="mockr-button mockr-button--primary">
              Start AI Interview
            </Link>
          </article>

          <div className="mockr-card mockr-chat-entry">
            <input type="text" placeholder="Ask AI Coach a question..." />
          </div>
        </aside>
      </main>
    </div>
  )
}
