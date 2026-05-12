import { useEffect, useState, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { getCountriesForGame } from '../../data/countries.js'
import Navbar from '../../components/Navbar/Navbar.jsx'
import Globe3D from '../../components/Globe3D/Globe3D.jsx'
import DifficultySelector from '../../components/GlobeControls/DifficultySelector.jsx'
import RegionSelector from '../../components/GlobeControls/RegionSelector.jsx'
import LabelToggle from '../../components/GlobeControls/LabelToggle.jsx'
import ExploredMeter from '../../components/GlobeControls/ExploredMeter.jsx'
import styles from './Globe.module.css'

export default function Globe() {
  const { state, dispatch, getNextCountry } = useGame()
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [correctHighlight, setCorrectHighlight] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [locked, setLocked] = useState(false)

  const countries = getCountriesForGame(state.region, state.difficulty)

  useEffect(() => {
    dispatch({ type: 'INIT_COUNTRIES', payload: countries.map(c => c.iso) })
  }, [state.region, state.difficulty])

  useEffect(() => {
    if (!countries.length) return
    const isoList = countries.map(c => c.iso)
    const nextIso = getNextCountry(isoList)
    setCurrentQuestion(countries.find(c => c.iso === nextIso) ?? null)
  }, [state.region, state.difficulty, state.countries])

  const handleCountryClick = useCallback((clickedIso) => {
    if (!currentQuestion || locked) return

    const correct = clickedIso === currentQuestion.iso
    const clickedCountry = countries.find(c => c.iso === clickedIso)

    dispatch({ type: 'ANSWER', payload: { iso: currentQuestion.iso, correct } })
    setLocked(true)

    if (!correct) {
      setCorrectHighlight(currentQuestion.iso)
      setTimeout(() => setCorrectHighlight(null), 2000)
    }

    setFeedback({
      correct,
      clickedName: clickedCountry?.name ?? clickedIso,
      correctName: currentQuestion.name,
    })

    setTimeout(() => {
      setFeedback(null)
      setLocked(false)
    }, 1600)
  }, [currentQuestion, locked, countries, dispatch])

  return (
    <div className={styles.root}>
      <Navbar />

      <div className={styles.globeArea}>
        <Globe3D
          currentQuestion={currentQuestion}
          correctHighlight={correctHighlight}
          onCountryClick={handleCountryClick}
        />

        {currentQuestion && !feedback && (
          <div className={styles.questionBadge}>
            <div className={styles.questionLabel}>// FIND THE COUNTRY</div>
            <div className={styles.questionName}>{currentQuestion.name}</div>
            <div className={styles.questionIso}>{currentQuestion.iso}</div>
          </div>
        )}

        {feedback && (
          <div className={`${styles.feedbackBadge} ${feedback.correct ? styles.correct : styles.incorrect}`}>
            {feedback.correct
              ? `+ CORRECT — ${feedback.correctName}`
              : `- WRONG — that was ${feedback.clickedName}. Correct: ${feedback.correctName}`}
          </div>
        )}
      </div>

      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
        <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? '›' : '‹'}
        </button>
        {sidebarOpen && (
          <div className={styles.sidebarContent}>
            <ExploredMeter />
            <div style={{ marginTop: '1.5rem' }} />
            <DifficultySelector />
            <RegionSelector />
            <LabelToggle />
          </div>
        )}
      </div>

      <div className={styles.scanline} />
    </div>
  )
}
