import { createContext, useContext, useReducer, useEffect } from 'react'
import { COUNTRY_DATA } from '../data/countries.js'
import { useUser } from './UserContext.jsx'

const GameContext = createContext(null)

const MEMORIZED_THRESHOLD = 3

const TIER_LOOKUP = new Map(COUNTRY_DATA.map(c => [c.iso, c.tier]))

// Base weight multiplier per tier per difficulty.
// Easy  → popular countries dominate; Hard → everything equally likely.
const TIER_WEIGHTS = {
  easy:   { 1: 10, 2: 2,  3: 0.1 },
  normal: { 1: 4,  2: 2,  3: 0.5 },
  hard:   { 1: 1,  2: 1,  3: 1   },
}

const initialState = {
  difficulty: 'normal',
  region: 'all',
  labelMode: 'hover',      // 'always' | 'hover' | 'none'
  countries: {},           // { [iso]: { correct: 0, incorrect: 0, streak: 0, memorized: false } }
  totalCountries: 0,
}

function gameReducer(state, action) {
  switch (action.type) {

    case 'LOAD_PROFILE':
      return { ...state, ...action.payload }

    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload }

    case 'SET_REGION':
      return { ...state, region: action.payload }

    case 'SET_LABEL_MODE':
      return { ...state, labelMode: action.payload }

    case 'INIT_COUNTRIES': {
      // Preserve existing per-country stats — merging new ISO list on top of
      // saved progress so switching region/difficulty doesn't wipe history.
      const countries = {}
      action.payload.forEach(iso => {
        countries[iso] = state.countries[iso] ?? { correct: 0, incorrect: 0, streak: 0, memorized: false }
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

function profileKey(username) {
  return `traveler.profile.${username}`
}

function loadProfile(username) {
  if (!username) return null
  try {
    const raw = localStorage.getItem(profileKey(username))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveProfile(username, state) {
  if (!username) return
  try {
    // Persist the slowly-changing slice only; transient stuff is recomputed
    const slim = {
      difficulty: state.difficulty,
      region: state.region,
      labelMode: state.labelMode,
      countries: state.countries,
    }
    localStorage.setItem(profileKey(username), JSON.stringify(slim))
  } catch { /* ignore */ }
}

export function GameProvider({ children }) {
  const { username } = useUser()
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Hydrate from profile on login; reset to initial state on logout.
  useEffect(() => {
    const saved = loadProfile(username)
    dispatch({ type: 'LOAD_PROFILE', payload: saved ?? initialState })
  }, [username])

  // Persist on every meaningful change. Cheap — localStorage write is ~ms.
  useEffect(() => {
    if (username) saveProfile(username, state)
  }, [username, state.difficulty, state.region, state.labelMode, state.countries])

  const memorizedCount = Object.values(state.countries).filter(c => c.memorized).length
  const exploredPercent = state.totalCountries > 0
    ? Math.round((memorizedCount / state.totalCountries) * 100)
    : 0

  function getNextCountry(isoList) {
    if (!isoList.length) return null
    const notMemorized = isoList.filter(iso => !state.countries[iso]?.memorized)
    if (!notMemorized.length) return isoList[Math.floor(Math.random() * isoList.length)]

    const tierWeights = TIER_WEIGHTS[state.difficulty] ?? TIER_WEIGHTS.normal

    const weights = notMemorized.map(iso => {
      const c    = state.countries[iso]
      const tier = TIER_LOOKUP.get(iso) ?? 2
      const tierMult  = tierWeights[tier] ?? 1
      const errorMult = 1 + (c?.incorrect ?? 0) * 2
      return tierMult * errorMult
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
