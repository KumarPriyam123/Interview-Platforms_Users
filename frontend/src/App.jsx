import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import IndustryLeadersPage from './pages/IndustryLeadersPage'
import AIInterviewPage from './pages/AIInterviewPage'
import FeedbackPage from './pages/FeedbackPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/industry-leaders" element={<IndustryLeadersPage />} />
      <Route path="/ai-interview" element={<AIInterviewPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
