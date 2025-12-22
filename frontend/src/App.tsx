import { useState, useEffect } from 'react'
import ChatInterface from './components/ChatInterface'
import Login from './components/Login'
import Signup from './components/Signup'
import { AuthService } from './services/authService'
import './App.css'

type AuthView = 'login' | 'signup'

function App() {
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState<string>('')
  const [authView, setAuthView] = useState<AuthView>('login')
  const [isLoading, setIsLoading] = useState(true)
  const authService = new AuthService()

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      setUserId(currentUser.userId)
      setUsername(currentUser.username)
    }
    setIsLoading(false)
  }, [])

  const handleLoginSuccess = (loggedInUserId: number, loggedInUsername: string) => {
    setUserId(loggedInUserId)
    setUsername(loggedInUsername)
  }

  const handleSignupSuccess = (newUserId: number, newUsername: string) => {
    setUserId(newUserId)
    setUsername(newUsername)
  }

  const handleLogout = () => {
    authService.logout()
    setUserId(null)
    setUsername('')
    setAuthView('login')
  }

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="app">
        {authView === 'login' ? (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignup={() => setAuthView('signup')}
          />
        ) : (
          <Signup
            onSignupSuccess={handleSignupSuccess}
            onSwitchToLogin={() => setAuthView('login')}
          />
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-content">
          <div>
            <h1>Personal Learner</h1>
            <p>Track your learning journey</p>
          </div>
          <div className="user-info">
            <span className="username">Welcome, {username}!</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </div>
      <ChatInterface userId={userId} />
    </div>
  )
}

export default App

