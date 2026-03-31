import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import SetupPage from './pages/SetupPage'
import InterviewPage from './pages/InterviewPage'
import ReportPage from './pages/ReportPage'
import './App.css'

function App() {
  const [sessionId, setSessionId] = useState(null)

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/setup" element={<SetupPage onSessionCreated={setSessionId} />} />
          <Route path="/interview/:id" element={<InterviewPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/" element={<Navigate to="/setup" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
