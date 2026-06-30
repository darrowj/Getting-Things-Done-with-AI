'use client'
import { Theme, View } from '@/lib/types'

interface Props {
  view: View
  theme: Theme
  rangeLabel: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (v: View) => void
  onThemeToggle: () => void
  onNewEvent: () => void
}

export default function Toolbar({ view, theme, rangeLabel, onPrev, onNext, onToday, onViewChange, onThemeToggle, onNewEvent }: Props) {
  const s: React.CSSProperties = {
    position: 'sticky', top: 0, zIndex: 30,
    background: 'var(--header-bg)',
    borderBottom: '1px solid var(--line)',
    padding: '12px 22px',
    display: 'flex', alignItems: 'center', gap: 10,
  }

  const iconBtn: React.CSSProperties = {
    width: 32, height: 32,
    border: '1px solid var(--line)',
    borderRadius: 8,
    background: 'transparent',
    color: 'var(--text)',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.12s',
  }

  const todayBtn: React.CSSProperties = {
    height: 32, padding: '0 14px',
    border: '1px solid var(--line)',
    borderRadius: 8,
    background: 'transparent',
    color: 'var(--text)',
    fontWeight: 600, fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.12s',
  }

  const segBase: React.CSSProperties = {
    padding: '7px 18px', fontWeight: 600, fontSize: 13,
    border: 'none', cursor: 'pointer', transition: 'background 0.12s',
  }

  const segActive: React.CSSProperties = { ...segBase, background: 'var(--accent)', color: 'var(--accent-text)' }
  const segInactive: React.CSSProperties = { ...segBase, background: 'var(--surface)', color: 'var(--sub)' }

  const primaryBtn: React.CSSProperties = {
    background: 'var(--accent)', color: 'var(--accent-text)',
    border: 'none', borderRadius: 8, padding: '8px 14px',
    fontWeight: 600, fontSize: 13, cursor: 'pointer',
    transition: 'opacity 0.12s',
  }

  const ghostBtn: React.CSSProperties = {
    background: 'transparent', color: 'var(--text)',
    border: '1px solid var(--line)', borderRadius: 8, padding: '7px 12px',
    fontSize: 13, cursor: 'pointer',
    transition: 'background 0.12s',
  }

  return (
    <div style={s}>
      {/* Logo */}
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
        W
      </div>

      {/* Title */}
      <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', marginRight: 8, whiteSpace: 'nowrap' }}>
        Weekly Organizer
      </span>

      {/* Nav */}
      <button style={iconBtn} onClick={onPrev} aria-label="Previous">‹</button>
      <button style={todayBtn} onClick={onToday}>Today</button>
      <button style={iconBtn} onClick={onNext} aria-label="Next">›</button>

      {/* Range label */}
      <span style={{ fontWeight: 600, fontSize: 16, minWidth: 200, whiteSpace: 'nowrap' }}>
        {rangeLabel}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* View toggle */}
      <div style={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
        <button style={view === 'week' ? segActive : segInactive} onClick={() => onViewChange('week')}>Week</button>
        <button style={view === 'day' ? segActive : segInactive} onClick={() => onViewChange('day')}>Day</button>
      </div>

      {/* New event */}
      <button style={primaryBtn} onClick={onNewEvent}>+ New event</button>

      {/* Theme toggle */}
      <button style={ghostBtn} onClick={onThemeToggle}>
        {theme === 'light' ? '◐ Graphite' : '◑ Light'}
      </button>
    </div>
  )
}
