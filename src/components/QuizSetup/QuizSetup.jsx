import { useState } from 'react'
import { REGIONS, DIFFICULTIES, COUNTRY_DATA } from '../../data/countries.js'
import styles from './QuizSetup.module.css'

// Short region blurbs — show a hint of what's inside without needing a photo.
const REGION_HINTS = {
  all:      ['200 ENTITIES', 'FULL TERRESTRIAL ATLAS'],
  europe:   ['44 ENTITIES',  'EU CORE · BALKANS · BALTIC'],
  asia:     ['50 ENTITIES',  'EAST · SOUTH · MIDDLE EAST'],
  africa:   ['55 ENTITIES',  'NORTH · SAHEL · SUB-SAHARAN'],
  americas: ['36 ENTITIES',  'NORTH · CENTRAL · SOUTH'],
  oceania:  ['15 ENTITIES',  'PACIFIC · AUS/NZ'],
}

export default function QuizSetup({ initialRegion, initialDifficulty, onCancel, onConfirm, onPreviewRegion }) {
  const [region, setRegion]         = useState(initialRegion ?? 'all')
  const [difficulty, setDifficulty] = useState(initialDifficulty ?? 'normal')

  function selectRegion(key) {
    setRegion(key)
    onPreviewRegion?.(key)
  }

  // Live count of countries in the chosen region for the footer summary
  const regionCount = region === 'all'
    ? COUNTRY_DATA.length
    : COUNTRY_DATA.filter(c => c.region === region).length

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel}>
        <div className={styles.corner} data-pos="tl" />
        <div className={styles.corner} data-pos="tr" />
        <div className={styles.corner} data-pos="bl" />
        <div className={styles.corner} data-pos="br" />

        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTitle}>MISSION SETUP</span>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.headerCode}>SEC-04/QZ</span>
          </div>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionLabel}>// REGION OF STUDY</div>
          <div className={styles.regionGrid}>
            {Object.entries(REGIONS).map(([key, { label }]) => (
              <button
                key={key}
                className={`${styles.regionCard} ${region === key ? styles.regionActive : ''}`}
                onClick={() => selectRegion(key)}
                onMouseEnter={() => onPreviewRegion?.(key)}
              >
                <div className={styles.regionLabel}>{label}</div>
                <div className={styles.regionHint}>
                  {REGION_HINTS[key]?.[0]}<br />
                  <span className={styles.regionHintSub}>{REGION_HINTS[key]?.[1]}</span>
                </div>
                {region === key && <div className={styles.regionMarker}>▸ SELECTED</div>}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionLabel}>// DIFFICULTY</div>
          <div className={styles.diffGrid}>
            {Object.entries(DIFFICULTIES).map(([key, { label, description }]) => (
              <button
                key={key}
                className={`${styles.diffCard} ${difficulty === key ? styles.diffActive : ''}`}
                onClick={() => setDifficulty(key)}
              >
                <div className={styles.diffTop}>
                  <span className={styles.diffLabel}>{label.toUpperCase()}</span>
                  <span className={styles.diffBars}>
                    {key === 'easy'   && '▮▯▯'}
                    {key === 'normal' && '▮▮▯'}
                    {key === 'hard'   && '▮▮▮'}
                  </span>
                </div>
                <div className={styles.diffDesc}>{description}</div>
              </button>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.summary}>
            <span className={styles.summaryKey}>SCOPE</span>
            <span className={styles.summaryVal}>{regionCount} COUNTRIES · {difficulty.toUpperCase()}</span>
          </div>
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onCancel}>
              [ CANCEL ]
            </button>
            <button className={styles.playBtn} onClick={() => onConfirm({ region, difficulty })}>
              [ PLAY ▶ ]
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
