'use client'
import { CalEvent, Category, RepeatFreq, RemindLead, DAY_START, DAY_END, CATEGORY_META } from '@/lib/types'
import { formatHour } from '@/lib/utils'

const HALF_HOURS = Array.from({ length: (DAY_END - DAY_START) * 2 + 1 }, (_, i) => DAY_START + i * 0.5)
const CATEGORIES: Category[] = ['work', 'personal', 'health', 'focus', 'other']
const REPEAT_OPTS: { value: RepeatFreq; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Weekly on selected days' },
]
const REMIND_OPTS: { value: RemindLead; label: string }[] = [
  { value: 'none', label: 'No reminder' },
  { value: '0', label: 'At start of event' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
]
const WD_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface Props {
  ev: Partial<CalEvent>
  isEditing: boolean
  isRecurring: boolean
  onChange: (ev: Partial<CalEvent>) => void
  onSaveAll: () => void
  onSaveOccurrence: () => void
  onDelete: () => void
  onClose: () => void
}

export default function EventModal({ ev, isEditing, isRecurring, onChange, onSaveAll, onSaveOccurrence, onDelete, onClose }: Props) {
  const set = (patch: Partial<CalEvent>) => onChange({ ...ev, ...patch })
  const setRepeat = (patch: Partial<CalEvent['repeat']>) => set({ repeat: { ...ev.repeat!, ...patch } })
  const setRemind = (patch: Partial<CalEvent['remind']>) => set({ remind: { ...ev.remind!, ...patch } })

  const hasReminder = ev.remind?.lead !== 'none'
  const reminderHint = (() => {
    if (!hasReminder) return 'No reminder set — you can pick a time above.'
    const label = REMIND_OPTS.find(o => o.value === ev.remind?.lead)?.label ?? ''
    const via = [ev.remind?.push ? 'phone' : '', ev.remind?.email ? 'email' : ''].filter(Boolean).join(' & ')
    return via ? `Alert ${label.toLowerCase()} · via ${via}` : label
  })()

  const toggleRepeatDay = (wd: number) => {
    const days = ev.repeat?.days ?? []
    setRepeat({ days: days.includes(wd) ? days.filter(d => d !== wd) : [...days, wd] })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 11px',
    border: '1px solid var(--line)', borderRadius: 8,
    background: 'var(--input-bg)', color: 'var(--text)',
    fontSize: 14, outline: 'none',
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,17,21,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 440, width: '100%',
          background: 'var(--surface)', borderRadius: 14, padding: 22,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          border: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        {/* Title */}
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {isEditing ? 'Edit event' : 'New event'}
        </div>

        {/* Event title */}
        <input
          style={inputStyle}
          placeholder="Event title"
          value={ev.title ?? ''}
          onChange={e => set({ title: e.target.value })}
          autoFocus
        />

        {/* Day + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input
            type="date"
            style={inputStyle}
            value={ev.date ?? ''}
            onChange={e => set({ date: e.target.value })}
          />
          <select style={selectStyle} value={ev.category ?? 'other'} onChange={e => set({ category: e.target.value as Category })}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_META[c].icon}  {CATEGORY_META[c].label}</option>
            ))}
          </select>
        </div>

        {/* All-day toggle */}
        <div
          onClick={() => set({ allDay: !ev.allDay })}
          style={{
            border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>All-day event</div>
            <div style={{ fontSize: 12, color: 'var(--sub)' }}>No set time — appears in the all-day band</div>
          </div>
          <div
            className="switch-track"
            style={{ background: ev.allDay ? 'var(--accent)' : 'var(--line)' }}
          >
            <div
              className="switch-knob"
              style={{ left: ev.allDay ? 20 : 2 }}
            />
          </div>
        </div>

        {/* Start / End (hidden when all-day) */}
        {!ev.allDay && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select style={selectStyle} value={ev.start ?? 9} onChange={e => set({ start: parseFloat(e.target.value) })}>
              {HALF_HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
            <select style={selectStyle} value={ev.end ?? 10} onChange={e => set({ end: parseFloat(e.target.value) })}>
              {HALF_HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </div>
        )}

        {/* Repeat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            style={selectStyle}
            value={ev.repeat?.freq ?? 'none'}
            onChange={e => {
              const freq = e.target.value as RepeatFreq
              const wd = ev.date ? new Date(ev.date + 'T00:00:00').getDay() : 1
              setRepeat({ freq, days: freq === 'weekly' ? [wd] : [] })
            }}
          >
            {REPEAT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {ev.repeat?.freq === 'weekly' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {WD_LABELS.map((lbl, wd) => {
                const active = ev.repeat!.days.includes(wd)
                return (
                  <button
                    key={wd}
                    onClick={() => toggleRepeatDay(wd)}
                    style={{
                      width: 34, height: 34, borderRadius: '50%',
                      border: active ? 'none' : '1px solid var(--line)',
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--accent-text)' : 'var(--sub)',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    {lbl}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Reminder section */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            style={selectStyle}
            value={ev.remind?.lead ?? 'none'}
            onChange={e => setRemind({ lead: e.target.value as RemindLead })}
          >
            {REMIND_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['push', 'email'] as const).map(ch => {
              const active = ev.remind?.[ch] ?? false
              const lbl = ch === 'push' ? '📱 Phone alert' : '✉️ Email'
              return (
                <button
                  key={ch}
                  onClick={() => setRemind({ [ch]: !active })}
                  disabled={!hasReminder}
                  style={{
                    flex: 1, padding: '9px 10px', borderRadius: 8,
                    border: active ? 'none' : '1px solid var(--line)',
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--accent-text)' : 'var(--sub)',
                    fontWeight: 600, fontSize: 13, cursor: hasReminder ? 'pointer' : 'default',
                    opacity: hasReminder ? 1 : 0.45,
                    transition: 'background 0.12s',
                  }}
                >
                  {lbl}
                </button>
              )
            })}
          </div>

          {ev.remind?.email && (
            <input
              style={inputStyle}
              type="email"
              placeholder="Email address"
              value={ev.remind?.emailAddr ?? ''}
              onChange={e => setRemind({ emailAddr: e.target.value })}
            />
          )}

          <div style={{ fontSize: 11, color: 'var(--sub)' }}>{reminderHint}</div>
        </div>

        {/* Recurring notice */}
        {isEditing && isRecurring && (
          <div style={{ fontSize: 12, color: 'var(--sub)', background: 'var(--input-bg)', borderRadius: 8, padding: '8px 12px' }}>
            ↻ This is a recurring event. Save just this occurrence to move or change it without affecting the series.
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {isEditing && (
            <button
              onClick={onDelete}
              style={{ background: 'transparent', color: '#c0392b', border: '1px solid #c0392b', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              {isRecurring ? 'Delete series' : 'Delete event'}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          {isEditing && isRecurring ? (
            <>
              <button
                onClick={onSaveOccurrence}
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Save this occurrence
              </button>
              <button
                onClick={onSaveAll}
                style={{ background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Save all
              </button>
            </>
          ) : (
            <button
              onClick={onSaveAll}
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
