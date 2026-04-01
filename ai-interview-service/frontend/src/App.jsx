import { Routes, Route, Navigate } from 'react-router-dom'
import SetupPage from './pages/SetupPage'
import InterviewPage from './pages/InterviewPage'
import ReportPage from './pages/ReportPage'
import DatasetPage from './pages/DatasetPage'

function App() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/interview/:id" element={<InterviewPage />} />
      <Route path="/report/:id" element={<ReportPage />} />
      <Route path="/dataset" element={<DatasetPage />} />
      <Route path="/" element={<Navigate to="/setup" replace />} />
      <Route path="*" element={<Navigate to="/setup" replace />} />
    </Routes>
  )
}

export default App
