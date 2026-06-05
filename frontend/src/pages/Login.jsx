import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI, setToken, setUser } from '../utils/auth'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(form)
      const { token, _id, name, email } = response.data

      // Store token and user info
      setToken(token)
      setUser({ _id, name, email })

      // Redirect to dashboard
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please try again.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Study<span>AI</span></div>
        <p className="auth-tagline">Your intelligent engineering study companion</p>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue learning</p>

        {error && <div className="error-message" style={{ color: '#e74c3c', marginBottom: '15px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  )
}
