import { useState } from 'react'
import ChatInterface from './components/ChatInterface'
import './App.css'

function App() {
  const [userId] = useState<number>(1) // In production, get from auth

  return (
    <div className="app">
      <div className="app-header">
        <h1>Personal Learner</h1>
        <p>Track your learning journey</p>
      </div>
      <ChatInterface userId={userId} />
    </div>
  )
}

export default App

