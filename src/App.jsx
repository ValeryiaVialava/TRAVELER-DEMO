import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext.jsx'
import { useState, useEffect } from 'react'
import LoadingScreen from './components/LoadingScreen/LoadingScreen.jsx'
import Landing from './pages/Landing/Landing.jsx'
import Globe from './pages/Globe/Globe.jsx'

export default function App() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 3200)
    return () => clearTimeout(timer)
  }, [])

  if (booting) return <LoadingScreen />

  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/globe" element={<Globe />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  )
}
