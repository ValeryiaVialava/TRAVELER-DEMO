import styles from './ExitConfirm.module.css'

export default function ExitConfirm({ onCancel, onConfirm }) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.corner} data-pos="tl" />
        <div className={styles.corner} data-pos="tr" />
        <div className={styles.corner} data-pos="bl" />
        <div className={styles.corner} data-pos="br" />

        <header className={styles.header}>
          <span className={styles.title}>ABORT SESSION?</span>
        </header>

        <div className={styles.body}>
          <p>Mission in progress.</p>
          <p>Progress is auto-saved per profile.</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>
            [ RESUME ]
          </button>
          <button className={styles.confirm} onClick={onConfirm}>
            [ EXIT ]
          </button>
        </div>
      </div>
    </div>
  )
}
