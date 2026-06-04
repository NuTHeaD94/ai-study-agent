import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI, setToken, setUser } from '../utils/auth'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.register(form)
      const { token, _id, name, email } = response.data

      // Store token and user info
      setToken(token)
      setUser({ _id, name, email })

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed. Please try again.'
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

        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Start studying smarter today</p>

        {error && <div className="error-message" style={{ color: '#e74c3c', marginBottom: '15px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Rahul Sharma"
              value={form.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
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
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
