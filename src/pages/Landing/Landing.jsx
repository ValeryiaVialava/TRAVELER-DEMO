import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar/Navbar.jsx'
import TransitionLoader from '../../components/TransitionLoader/TransitionLoader.jsx'
import styles from './Landing.module.css'

export default function Landing() {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  function handleStart() {
    setLaunching(true)
    setTimeout(() => navigate('/globe'), 2800)
  }

  if (launching) return <TransitionLoader />

  return (
    <div className={styles.root}>
      <Navbar />

      {/* 3D space scene will be placed here */}
      <div className={styles.scene} />

      <div className={styles.hero}>
        <p className={styles.coords}>// 48.8566° N, 2.3522° E — SECTOR EARTH-3</p>
        <h1 className={styles.title}>Welcome to Earth</h1>
        <p className={styles.subtitle}>
          You have arrived. Planet identified.<br />
          Begin your study of the political map.
        </p>
        <button className={styles.startBtn} onClick={handleStart}>
          <span className={styles.btnBracket}>[</span>
          &nbsp;START&nbsp;
          <span className={styles.btnBracket}>]</span>
        </button>
      </div>

      <div className={styles.scanline} />
    </div>
  )
}
