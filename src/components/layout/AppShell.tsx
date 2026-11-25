import { Link, NavLink, Outlet } from 'react-router-dom'
import './AppShell.css'

const links = [
  { to: '/tracks', label: 'Tracks' },
  { to: '/labs', label: 'Labs' },
  { to: '/search', label: 'Search' },
  { to: '/progress', label: 'Progress' },
]

export function AppShell() {
  return (
    <div className="shell">
      <header className="topnav">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">LearnGenAI</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'nav active' : 'nav')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
      <footer className="shell-foot">
        <span>LearnGenAI Portal</span>
        <span>Visual · Interactive · Scenario-based GenAI learning</span>
      </footer>
    </div>
  )
}
