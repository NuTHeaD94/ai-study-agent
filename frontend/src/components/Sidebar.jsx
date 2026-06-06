import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Upload PDF', to: '/upload' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)
  const user = getUser()
  const displayName = user?.name?.trim() || user?.email || 'Account'
  const displayEmail = user?.email || ''

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

        <div className="sidebar-account-menu" ref={accountRef}>
          <button
            type="button"
            className="sidebar-account-trigger"
            aria-label="Open account menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen(open => !open)}
          >
            👤
          </button>

          {accountOpen && (
            <div className="sidebar-account-popover" role="menu">
              <div className="sidebar-account-name">{displayName}</div>
              {displayEmail && user?.name && (
                <div className="sidebar-account-email">{displayEmail}</div>
              )}
              <button type="button" className="sidebar-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
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
    </aside>
  )
}
