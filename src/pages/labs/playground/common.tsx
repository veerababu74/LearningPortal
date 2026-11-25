import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './playground.css'

export function PgHeader({
  kicker,
  title,
  children,
  python = false,
}: {
  kicker: string
  title: string
  children: ReactNode
  python?: boolean
}) {
  return (
    <>
      <nav className="pg-crumbs" aria-label="Breadcrumb">
        <Link to="/labs">Labs</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>
      <header className={python ? 'pg-head py' : 'pg-head'}>
        <p className="pg-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{children}</p>
      </header>
    </>
  )
}

/** Reveal `total` items one by one every `ms` after `runId` changes. */
export function useReveal(total: number, runId: number, ms = 550) {
  const [shown, setShown] = useState(0)
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (!runId) return
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    setShown(0)
    setActive(true)
    let n = 0
    const t = window.setInterval(() => {
      n++
      setShown(n)
      if (n >= total) {
        window.clearInterval(t)
        setActive(false)
      }
    }, ms)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])
  // when not replaying, always show everything (settings changes update the result instantly)
  return active ? Math.min(shown, total) : total
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'ok' | 'bad' | 'warn' }) {
  return (
    <div className={tone ? `pg-stat ${tone}` : 'pg-stat'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  fmt = (v: number) => String(v),
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  fmt?: (v: number) => string
}) {
  return (
    <label className="pg-field">
      <span>
        {label}: <b>{fmt(value)}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function Check({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="pg-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  )
}
