import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../utils/auth'

const navItems = [
  { icon: '⬡', label: 'Dashboard', to: '/dashboard' },
  { icon: '⬆', label: 'Upload PDF', to: '/upload' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Study<span>AI</span>
      </div>

      <ul className="sidebar-nav">
        {navItems.map(({ icon, label, to }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar-logout">
        <a onClick={handleLogout}>
          <span className="icon">↩</span>
          <span className="nav-label">Logout</span>
        </a>
      </div>
    </aside>
  )
}
