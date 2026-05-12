import { useGame } from '../../context/GameContext.jsx'
import styles from './GlobeControls.module.css'

const MODES = [
  { key: 'always', label: 'Всегда показывать' },
  { key: 'hover',  label: 'При наведении' },
  { key: 'none',   label: 'Скрыть названия' },
]

export default function LabelToggle() {
  const { state, dispatch } = useGame()

  return (
    <div className={styles.panel}>
      <div className={styles.label}>// НАЗВАНИЯ СТРАН</div>
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
