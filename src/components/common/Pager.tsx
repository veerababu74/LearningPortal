import { useEffect, useMemo, useState } from 'react'
import './Pager.css'

/** Client-side pagination. Resets to page 1 whenever `resetKey` changes (e.g. a search query). */
export function usePaged<T>(items: T[], pageSize: number, resetKey: unknown = '') {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  useEffect(() => setPage(1), [resetKey, pageSize])
  const safe = Math.min(page, pages)
  const slice = useMemo(() => items.slice((safe - 1) * pageSize, safe * pageSize), [items, safe, pageSize])
  return { page: safe, pages, slice, setPage, from: items.length ? (safe - 1) * pageSize + 1 : 0, to: Math.min(items.length, safe * pageSize), total: items.length }
}

function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pages - 1, page + 1)
  if (start > 2) out.push('…')
  for (let p = start; p <= end; p++) out.push(p)
  if (end < pages - 1) out.push('…')
  out.push(pages)
  return out
}

type Props = {
  page: number
  pages: number
  onChange: (page: number) => void
  from?: number
  to?: number
  total?: number
  label?: string
  /** Element id to scroll back to after changing page. */
  scrollTo?: string
}

export function Pager({ page, pages, onChange, from, to, total, label = 'items', scrollTo }: Props) {
  if (pages <= 1) return total ? <p className="pager-info">{total} {label}</p> : null
  const go = (p: number) => {
    onChange(p)
    const el = scrollTo ? document.getElementById(scrollTo) : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <nav className="pager" aria-label="Pagination">
      {total ? (
        <span className="pager-info">
          {from}–{to} of {total} {label}
        </span>
      ) : null}
      <div className="pager-btns">
        <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          ‹ Prev
        </button>
        {pageList(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="pager-gap">
              …
            </span>
          ) : (
            <button key={p} type="button" className={p === page ? 'on' : ''} aria-current={p === page ? 'page' : undefined} onClick={() => go(p)}>
              {p}
            </button>
          ),
        )}
        <button type="button" onClick={() => go(page + 1)} disabled={page >= pages} aria-label="Next page">
          Next ›
        </button>
      </div>
    </nav>
  )
}
