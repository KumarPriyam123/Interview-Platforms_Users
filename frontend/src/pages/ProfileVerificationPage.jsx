import { useRef, useState } from 'react'
import MockrChrome from '../components/MockrChrome'
import {
  initialProfile,
  profileSnapshot,
  profileTabs,
} from '../services/mockProductData'

function MatchBar({ label, value, color }) {
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

function Field({ label, value, onChange, status, wide = false }) {
  return (
    <label className={`mockr-field ${wide ? 'is-wide' : ''}`}>
      <span className="mockr-field__meta">
        <span>{label}</span>
        {status ? <span className={`mockr-chip mockr-chip--${status.tone}`}>{status.label}</span> : null}
      </span>
      <input value={value} onChange={onChange} />
    </label>
  )
}

export default function ProfileVerificationPage({ activeTab = 'profile' }) {
  const [profile, setProfile] = useState(initialProfile)
  const [isPublicProfile, setIsPublicProfile] = useState(true)
  const fileInputRef = useRef(null)

  const pageLabel = activeTab === 'matches'
    ? 'Edit fields to improve role alignment.'
    : 'Edit fields to manually override AI'

  const updateProfile = (field) => (event) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: event.target.value,
    }))
  }

  const handleResumePick = (event) => {
    const [file] = event.target.files || []

    if (!file) {
      return
    }

    setProfile((currentProfile) => ({
      ...currentProfile,
      fileName: file.name,
    }))
  }

  return (
    <div className="mockr-page">
      <MockrChrome navItems={profileTabs} />

      <main className="mockr-frame mockr-profile">
        <section className="mockr-profile__main">
          <div className="mockr-section__heading">
            <div>
              <h1>Resume Upload</h1>
            </div>
          </div>

          <div className="mockr-card mockr-upload-card">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleResumePick}
            />

            <button
              type="button"
              className="mockr-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="mockr-upload-dropzone__icon">UP</span>
              <strong>Click to upload or drag and drop</strong>
              <span>PDF, DOCX, or TXT (Max. 10MB)</span>
            </button>

            <div className="mockr-upload-file">
              <div className="mockr-upload-file__meta">
                <span className="mockr-file-badge">PDF</span>
                <strong>{profile.fileName}</strong>
                <span className="mockr-upload-file__status">100% Parsed</span>
              </div>
              <div className="mockr-inline-metric__track">
                <span className="mockr-inline-metric__fill is-green" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          <section className="mockr-section">
            <div className="mockr-section__heading">
              <h2>Multi-Level Profile Verification</h2>
              <p>{pageLabel}</p>
            </div>

            <article className="mockr-card mockr-form-card">
              <div className="mockr-form-card__header">
                <div className="mockr-step">
                  <span className="mockr-step__index">1</span>
                  <h3>Personal Details</h3>
                </div>
              </div>

              <div className="mockr-form-grid">
                <Field
                  label="First Name"
                  value={profile.firstName}
                  onChange={updateProfile('firstName')}
                  status={{ label: '99%', tone: 'success' }}
                />
                <Field
                  label="Last Name"
                  value={profile.lastName}
                  onChange={updateProfile('lastName')}
                  status={{ label: '98%', tone: 'success' }}
                />
                <Field
                  label="Email Address"
                  value={profile.email}
                  onChange={updateProfile('email')}
                  status={{ label: '100%', tone: 'success' }}
                />
                <Field
                  label="Mobile Number"
                  value={profile.mobile}
                  onChange={updateProfile('mobile')}
                  status={{ label: 'Needs Review', tone: 'warning' }}
                />
              </div>
            </article>

            <article className="mockr-card mockr-form-card">
              <div className="mockr-form-card__header">
                <div className="mockr-step">
                  <span className="mockr-step__index">2</span>
                  <h3>Professional Background</h3>
                </div>
              </div>

              <div className="mockr-subsection">
                <div className="mockr-subsection__heading">
                  <h4>Work Experience</h4>
                  <span className="mockr-chip mockr-chip--success">92% Match</span>
                </div>
                <div className="mockr-form-grid">
                  <Field label="Company" value={profile.company} onChange={updateProfile('company')} />
                  <Field label="Job Role" value={profile.jobRole} onChange={updateProfile('jobRole')} />
                  <Field label="Duration" value={profile.duration} onChange={updateProfile('duration')} wide />
                </div>
                <button type="button" className="mockr-text-link">+ Add Experience</button>
              </div>

              <div className="mockr-subsection">
                <div className="mockr-subsection__heading">
                  <h4>Skill Taxonomy</h4>
                  <span className="mockr-chip mockr-chip--success">88% Match</span>
                </div>

                <div className="mockr-chip-group">
                  {profile.hardSkills.map((skill) => (
                    <span key={skill} className="mockr-pill">{skill}</span>
                  ))}
                  <button type="button" className="mockr-chip mockr-chip--soft">+ Add Skill</button>
                </div>

                <div className="mockr-chip-group mockr-chip-group--subtle">
                  {profile.softSkills.map((skill) => (
                    <span key={skill} className="mockr-pill">{skill}</span>
                  ))}
                </div>
              </div>

              <div className="mockr-subsection">
                <div className="mockr-subsection__heading">
                  <h4>Education & Certifications</h4>
                  <span className="mockr-chip mockr-chip--success">95% Match</span>
                </div>
                <div className="mockr-form-grid">
                  <Field label="Degree" value={profile.degree} onChange={updateProfile('degree')} />
                  <Field label="Institution" value={profile.institution} onChange={updateProfile('institution')} />
                </div>

                <div className="mockr-certifications">
                  <span>Certifications (Parsed)</span>
                  <ul>
                    {profile.certifications.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>

            <article className="mockr-card mockr-form-card">
              <div className="mockr-form-card__header">
                <div className="mockr-step">
                  <span className="mockr-step__index">3</span>
                  <h3>Professional Identity</h3>
                </div>
              </div>

              <div className="mockr-form-grid">
                <Field label="LinkedIn Profile" value={profile.linkedIn} onChange={updateProfile('linkedIn')} />
                <Field label="Portfolio / IEEE / GitHub" value={profile.portfolio} onChange={updateProfile('portfolio')} />
                <label className="mockr-field is-wide">
                  <span className="mockr-field__meta">
                    <span>Personal Statement / Bio</span>
                    <span className="mockr-chip mockr-chip--success">85% Match</span>
                  </span>
                  <textarea value={profile.bio} onChange={updateProfile('bio')} rows={4} />
                </label>
              </div>
            </article>

            <div className="mockr-footer-actions">
              <button type="button" className="mockr-button mockr-button--ghost">Discard Changes</button>
              <button type="button" className="mockr-button mockr-button--dark">Save & Finalize Profile</button>
            </div>
          </section>
        </section>

        <aside className="mockr-profile__rail">
          <article className="mockr-card mockr-score-card">
            <p className="mockr-rail-section__eyebrow">Target Role Alignment</p>
            <div className="mockr-score-ring">
              <div className="mockr-score-ring__inner">{profileSnapshot.score}%</div>
            </div>
            <strong>{profileSnapshot.targetRole}</strong>
            <span>Aggregate Match Score</span>
          </article>

          <article className="mockr-card mockr-rail-card">
            <p className="mockr-rail-section__eyebrow">Matching Breakdown</p>
            <div className="mockr-score-stack">
              {profileSnapshot.breakdown.map((item) => (
                <MatchBar key={item.label} label={item.label} value={item.value} color={item.color} />
              ))}
            </div>
          </article>

          <article className="mockr-card mockr-rail-card">
            <p className="mockr-rail-section__eyebrow">AI Insights</p>
            <div className="mockr-stack">
              {profileSnapshot.insights.map((item) => (
                <div key={item.title} className={`mockr-tip-card is-${item.tone}`}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="mockr-card mockr-rail-card">
            <p className="mockr-rail-section__eyebrow">Recommended Actions</p>
            <div className="mockr-stack">
              {profileSnapshot.actions.map((action) => (
                <button key={action.title} type="button" className="mockr-action-row">
                  <span className="mockr-action-row__icon" />
                  <span className="mockr-action-row__copy">
                    <strong>{action.title}</strong>
                    <span>{action.meta}</span>
                  </span>
                  <span className="mockr-action-row__arrow">&gt;</span>
                </button>
              ))}
            </div>
          </article>

          <article className="mockr-card mockr-rail-card">
            <div className="mockr-toggle">
              <div>
                <strong>Public Profile</strong>
                <span>Allow recruiters to find you</span>
              </div>
              <button
                type="button"
                className={`mockr-toggle__track ${isPublicProfile ? 'is-on' : ''}`}
                onClick={() => setIsPublicProfile((currentValue) => !currentValue)}
                aria-pressed={isPublicProfile}
              >
                <span className="mockr-toggle__thumb" />
              </button>
            </div>

            <button type="button" className="mockr-button mockr-button--ghost">Share Profile Link</button>
          </article>
        </aside>
      </main>
    </div>
  )
}
