import { useGame } from '../../context/GameContext.jsx'
import styles from './ExploredMeter.module.css'

export default function ExploredMeter() {
  const { exploredPercent, memorizedCount, state } = useGame()

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.label}>// ИССЛЕДОВАНО</span>
        <span className={styles.percent}>{exploredPercent}%</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${exploredPercent}%` }}
        />
      </div>
      <div className={styles.sub}>
        {memorizedCount} / {state.totalCountries} стран запомнено
      </div>
    </div>
  )
}
