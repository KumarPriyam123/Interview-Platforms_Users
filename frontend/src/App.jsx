import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import IndustryLeadersPage from './pages/IndustryLeadersPage'
import AIInterviewPage from './pages/AIInterviewPage'
import IndustryLeaderInterviewPage from './pages/IndustryLeaderInterviewPage'
import FeedbackPage from './pages/FeedbackPage'
import P2PInterviewPage from './pages/P2PInterviewPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/industry-leaders" element={<IndustryLeadersPage />} />
      <Route path="/ai-interview" element={<AIInterviewPage />} />
      <Route path="/industry-leader-interview" element={<IndustryLeaderInterviewPage />} />
      <Route path="/p2p-interview" element={<P2PInterviewPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
