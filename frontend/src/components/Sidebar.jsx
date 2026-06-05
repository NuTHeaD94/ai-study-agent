import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../utils/auth'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Upload PDF', to: '/upload' },
]

export default function Sidebar() {
  const navigate = useNavigate()

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

        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
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
    </aside>
  )
}
