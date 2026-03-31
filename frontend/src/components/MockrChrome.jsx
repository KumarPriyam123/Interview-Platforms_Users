import { NavLink } from 'react-router-dom'

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3a4 4 0 0 0-4 4v1.1c0 .7-.2 1.3-.6 1.9L6.2 12c-.7 1-.2 2.4 1 2.7l.4.1h8.8c1.3 0 2.2-1.4 1.4-2.6l-1.2-1.8c-.4-.6-.6-1.2-.6-1.9V7a4 4 0 0 0-4-4Zm0 18a2.8 2.8 0 0 1-2.7-2.1h5.4A2.8 2.8 0 0 1 12 21Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function MockrChrome({ navItems }) {
  return (
    <header className="mockr-topbar">
      <div className="mockr-topbar__left">
        <NavLink to="/dashboard" className="mockr-brand">
          <span className="mockr-brand__mark">Talent IQ</span>
        </NavLink>

        <nav className="mockr-topbar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mockr-navlink ${isActive ? 'is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mockr-topbar__right">
        <button type="button" className="mockr-icon-button" aria-label="Notifications">
          <BellIcon />
          <span className="mockr-notification-dot" />
        </button>

        <button type="button" className="mockr-profile-button" aria-label="Profile menu">
          <span className="mockr-profile-avatar">AK</span>
          <span className="mockr-profile-caret" />
        </button>
      </div>
    </header>
  )
}
