import RiskQuiz from './components/RiskQuiz'
import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <RiskQuiz />
      <Toaster 
        position="top-center"
        richColors
        closeButton
      />
    </>
  )
}

export default App
