// HashRouter — robust on GitHub Pages (no 404.html fallback dance needed)
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { UserProvider, useUser } from './context/UserContext.jsx'
import { GameProvider } from './context/GameContext.jsx'
import LoadingScreen from './components/LoadingScreen/LoadingScreen.jsx'
import Landing from './pages/Landing/Landing.jsx'
import Globe from './pages/Globe/Globe.jsx'
import Login from './pages/Login/Login.jsx'

function RequireUser({ children }) {
  const { username } = useUser()
  if (!username) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { username } = useUser()
  if (username) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 3200)
    return () => clearTimeout(timer)
  }, [])

  if (booting) return <LoadingScreen />

  return (
    <HashRouter>
      <UserProvider>
        <GameProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/"      element={<RequireUser><Landing /></RequireUser>} />
            <Route path="/globe" element={<RequireUser><Globe /></RequireUser>} />
            <Route path="*"      element={<Navigate to="/" replace />} />
          </Routes>
        </GameProvider>
      </UserProvider>
    </HashRouter>
  )
}
