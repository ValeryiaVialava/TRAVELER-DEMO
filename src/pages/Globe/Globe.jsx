import { useEffect, useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { getCountriesForGame } from '../../data/countries.js'
import Navbar from '../../components/Navbar/Navbar.jsx'
import DifficultySelector from '../../components/GlobeControls/DifficultySelector.jsx'
import RegionSelector from '../../components/GlobeControls/RegionSelector.jsx'
import LabelToggle from '../../components/GlobeControls/LabelToggle.jsx'
import ExploredMeter from '../../components/GlobeControls/ExploredMeter.jsx'
import styles from './Globe.module.css'

export default function Globe() {
  const { state, dispatch, getNextCountry } = useGame()
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const countries = getCountriesForGame(state.region, state.difficulty)

  useEffect(() => {
    dispatch({ type: 'INIT_COUNTRIES', payload: countries.map(c => c.iso) })
  }, [state.region, state.difficulty])

  useEffect(() => {
    if (countries.length) {
      const isoList = countries.map(c => c.iso)
      const nextIso = getNextCountry(isoList)
      const country = countries.find(c => c.iso === nextIso)
      setCurrentQuestion(country || null)
    }
  }, [state.region, state.difficulty, state.countries])

  function handleAnswer(selectedIso) {
    if (!currentQuestion) return
    const correct = selectedIso === currentQuestion.iso
    dispatch({ type: 'ANSWER', payload: { iso: currentQuestion.iso, correct } })
    setFeedback({ correct, name: currentQuestion.name })
    setTimeout(() => setFeedback(null), 1200)
  }

  return (
    <div className={styles.root}>
      <Navbar />

      {/* Globe placeholder — replace with actual 3D globe */}
      <div className={styles.globeArea}>
        <div className={styles.globePlaceholder}>
          <div className={styles.globeRing} />
          <div className={styles.globeCore}>
            <span className={styles.globeText}>3D GLOBE</span>
            <span className={styles.globeSub}>Three.js / react-globe.gl</span>
            <span className={styles.globeSub}>будет добавлен позже</span>
          </div>
        </div>

        {currentQuestion && (
          <div className={styles.questionBadge}>
            <div className={styles.questionLabel}>// НАЙДИТЕ СТРАНУ</div>
            <div className={styles.questionName}>{currentQuestion.name}</div>
            <div className={styles.questionIso}>{currentQuestion.iso}</div>
          </div>
        )}

        {feedback && (
          <div className={`${styles.feedbackBadge} ${feedback.correct ? styles.correct : styles.incorrect}`}>
            {feedback.correct ? '+ ВЕРНО' : '- НЕВЕРНО'}
            {!feedback.correct && ` — это ${feedback.name}`}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen(o => !o)}
        >
          {sidebarOpen ? '>' : '<'}
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
