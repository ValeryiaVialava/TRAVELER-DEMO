import { Link } from 'react-router-dom'
import logo from '../../assets/TRAVELER.png'
import styles from './Navbar.module.css'

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <img src={logo} alt="TRAVELER" className={styles.logoImg} />
      </Link>
      <div className={styles.actions}>
        <Link to="/about" className={styles.link}>About</Link>
        <button className={styles.loginBtn}>[ Log In ]</button>
      </div>
    </nav>
  )
}
