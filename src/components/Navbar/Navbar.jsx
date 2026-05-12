import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'
import logo from '../../assets/logo.png'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { username, signOut } = useUser()
  const navigate = useNavigate()

  function handleAuthClick() {
    if (username) { signOut(); navigate('/login') }
    else          { navigate('/login') }
  }

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <img src={logo} alt="TRAVELER" className={styles.logoImg} />
      </Link>
      <div className={styles.actions}>
        {username && (
          <span className={styles.user}>
            <span className={styles.userLabel}>OP //</span>
            <span className={styles.userName}>{username}</span>
          </span>
        )}
        <Link to="/about" className={styles.link}>About</Link>
        <button className={styles.loginBtn} onClick={handleAuthClick}>
          [ {username ? 'Log Out' : 'Log In'} ]
        </button>
      </div>
    </nav>
  )
}
