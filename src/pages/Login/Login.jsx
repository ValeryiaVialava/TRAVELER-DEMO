import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'
import styles from './Login.module.css'

export default function Login() {
  const { signIn } = useUser()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState(null)

  function listProfiles() {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith('traveler.profile.'))
        .map(k => k.slice('traveler.profile.'.length))
    } catch { return [] }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const ok = signIn(name)
    if (!ok) { setError('NAME REQUIRED'); return }
    navigate('/')
  }

  function handleQuickPick(profile) {
    signIn(profile)
    navigate('/')
  }

  const profiles = listProfiles()

  return (
    <div className={styles.root}>
      <div className={styles.scanline} />

      <div className={styles.card}>
        <div className={styles.corner} data-pos="tl" />
        <div className={styles.corner} data-pos="tr" />
        <div className={styles.corner} data-pos="bl" />
        <div className={styles.corner} data-pos="br" />

        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandEn}>TRAVELER</span>
          </div>
          <div className={styles.signal}>
            <span>SIGNAL LOW</span>
            <span className={styles.battery}>▮▮▮▮▯</span>
          </div>
        </header>

        <div className={styles.title}>
          <div className={styles.titleLabel}>OPERATOR</div>
          <div className={styles.titleAccess}>
            ACCESS<br/>
            <span className={styles.titleAccessStars}>*********</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>// NAME / CALLSIGN</span>
            <div className={styles.inputRow}>
              <span className={styles.prompt}>{'>'}</span>
              <input
                className={styles.input}
                value={name}
                onChange={e => { setName(e.target.value); setError(null) }}
                autoFocus
                maxLength={24}
                spellCheck={false}
                placeholder="ENTER NAME"
              />
              <span className={styles.cursor}>_</span>
            </div>
          </label>

          {error && <div className={styles.error}>! {error}</div>}

          <button type="submit" className={styles.submit}>
            [ INITIATE SESSION ]
          </button>
        </form>

        {profiles.length > 0 && (
          <div className={styles.profiles}>
            <div className={styles.profilesLabel}>// EXISTING PROFILES</div>
            <div className={styles.profilesList}>
              {profiles.map(p => (
                <button
                  key={p}
                  type="button"
                  className={styles.profileBtn}
                  onClick={() => handleQuickPick(p)}
                >
                  ▸ {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <span>AUTHORIZATION GRANTED TO THE ABOVE OPERATOR</span>
          <span>TO IDENTIFY AND CATALOG TERRESTRIAL</span>
          <span>POLITICAL ENTITIES.</span>
        </footer>

        <div className={styles.serial}>
          PROPERTY OF EARTH ORBITAL SURVEY · UNIT/04
        </div>
      </div>
    </div>
  )
}
