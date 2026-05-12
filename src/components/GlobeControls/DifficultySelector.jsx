import { useGame } from '../../context/GameContext.jsx'
import { DIFFICULTIES } from '../../data/countries.js'
import styles from './GlobeControls.module.css'

export default function DifficultySelector() {
  const { state, dispatch } = useGame()

  return (
    <div className={styles.panel}>
      <div className={styles.label}>// УРОВЕНЬ</div>
      {Object.entries(DIFFICULTIES).map(([key, { label, description }]) => (
        <button
          key={key}
          className={`${styles.btn} ${state.difficulty === key ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: key })}
          title={description}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
