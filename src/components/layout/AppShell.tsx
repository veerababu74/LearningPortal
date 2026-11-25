import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { COURSES, continueLink } from '@/content/courses'
import { useProgress } from '@/store/progress'
import '@/components/common/Pager.css'
import './AppShell.css'

/** Which top-level section a path belongs to (for the active nav state). */
function sectionOf(pathname: string) {
  if (pathname === '/') return 'home'
  if (/^\/labs(\/|$)/.test(pathname) || /\/visualizer(\/|$)/.test(pathname) || /^\/(python|docker)\/labs/.test(pathname)) return 'labs'
  if (/^\/search/.test(pathname)) return 'search'
  if (/^\/progress/.test(pathname)) return 'progress'
  return 'courses'
}

/** Scroll to the top on every page change (but respect #anchors). */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function PageLoading() {
  return (
    <div className="page-loading" role="status">
      <span className="spinner" aria-hidden />
      Loading…
    </div>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  const section = sectionOf(pathname)
  const last = useProgress((s) => s.lastLessonId)
  const cont = continueLink(last)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coursesOpen, setCoursesOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // close menus on navigation
  useEffect(() => {
    setMenuOpen(false)
    setCoursesOpen(false)
  }, [pathname])

  // close on Escape / outside click
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setCoursesOpen(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setCoursesOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [])

  const cls = (name: string) => (section === name ? 'nav active' : 'nav')

  return (
    <div className="shell">
      <ScrollToTop />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topnav">
        <Link to="/" className="brand" aria-label="LearnGenAI home">
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">LearnGenAI</span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>

        <nav id="primary-nav" className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Primary">
          <NavLink to="/" end className={cls('home')}>
            Home
          </NavLink>

          <div className="nav-drop" ref={dropRef}>
            <button
              type="button"
              className={`${cls('courses')} nav-drop-btn`}
              aria-expanded={coursesOpen}
              aria-haspopup="true"
              onClick={() => setCoursesOpen((o) => !o)}
            >
              Courses <span aria-hidden>▾</span>
            </button>
            <div className={coursesOpen ? 'nav-menu open' : 'nav-menu'}>
              {COURSES.map((c) => (
                <Link key={c.id} to={c.to} className="nav-menu-item" style={{ ['--accent' as string]: c.accent }}>
                  <span className="nav-menu-icon" aria-hidden>
                    {c.icon}
                  </span>
                  <span>
                    <strong>{c.title}</strong>
                    <small>{c.kicker}</small>
                  </span>
                </Link>
              ))}
              <Link to="/topics" className="nav-menu-all">
                All topics overview →
              </Link>
            </div>
          </div>

          <NavLink to="/labs" className={cls('labs')}>
            Labs
          </NavLink>
          <NavLink to="/search" className={cls('search')}>
            Search
          </NavLink>
          <NavLink to="/progress" className={cls('progress')}>
            Progress
          </NavLink>
          {cont ? (
            <Link to={cont.to} className="nav-continue" title={cont.title}>
              Continue →
            </Link>
          ) : null}
        </nav>
      </header>

      <main id="main" className="shell-main">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="shell-foot">
        <div className="foot-brand">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-text">LearnGenAI</span>
          </Link>
          <p>Visual, hands-on learning for Python, AI agents and Generative AI.</p>
        </div>
        <div className="foot-col">
          <h2>Courses</h2>
          {COURSES.map((c) => (
            <Link key={c.id} to={c.to}>
              {c.title}
            </Link>
          ))}
        </div>
        <div className="foot-col">
          <h2>Practice</h2>
          <Link to="/labs">Labs & playgrounds</Link>
          <Link to="/agents/visualizer">Agent Visualizer</Link>
          <Link to="/python/visualizer">Python Visualizer</Link>
          <Link to="/agents/interview">Interview prep</Link>
        </div>
        <div className="foot-col">
          <h2>You</h2>
          <Link to="/progress">Progress</Link>
          <Link to="/search">Search</Link>
          <Link to="/topics">All topics</Link>
        </div>
      </footer>
    </div>
  )
}
