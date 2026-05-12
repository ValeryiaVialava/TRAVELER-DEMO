import { useEffect, useState } from 'react'
import styles from './TransitionLoader.module.css'

const LINES = [
  '> Entering atmosphere...',
  '> Downloading geopolitical data...',
  '> Rendering planetary surface...',
  '> Calibrating country boundaries...',
  '> Preparing exploration mode...',
]

export default function TransitionLoader() {
  const [progress, setProgress] = useState(0)
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15 + 5, 100))
    }, 180)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (lineIndex < LINES.length - 1) {
      const t = setTimeout(() => setLineIndex(i => i + 1), 520)
      return () => clearTimeout(t)
    }
  }, [lineIndex])

  return (
    <div className={styles.root}>
      <div className={styles.terminal}>
        {LINES.slice(0, lineIndex + 1).map((l, i) => (
          <div key={i} className={styles.line}>{l}</div>
        ))}
        <span className={styles.cursor}>_</span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.percent}>{Math.floor(progress)}%</div>
      <div className={styles.scanline} />
    </div>
  )
}
