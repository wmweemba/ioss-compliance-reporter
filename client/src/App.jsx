import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import RiskQuiz from './components/RiskQuiz'
import Dashboard from './components/Dashboard'
import { Toaster } from 'sonner'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RiskQuiz />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <Toaster 
        position="top-center"
        richColors
        closeButton
      />
    </Router>
  )
}

export default App
