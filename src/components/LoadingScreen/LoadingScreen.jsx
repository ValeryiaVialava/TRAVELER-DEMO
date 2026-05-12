import { useState, useEffect } from 'react'
import styles from './LoadingScreen.module.css'

const BOOT_LINES = [
  '> TRAVELER OS v2.6.0',
  '> Initializing navigation systems...',
  '> Connecting to Earth orbital relay...',
  '> Loading planetary data...',
  '> Calibrating geospatial sensors...',
  '> System ready.',
]

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0)
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + Math.random() * 18 + 4
        return next >= 100 ? 100 : next
      })
    }, 220)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (lineIndex < BOOT_LINES.length - 1) {
      const t = setTimeout(() => setLineIndex(i => i + 1), 480)
      return () => clearTimeout(t)
    }
  }, [lineIndex])

  return (
    <div className={styles.root}>
      <div className={styles.terminal}>
        {BOOT_LINES.slice(0, lineIndex + 1).map((line, i) => (
          <div key={i} className={styles.line}>{line}</div>
        ))}
        {lineIndex === BOOT_LINES.length - 1 && (
          <span className={styles.cursor}>_</span>
        )}
      </div>

      <div className={styles.barWrapper}>
        <div className={styles.label}>
          // Welcome to Earth 2026 [..] &nbsp; Loading...{Math.floor(progress)}%
        </div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${progress}%` }} />
          <div className={styles.barGlow} style={{ left: `${progress}%` }} />
        </div>
        <div className={styles.barSegments}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className={styles.segment} />
          ))}
        </div>
      </div>

      <div className={styles.scanline} />
    </div>
  )
}
