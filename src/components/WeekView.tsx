'use client'
import { CalEvent, Category, DAY_START, DAY_END, ROW_HEIGHT, CATEGORY_META } from '@/lib/types'
import { today, isoWeekday, formatHour, eventOccursOn, layoutEvents } from '@/lib/utils'

const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
const WEEK_DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function catStyle(cat: Category, prop: 'bg' | 'fg' | 'bar') {
  return `var(--cat-${cat}-${prop})`
}

interface EventChipProps {
  ev: CalEvent
  date: string
  onClick: (ev: CalEvent, date: string) => void
}

function AllDayChip({ ev, date, onClick }: EventChipProps) {
  const icon = CATEGORY_META[ev.category].icon
  const label = [
    ev.repeat.freq !== 'none' ? '↻' : '',
    ev.remind.lead !== 'none' ? '🔔' : '',
    icon, ev.title,
  ].filter(Boolean).join(' ')

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(ev, date) }}
      style={{
        background: catStyle(ev.category, 'bg'),
        color: catStyle(ev.category, 'fg'),
        borderLeft: `3px solid ${catStyle(ev.category, 'bar')}`,
        borderRadius: 4,
        padding: '2px 6px',
        fontSize: 11, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      {label}
    </div>
  )
}

interface TimedBlockProps {
  ev: CalEvent
  date: string
  col: number
  cols: number
  onClick: (ev: CalEvent, date: string) => void
}

function TimedBlock({ ev, date, col, cols, onClick }: TimedBlockProps) {
  const top = (ev.start - DAY_START) * ROW_HEIGHT
  const height = Math.max((ev.end - ev.start) * ROW_HEIGHT, 18)
  const left = `${(col / cols) * 100}%`
  const width = `${(1 / cols) * 100}%`
  const icon = CATEGORY_META[ev.category].icon
  const timeLine = [
    ev.repeat.freq !== 'none' ? '↻' : '',
    ev.remind.lead !== 'none' ? '🔔' : '',
    formatHour(ev.start),
  ].filter(Boolean).join(' ')

  return (
    <div
      onClick={() => onClick(ev, date)}
      style={{
        position: 'absolute', top, left, width, height,
        background: catStyle(ev.category, 'bg'),
        color: catStyle(ev.category, 'fg'),
        borderLeft: `3px solid ${catStyle(ev.category, 'bar')}`,
        borderRadius: 4, padding: '2px 5px',
        cursor: 'pointer', overflow: 'hidden',
        transition: 'transform 0.12s, box-shadow 0.12s',
        zIndex: 2,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = ''
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{icon} {ev.title}</div>
      {height > 28 && <div style={{ fontSize: 10, opacity: 0.8 }}>{timeLine}</div>}
    </div>
  )
}

interface Props {
  days: string[]
  events: Record<string, CalEvent>
  onDayClick: (d: string) => void
  onCellClick: (d: string, hour: number) => void
  onAllDayCellClick: (d: string) => void
  onEventClick: (ev: CalEvent, clickedDate: string) => void
}

export default function WeekView({ days, events, onDayClick, onCellClick, onAllDayCellClick, onEventClick }: Props) {
  const t = today()
  const allEvList = Object.values(events)

  const allDayFor = (d: string) =>
    allEvList.filter(ev => ev.allDay && eventOccursOn(ev, d))

  const timedFor = (d: string) =>
    allEvList.filter(ev => !ev.allDay && eventOccursOn(ev, d))

  // Returns a CSS background value for a day column that has all-day events
  const allDayTint = (d: string): string | undefined => {
    const evs = allDayFor(d)
    if (!evs.length) return undefined
    return `var(--cat-${evs[0].category}-bg)`
  }

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>

      {/* Header row */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 60, flexShrink: 0 }} />
        {days.map((d, i) => {
          const isToday = d === t
          const dateNum = new Date(d + 'T00:00:00').getDate()
          const tint = allDayTint(d)
          return (
            <div
              key={d}
              onClick={() => onDayClick(d)}
              style={{
                flex: 1, borderLeft: '1px solid var(--line)',
                textAlign: 'center', padding: '8px 4px',
                cursor: 'pointer',
                background: isToday ? 'var(--today-bg)' : tint,
                userSelect: 'none',
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, color: 'var(--sub)' }}>
                {WEEK_DAYS_SHORT[i]}
              </div>
              {isToday ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-text)', fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                  {dateNum}
                </div>
              ) : (
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{dateNum}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* All-day band */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', minHeight: 36, background: 'var(--today-bg)' }}>
        <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sub)' }}>all-day</span>
        </div>
        {days.map(d => (
          <div
            key={d}
            onClick={() => onAllDayCellClick(d)}
            style={{
              flex: 1, borderLeft: '1px solid var(--line)',
              padding: 4, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 2, minHeight: 36,
            }}
          >
            {allDayFor(d).map(ev => (
              <AllDayChip key={ev.id + d} ev={ev} date={d} onClick={onEventClick} />
            ))}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {/* Time gutter */}
        <div style={{ width: 60, flexShrink: 0, borderRight: '1px solid var(--line)', position: 'relative' }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: ROW_HEIGHT, position: 'relative' }}>
              <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 11, color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                {formatHour(h)}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d, di) => {
          const isToday = d === t
          const tint = allDayTint(d)
          const timedEvs = timedFor(d)
          const laid = layoutEvents(timedEvs)
          return (
            <div
              key={d}
              style={{ flex: 1, borderLeft: '1px solid var(--line)', position: 'relative', background: isToday ? 'var(--today-bg)' : tint }}
            >
              {/* Hour cells (clickable) */}
              {HOURS.map(h => (
                <div
                  key={h}
                  onClick={() => onCellClick(d, h)}
                  style={{ height: ROW_HEIGHT, borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}
                />
              ))}
              {/* Timed events */}
              {laid.map(({ ev, col, cols }) => (
                <TimedBlock key={ev.id + d + di} ev={ev} date={d} col={col} cols={cols} onClick={onEventClick} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
