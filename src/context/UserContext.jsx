import { createContext, useContext, useState, useEffect } from 'react'

const UserContext = createContext(null)

const STORAGE_KEY = 'traveler.activeUser'

export function UserProvider({ children }) {
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || null }
    catch { return null }
  })

  useEffect(() => {
    try {
      if (username) localStorage.setItem(STORAGE_KEY, username)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* storage may be disabled */ }
  }, [username])

  function signIn(name) {
    const clean = (name ?? '').trim().slice(0, 24)
    if (!clean) return false
    setUsername(clean)
    return true
  }

  function signOut() { setUsername(null) }

  return (
    <UserContext.Provider value={{ username, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
