'use client'
import { CalEvent, Category, DAY_START, DAY_END, ROW_HEIGHT, CATEGORY_META } from '@/lib/types'
import { today, formatHour, formatDayHeader, eventOccursOn, layoutEvents } from '@/lib/utils'

const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
const ROW_H = Math.round(ROW_HEIGHT * 1.35)

function catStyle(cat: Category, prop: 'bg' | 'fg' | 'bar') {
  return `var(--cat-${cat}-${prop})`
}

interface Props {
  day: string
  events: Record<string, CalEvent>
  onCellClick: (d: string, hour: number) => void
  onAllDayCellClick: (d: string) => void
  onEventClick: (ev: CalEvent) => void
}

export default function DayView({ day, events, onCellClick, onAllDayCellClick, onEventClick }: Props) {
  const t = today()
  const allEvList = Object.values(events)
  const allDayEvs = allEvList.filter(ev => ev.allDay && eventOccursOn(ev, day))
  const timedEvs = allEvList.filter(ev => !ev.allDay && eventOccursOn(ev, day))
  const laid = layoutEvents(timedEvs)
  const { weekday, month, day: dayNum, year } = formatDayHeader(day)

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--line)', padding: '10px 16px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{weekday}, {month} {dayNum}</span>
        <span style={{ fontSize: 12, color: 'var(--sub)' }}>{year}</span>
      </div>

      {/* All-day band */}
      <div style={{ borderBottom: '1px solid var(--line)', minHeight: 36, background: 'var(--today-bg)', display: 'flex' }}>
        <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sub)' }}>all-day</span>
        </div>
        <div
          onClick={() => onAllDayCellClick(day)}
          style={{ flex: 1, padding: 4, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 36 }}
        >
          {allDayEvs.map(ev => {
            const icon = CATEGORY_META[ev.category].icon
            return (
              <div
                key={ev.id}
                onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                style={{
                  background: catStyle(ev.category, 'bg'),
                  color: catStyle(ev.category, 'fg'),
                  borderLeft: `3px solid ${catStyle(ev.category, 'bar')}`,
                  borderRadius: 4, padding: '2px 6px',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {ev.repeat.freq !== 'none' ? '↻ ' : ''}{ev.remind.lead !== 'none' ? '🔔 ' : ''}{icon} {ev.title}
              </div>
            )
          })}
        </div>
      </div>

      {/* Time grid */}
      <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        {/* Gutter */}
        <div style={{ width: 60, flexShrink: 0, borderRight: '1px solid var(--line)', position: 'relative' }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: ROW_H, position: 'relative' }}>
              <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 11, color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                {formatHour(h)}
              </span>
            </div>
          ))}
        </div>

        {/* Single column */}
        <div style={{ flex: 1, position: 'relative', background: day === t ? 'var(--today-bg)' : undefined }}>
          {HOURS.map(h => (
            <div
              key={h}
              onClick={() => onCellClick(day, h)}
              style={{ height: ROW_H, borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}
            />
          ))}
          {laid.map(({ ev, col, cols }) => {
            const top = (ev.start - DAY_START) * ROW_H
            const height = Math.max((ev.end - ev.start) * ROW_H, 22)
            const left = `${(col / cols) * 100}%`
            const width = `${(1 / cols) * 100}%`
            const icon = CATEGORY_META[ev.category].icon
            const timeLine = [
              ev.repeat.freq !== 'none' ? '↻' : '',
              ev.remind.lead !== 'none' ? '🔔' : '',
              `${formatHour(ev.start)} · ${CATEGORY_META[ev.category].label}`,
            ].filter(Boolean).join(' ')

            return (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                style={{
                  position: 'absolute', top, left, width, height,
                  background: catStyle(ev.category, 'bg'),
                  color: catStyle(ev.category, 'fg'),
                  borderLeft: `3px solid ${catStyle(ev.category, 'bar')}`,
                  borderRadius: 4, padding: '3px 7px',
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
                <div style={{ fontSize: 13, fontWeight: 700 }}>{icon} {ev.title}</div>
                {height > 32 && <div style={{ fontSize: 11, opacity: 0.8 }}>{timeLine}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
