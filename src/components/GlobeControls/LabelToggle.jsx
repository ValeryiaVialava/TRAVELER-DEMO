import { useGame } from '../../context/GameContext.jsx'
import styles from './GlobeControls.module.css'

const MODES = [
  { key: 'always', label: 'Always show' },
  { key: 'hover',  label: 'Show on hover' },
  { key: 'none',   label: 'Hide labels' },
]

export default function LabelToggle() {
  const { state, dispatch } = useGame()

  return (
    <div className={styles.panel}>
      <div className={styles.label}>// COUNTRY LABELS</div>
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          className={`${styles.btn} ${state.labelMode === key ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_LABEL_MODE', payload: key })}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
