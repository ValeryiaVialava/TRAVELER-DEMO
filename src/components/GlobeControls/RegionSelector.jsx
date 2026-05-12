import { useGame } from '../../context/GameContext.jsx'
import { REGIONS } from '../../data/countries.js'
import styles from './GlobeControls.module.css'

export default function RegionSelector() {
  const { state, dispatch } = useGame()

  return (
    <div className={styles.panel}>
      <div className={styles.label}>// REGION</div>
      {Object.entries(REGIONS).map(([key, { label, emoji }]) => (
        <button
          key={key}
          className={`${styles.btn} ${state.region === key ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_REGION', payload: key })}
        >
          {emoji} {label}
        </button>
      ))}
    </div>
  )
}
