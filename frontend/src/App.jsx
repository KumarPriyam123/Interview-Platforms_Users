import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import IndustryLeadersPage from './pages/IndustryLeadersPage'
import AIInterviewPage from './pages/AIInterviewPage'
import IndustryLeaderInterviewPage from './pages/IndustryLeaderInterviewPage'
import FeedbackPage from './pages/FeedbackPage'
import P2PInterviewPage from './pages/P2PInterviewPage'
import DashboardPage from './pages/DashboardPage'
import ProfileVerificationPage from './pages/ProfileVerificationPage'
import InterviewSetupPage from './pages/InterviewSetupPage'
import InterviewReportPage from './pages/InterviewReportPage'
import './App.css'
import './styles/mockr.css'
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/profile-verification" element={<ProfileVerificationPage activeTab="profile" />} />
      <Route path="/job-matches" element={<ProfileVerificationPage activeTab="matches" />} />
      <Route path="/industry-leaders" element={<IndustryLeadersPage />} />
      <Route path="/ai-interview/:id" element={<AIInterviewPage />} />
      <Route path="/interview-setup" element={<InterviewSetupPage />} />
      <Route path="/live-interview/:id" element={<AIInterviewPage />} />
      <Route path="/interview-report/:id" element={<InterviewReportPage />} />
      <Route path="/industry-leader-interview" element={<IndustryLeaderInterviewPage />} />
      <Route path="/p2p-interview" element={<P2PInterviewPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
export default App
