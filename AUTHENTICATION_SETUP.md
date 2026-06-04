# Frontend Authentication Integration

## Overview
Complete authentication system connecting React frontend with Node.js/Express backend using JWT tokens.

## File Structure

```
frontend/src/
├── api/
│   └── config.js              # Axios configuration with interceptors
├── utils/
│   └── auth.js                # Auth utility functions
├── components/
│   ├── ProtectedRoute.jsx      # Protected route wrapper
│   └── Sidebar.jsx             # Logout functionality
├── pages/
│   ├── Login.jsx               # Login page with API call
│   ├── Register.jsx            # Register page with API call
│   └── Dashboard.jsx           # Protected dashboard
└── App.jsx                     # Main app with protected routes
```

## How It Works

### 1. API Configuration (`src/api/config.js`)
- Creates Axios instance with base URL pointing to backend
- **Request Interceptor**: Automatically adds JWT token to every request header
- **Response Interceptor**: Handles 401 errors by clearing token and redirecting to login

### 2. Auth Utilities (`src/utils/auth.js`)
- **authAPI**: Functions to call backend endpoints (register, login, getMe)
- **Token Management**: Get, set, remove tokens from localStorage
- **User Management**: Store and retrieve user data
- **isAuthenticated()**: Check if user has valid token

### 3. Protected Route (`src/components/ProtectedRoute.jsx`)
- Wraps protected pages (Dashboard, Upload PDF)
- Redirects to login if no token found
- Prevents unauthorized access

### 4. Authentication Flow

#### Register Flow
```
1. User fills form (name, email, password)
2. Form submitted → handleSubmit()
3. API call: authAPI.register(form)
4. Backend validates and creates user
5. Backend returns token + user info
6. Token & user stored in localStorage
7. Redirect to /dashboard
```

#### Login Flow
```
1. User fills form (email, password)
2. Form submitted → handleSubmit()
3. API call: authAPI.login(form)
4. Backend validates credentials
5. Backend returns token + user info
6. Token & user stored in localStorage
7. Redirect to /dashboard
```

#### Logout Flow
```
1. User clicks "Logout" in sidebar
2. logout() called → clears token & user
3. Redirect to /login
```

#### Protected Route Access
```
1. User tries to access /dashboard
2. ProtectedRoute checks isAuthenticated()
3. If token exists → show Dashboard
4. If no token → redirect to /login
```

## Token Handling

### JWT Token Flow
```
Login Request
    ↓
Backend validates credentials
    ↓
Backend generates JWT token
    ↓
Token sent in response body
    ↓
Frontend stores in localStorage
    ↓
Request Interceptor adds token to Authorization header
    ↓
Backend verifies token using middleware
    ↓
Protected endpoint accessed
```

### Token in Headers
Every request includes:
```
Authorization: Bearer <token>
```

### Auto Token Refresh on 401
If token expires:
```
1. Response interceptor detects 401
2. localStorage cleared
3. User redirected to login
```

## Error Handling

### Display Errors to User
- Validation errors: "Email already registered"
- Auth errors: "Invalid email or password"
- Network errors: "Login failed. Please try again."
- Errors shown in red above form

### Loading States
- Buttons show "Signing in..." while loading
- Input fields disabled during request
- Prevents multiple submissions

## Testing Locally

### Start Backend
```bash
cd backend
npm run dev
```
Runs on http://localhost:5000

### Start Frontend
```bash
cd frontend
npm run dev
```
Runs on http://localhost:5173

### Test Registration
1. Go to http://localhost:5173/register
2. Fill form with test data
3. Submit → should redirect to dashboard
4. Check DevTools → localStorage should have token

### Test Login
1. Go to http://localhost:5173/login
2. Enter credentials from registration
3. Submit → should redirect to dashboard
4. Token automatically added to future requests

### Test Protected Routes
1. Clear localStorage in DevTools
2. Try accessing /dashboard
3. Should redirect to /login

### Test Logout
1. Click "Logout" button in sidebar
2. Should redirect to login
3. localStorage cleared
4. Cannot access dashboard

## What's Protected

- `/dashboard` - Protected by ProtectedRoute
- `/upload` - Protected by ProtectedRoute
- `/login` - Public
- `/register` - Public

## Security Features

1. **Token Storage**: JWT stored in localStorage
   - ⚠️ Note: Production should use httpOnly cookies
   - Current setup suitable for development

2. **Authorization Header**: Token automatically added
   - Reduces code duplication
   - Centralized token management

3. **401 Handling**: Auto redirect on token expiration
   - Prevents accessing protected routes with expired token
   - Clears local state

4. **Loading States**: Prevent multiple requests
   - Buttons disabled during request
   - Form inputs disabled during request

## Scalability Notes

### For Production
1. Move tokens to httpOnly cookies
2. Add refresh token mechanism
3. Implement proper CORS settings
4. Add rate limiting
5. Use HTTPS only

### For Adding Features
1. Create new pages with ProtectedRoute wrapper
2. Add new API endpoints in `authAPI` object
3. Use utility functions for token management
4. Follow same error/loading pattern

## Common Issues & Solutions

### Issue: "Cannot login"
- Check backend is running on port 5000
- Check .env file has correct VITE_API_URL
- Check browser DevTools Network tab for error response

### Issue: "Token not sent with requests"
- Check localStorage has 'token' key
- Check Network tab Authorization header
- Verify API config.js interceptor working

### Issue: "Always redirected to login"
- Check if token valid (not expired)
- Check backend JWT_SECRET matches
- Clear localStorage and login again

### Issue: "CORS errors"
- Ensure backend has cors() middleware
- Check Access-Control headers in backend
- Use correct API URL in .env

## File Checklist

✓ src/api/config.js - Axios configuration
✓ src/utils/auth.js - Auth utilities
✓ src/components/ProtectedRoute.jsx - Route protection
✓ src/pages/Login.jsx - Login with API
✓ src/pages/Register.jsx - Register with API
✓ src/components/Sidebar.jsx - Logout functionality
✓ src/App.jsx - Protected routes setup
✓ .env - API configuration
✓ package.json - axios installed

All files are ready to use!
