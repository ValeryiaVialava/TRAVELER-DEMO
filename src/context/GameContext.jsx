import { createContext, useContext, useReducer } from 'react'

const GameContext = createContext(null)

const MEMORIZED_THRESHOLD = 3

const initialState = {
  difficulty: 'normal',
  region: 'all',
  labelMode: 'hover',      // 'always' | 'hover' | 'none'
  countries: {},           // { [iso]: { correct: 0, incorrect: 0, streak: 0, memorized: false } }
  totalCountries: 0,
}

function gameReducer(state, action) {
  switch (action.type) {

    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload }

    case 'SET_REGION':
      return { ...state, region: action.payload }

    case 'SET_LABEL_MODE':
      return { ...state, labelMode: action.payload }

    case 'INIT_COUNTRIES': {
      const countries = {}
      action.payload.forEach(iso => {
        countries[iso] = { correct: 0, incorrect: 0, streak: 0, memorized: false }
      })
      return { ...state, countries, totalCountries: action.payload.length }
    }

    case 'ANSWER': {
      const { iso, correct } = action.payload
      const prev = state.countries[iso] || { correct: 0, incorrect: 0, streak: 0, memorized: false }
      const newStreak = correct ? prev.streak + 1 : 0
      const memorized = newStreak >= MEMORIZED_THRESHOLD
      const updated = {
        ...prev,
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
        streak: newStreak,
        memorized,
      }
      return {
        ...state,
        countries: { ...state.countries, [iso]: updated },
      }
    }

    default:
      return state
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  const memorizedCount = Object.values(state.countries).filter(c => c.memorized).length
  const exploredPercent = state.totalCountries > 0
    ? Math.round((memorizedCount / state.totalCountries) * 100)
    : 0

  function getNextCountry(isoList) {
    if (!isoList.length) return null
    const notMemorized = isoList.filter(iso => !state.countries[iso]?.memorized)
    if (!notMemorized.length) return isoList[Math.floor(Math.random() * isoList.length)]

    // Weight: countries with more incorrect answers appear more often
    const weights = notMemorized.map(iso => {
      const c = state.countries[iso]
      if (!c) return 1
      return 1 + c.incorrect * 2
    })
    const total = weights.reduce((a, b) => a + b, 0)
    let rand = Math.random() * total
    for (let i = 0; i < notMemorized.length; i++) {
      rand -= weights[i]
      if (rand <= 0) return notMemorized[i]
    }
    return notMemorized[0]
  }

  return (
    <GameContext.Provider value={{ state, dispatch, exploredPercent, memorizedCount, getNextCountry }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}
