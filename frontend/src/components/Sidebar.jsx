import { NavLink, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Upload PDF', to: '/upload' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = getUser()
  const displayName = user?.name?.trim() || user?.email || 'Account'
  const displayEmail = user?.email || ''

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-topbar">
        <div className="sidebar-logo">
          Study<span>AI</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <ul>
          {navItems.map(({ label, to }) => (
            <li key={to}>
              <NavLink to={to} className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <section className="sidebar-account" aria-label="Current account">
        <div className="sidebar-account-avatar" aria-hidden="true">👤</div>
        <div className="sidebar-account-text">
          <div className="sidebar-account-name">{displayName}</div>
          {displayEmail && user?.name && (
            <div className="sidebar-account-email">{displayEmail}</div>
          )}
        </div>
        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </section>
    </aside>
  )
}
