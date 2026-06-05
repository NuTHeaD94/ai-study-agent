import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UploadPDF from './pages/UploadPDF'
import ProtectedRoute from './components/ProtectedRoute'
import { isAuthenticated } from './utils/auth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPDF />
            </ProtectedRoute>
          }
        />
        <Route path="/upload-pdf" element={<Navigate to="/upload" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
