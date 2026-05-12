import { useEffect, useState, useCallback, useMemo } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { getCountriesForGame, COUNTRY_DATA, REGIONS } from '../../data/countries.js'
import Navbar from '../../components/Navbar/Navbar.jsx'
import Globe3D from '../../components/Globe3D/Globe3D.jsx'
import QuizSetup from '../../components/QuizSetup/QuizSetup.jsx'
import ExitConfirm from '../../components/ExitConfirm/ExitConfirm.jsx'
import LabelToggle from '../../components/GlobeControls/LabelToggle.jsx'
import ExploredMeter from '../../components/GlobeControls/ExploredMeter.jsx'
import styles from './Globe.module.css'

// idle    — just the rotating globe, no quiz
// setup   — overlay with difficulty + region
// loading — boot-style loader between setup and play
// playing — active quiz
// exit    — confirmation overlay above playing
const STAGES = { idle: 'idle', setup: 'setup', loading: 'loading', playing: 'playing', exit: 'exit' }

export default function Globe() {
  const { state, dispatch, getNextCountry } = useGame()
  const [stage, setStage]                 = useState(STAGES.idle)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [feedback, setFeedback]           = useState(null)
  const [correctHighlight, setCorrectHighlight] = useState(null)
  const [locked, setLocked]               = useState(false)
  const [renderedISOs, setRenderedISOs]   = useState(null)
  // Region the globe is visually pointed at (changes on hover in setup overlay)
  const [previewRegion, setPreviewRegion] = useState(null)

  const countries = useMemo(() => {
    const pool = getCountriesForGame(state.region, state.difficulty)
    if (!renderedISOs) return pool
    return pool.filter(c => renderedISOs.has(c.iso))
  }, [state.region, state.difficulty, renderedISOs])

  const regionISOs = state.region === 'all'
    ? COUNTRY_DATA.map(c => c.iso)
    : COUNTRY_DATA.filter(c => c.region === state.region).map(c => c.iso)

  // Initialize the country pool whenever the region/difficulty change or the
  // globe finishes loading. Saved progress is merged in by the reducer.
  useEffect(() => {
    if (!renderedISOs) return
    dispatch({ type: 'INIT_COUNTRIES', payload: countries.map(c => c.iso) })
  }, [state.region, state.difficulty, renderedISOs])

  // Pick a new question whenever we re-enter the playing stage or progress changes
  useEffect(() => {
    if (stage !== STAGES.playing) return
    if (!countries.length) return
    const isoList = countries.map(c => c.iso)
    const nextIso = getNextCountry(isoList)
    setCurrentQuestion(countries.find(c => c.iso === nextIso) ?? null)
  }, [stage, state.region, state.difficulty, state.countries])

  const handleCountryClick = useCallback((clickedIso) => {
    if (stage !== STAGES.playing || !currentQuestion || locked) return

    const correct = clickedIso === currentQuestion.iso
    const clickedCountry = countries.find(c => c.iso === clickedIso) ??
                           COUNTRY_DATA.find(c => c.iso === clickedIso)

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
  }, [stage, currentQuestion, locked, countries, dispatch])

  function handleSetupConfirm({ region, difficulty }) {
    dispatch({ type: 'SET_REGION',     payload: region })
    dispatch({ type: 'SET_DIFFICULTY', payload: difficulty })
    setStage(STAGES.loading)
    setTimeout(() => setStage(STAGES.playing), 1100)
  }

  function handleExit() { setStage(STAGES.exit) }
  function handleExitConfirm() {
    setStage(STAGES.idle)
    setCurrentQuestion(null)
    setFeedback(null)
    setCorrectHighlight(null)
    setPreviewRegion(null)
  }

  // What the globe should be pointing at in each stage
  const focusRegion = stage === STAGES.setup
    ? (previewRegion ?? state.region ?? 'all')
    : (stage === STAGES.playing ? state.region : null)

  // Autorotate only when idle — pause during setup/play so the user can focus
  const autoRotate = stage === STAGES.idle

  return (
    <div className={styles.root}>
      <Navbar />

      <div className={styles.globeArea}>
        <Globe3D
          currentQuestion={stage === STAGES.playing ? currentQuestion : null}
          correctHighlight={correctHighlight}
          onCountryClick={handleCountryClick}
          regionISOs={regionISOs}
          onMeshesReady={setRenderedISOs}
          focusRegion={focusRegion}
          autoRotate={autoRotate}
        />

        {/* ─── IDLE: globe + minimal controls + QUIZ trigger ─── */}
        {stage === STAGES.idle && (
          <>
            <div className={styles.idlePanel}>
              <LabelToggle />
            </div>

            <div className={styles.idleHero}>
              <div className={styles.heroBracket}>// EARTH / TERMINAL READY</div>
              <button className={styles.quizBtn} onClick={() => setStage(STAGES.setup)}>
                [ START QUIZ ▸ ]
              </button>
              <div className={styles.heroHint}>SELECT MISSION PARAMETERS TO BEGIN</div>
            </div>
          </>
        )}

        {/* ─── SETUP overlay ──────────────────────────────────── */}
        {stage === STAGES.setup && (
          <QuizSetup
            initialRegion={state.region}
            initialDifficulty={state.difficulty}
            onCancel={() => { setStage(STAGES.idle); setPreviewRegion(null) }}
            onConfirm={handleSetupConfirm}
            onPreviewRegion={setPreviewRegion}
          />
        )}

        {/* ─── LOADING: short boot animation ──────────────────── */}
        {stage === STAGES.loading && (
          <div className={styles.loader}>
            <div className={styles.loaderBox}>
              <div className={styles.loaderTitle}>// INITIALIZING SECTOR</div>
              <div className={styles.loaderBar}>
                <div className={styles.loaderBarFill} />
              </div>
              <div className={styles.loaderMsg}>
                LOADING {REGIONS[state.region]?.label.toUpperCase()} · {state.difficulty.toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* ─── PLAYING ────────────────────────────────────────── */}
        {stage === STAGES.playing && (
          <>
            <button className={styles.exitBtn} onClick={handleExit}>
              [ × EXIT ]
            </button>

            <div className={styles.hudTop}>
              <ExploredMeter />
            </div>

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
          </>
        )}

        {/* ─── EXIT CONFIRM ───────────────────────────────────── */}
        {stage === STAGES.exit && (
          <ExitConfirm
            onCancel={() => setStage(STAGES.playing)}
            onConfirm={handleExitConfirm}
          />
        )}
      </div>

      <div className={styles.scanline} />
    </div>
  )
}
