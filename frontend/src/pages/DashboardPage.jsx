import { Link } from 'react-router-dom'
import MockrChrome from '../components/MockrChrome'
import {
  activeSessions,
  coachInsights,
  coachPanel,
  completedInterviews,
  dashboardNav,
  dashboardQuickActions,
  dashboardSummary,
} from '../services/mockProductData'

function renderActionDetail(action) {
  if (action.id === 'ai') {
    return (
      <div className="mockr-select">
        <span className="mockr-select__label">{action.detailValue}</span>
        <span className="mockr-select__caret" />
      </div>
    )
  }

  if (action.id === 'p2p') {
    return (
      <div className="mockr-toggle">
        <span>{action.detailLabel}</span>
        <span className="mockr-toggle__track is-on">
          <span className="mockr-toggle__thumb" />
        </span>
      </div>
    )
  }

  return (
    <div className="mockr-mentor">
      <span className="mockr-avatar mockr-avatar--small">ER</span>
      <div>
        <strong>{action.mentor.name}</strong>
        <span>{action.mentor.role}</span>
      </div>
      <span className="mockr-chip mockr-chip--soft">{action.mentor.availability}</span>
    </div>
  )
}

function SummaryBar({ label, value, color }) {
  return (
    <div className="mockr-inline-metric">
      <div className="mockr-inline-metric__top">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mockr-inline-metric__track">
        <span className={`mockr-inline-metric__fill is-${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="mockr-page">
      <MockrChrome navItems={dashboardNav} />

      <main className="mockr-frame mockr-dashboard">
        <section className="mockr-dashboard__main">
          <div className="mockr-grid mockr-grid--actions">
            {dashboardQuickActions.map((action) => (
              <article
                key={action.id}
                className={`mockr-card mockr-action-card ${action.tone === 'dark' ? 'is-dark' : ''}`}
              >
                <p className="mockr-eyebrow">{action.eyebrow}</p>
                <h2>{action.title}</h2>
                <p className="mockr-copy">{action.description}</p>
                <div className="mockr-action-card__detail">{renderActionDetail(action)}</div>
                <Link
                  to={action.buttonTo}
                  className={`mockr-button ${action.tone === 'dark' ? 'mockr-button--dark' : 'mockr-button--ghost'}`}
                >
                  {action.buttonLabel}
                </Link>
              </article>
            ))}
          </div>

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
                <h3>Problem Solving Breakdown</h3>
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
                <h3>Core Assessment Scores</h3>
              </div>
              <div className="mockr-score-stack">
                {dashboardSummary.coreScores.map((score) => (
                  <SummaryBar
                    key={score.label}
                    label={score.label}
                    value={score.value}
                    color="violet"
                  />
                ))}
              </div>
            </article>
          </div>

          <section className="mockr-section">
            <div className="mockr-section__heading">
              <h2>Active P2P Sessions</h2>
              <Link to="/profile-verification" className="mockr-text-link">View Directory</Link>
            </div>

            <div className="mockr-session-grid">
              {activeSessions.map((session) => (
                <article key={session.id} className="mockr-card mockr-session-card">
                  <div className="mockr-session-card__header">
                    <div className="mockr-session-card__identity">
                      <span className="mockr-avatar">{session.host.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>Hosted by {session.host}</strong>
                        <div className="mockr-inline-tags">
                          <span className={`mockr-chip mockr-chip--${session.difficulty === 'Hard' ? 'danger' : 'warning'}`}>
                            {session.difficulty}
                          </span>
                          <span>{session.occupancy}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`mockr-status-dot ${session.status === 'Open' ? 'is-live' : 'is-muted'}`} />
                  </div>

                  <h3>{session.title}</h3>
                  <p className="mockr-copy">{session.description}</p>

                  <button
                    type="button"
                    className={`mockr-button ${session.actionTone === 'primary' ? 'mockr-button--primary' : 'mockr-button--ghost'}`}
                  >
                    {session.actionLabel}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="mockr-section">
            <h2>Completed Interviews</h2>
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

        <aside className="mockr-dashboard__rail">
          <article className="mockr-card mockr-rail-card">
            <div className="mockr-rail-card__title">
              <span className="mockr-orb" />
              <h2>AI Coach Widget</h2>
            </div>

            <div className="mockr-usage-block">
              <div className="mockr-usage-block__top">
                <span>User Daily Limit</span>
                <span>{coachPanel.dailyLimitUsed} of {coachPanel.dailyLimitTotal}</span>
              </div>
              <div className="mockr-inline-metric__track">
                <span className="mockr-inline-metric__fill is-violet" style={{ width: '100%' }} />
              </div>
              <small>0 of 1 free sessions remaining today</small>
            </div>

            <div className="mockr-usage-block">
              <div className="mockr-usage-block__top">
                <span>System-wide Slots</span>
                <span>{coachPanel.slotsUsed} of {coachPanel.slotsTotal}</span>
              </div>
              <div className="mockr-inline-metric__track">
                <span
                  className="mockr-inline-metric__fill is-rose"
                  style={{ width: `${(coachPanel.slotsUsed / coachPanel.slotsTotal) * 100}%` }}
                />
              </div>
              <small>8 of 10 free platform-wide slots used today</small>
            </div>

            <button type="button" className="mockr-button mockr-button--premium">
              Upgrade to Premium for Unlimited
            </button>
          </article>

          <section className="mockr-rail-section">
            <p className="mockr-rail-section__eyebrow">Skill Analysis & Tips</p>
            {coachInsights.map((item) => (
              <article key={item.id} className={`mockr-card mockr-tip-card is-${item.tone}`}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <button type="button" className="mockr-text-link">{item.action} -&gt;</button>
              </article>
            ))}
          </section>

          <div className="mockr-card mockr-chat-entry">
            <input type="text" placeholder="Ask AI Coach a question..." />
          </div>
        </aside>
      </main>
    </div>
  )
}
