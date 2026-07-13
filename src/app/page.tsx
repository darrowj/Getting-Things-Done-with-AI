'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { CalEvent, Theme, View, DAY_START } from '@/lib/types'
import {
  today, startOfWeek, addDays, weekDays, formatWeekRange, formatDayLabel,
  uid, makeSeedEvents,
} from '@/lib/utils'
import Toolbar from '@/components/Toolbar'
import WeekView from '@/components/WeekView'
import DayView from '@/components/DayView'
import EventModal from '@/components/EventModal'
import PlanningPanel from '@/components/PlanningPanel'

const PREF_KEY = 'gtd.prefs.v1'   // localStorage — only for theme/view/nav (UI prefs, not data)

function emptyEvent(date: string, hour?: number, allDay = false): Partial<CalEvent> {
  return {
    id: uid(), title: '', date, allDay,
    start: hour ?? 9, end: (hour ?? 9) + 1,
    category: 'other',
    repeat: { freq: 'none', days: [] },
    exceptions: [],
    remind: { lead: 'none', push: false, email: false, emailAddr: '' },
  }
}

function useDebounce(fn: () => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(fn, ms)
  }, [fn, ms])
}

export default function Home() {
  const [theme, setTheme]           = useState<Theme>('light')
  const [view, setView]             = useState<View>('week')
  const [anchor, setAnchor]         = useState(today())
  const [selectedDay, setDay]       = useState(today())
  const [events, setEvents]         = useState<Record<string, CalEvent>>({})
  const [routine, setRoutine]       = useState<Record<string, boolean>>({})
  const [summary, setSummary]       = useState<Record<string, string>>({})
  const [goals, setGoals]           = useState<Record<string, [string, string, string]>>({})
  const [editing, setEditing]       = useState<Partial<CalEvent> | null>(null)
  const [sourceDate, setSourceDate] = useState<string | null>(null)
  const [hydrated, setHydrated]     = useState(false)

  // ── Load on mount ──────────────────────────────────────────
  useEffect(() => {
    // UI prefs from localStorage (theme, view, nav position)
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}')
      if (p.theme) setTheme(p.theme)
      if (p.view) setView(p.view)
      if (p.anchor) setAnchor(p.anchor)
      if (p.selectedDay) setDay(p.selectedDay)
    } catch {}

    // Data from SQLite via API
    async function load() {
      const [evRes, rtRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/routine'),
      ])
      const evData = await evRes.json()
      const rtData = await rtRes.json()

      if (Object.keys(evData).length === 0) {
        // Fresh DB — seed with demo events
        const seed = makeSeedEvents()
        await Promise.all(Object.values(seed).map(ev =>
          fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) })
        ))
        setEvents(seed)
      } else {
        setEvents(evData)
      }
      setRoutine(rtData)
      setHydrated(true)
    }
    load()
  }, [])

  // ── Persist UI prefs ────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(PREF_KEY, JSON.stringify({ theme, view, anchor, selectedDay }))
  }, [hydrated, theme, view, anchor, selectedDay])

  // ── Theme on <html> ─────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Derived ─────────────────────────────────────────────────
  const weekStart  = startOfWeek(anchor)
  const days       = weekDays(weekStart)
  const rangeLabel = view === 'week' ? formatWeekRange(weekStart) : formatDayLabel(selectedDay)
  const weekSummary = summary[weekStart] ?? ''
  const weekGoals   = goals[weekStart] ?? ['', '', '']

  // Load summary + goals when week changes
  useEffect(() => {
    if (!hydrated) return
    async function loadWeek() {
      const [sRes, gRes] = await Promise.all([
        fetch(`/api/summary/${weekStart}`),
        fetch(`/api/goals/${weekStart}`),
      ])
      const { summary: s } = await sRes.json()
      const { goals: g }   = await gRes.json()
      setSummary(prev => ({ ...prev, [weekStart]: s }))
      setGoals(prev => ({ ...prev, [weekStart]: g }))
    }
    loadWeek()
  }, [hydrated, weekStart])

  // ── Navigation ───────────────────────────────────────────────
  const goNext  = () => {
    if (view === 'week') setAnchor(addDays(anchor, 7))
    else { const nd = addDays(selectedDay, 1); setDay(nd); setAnchor(nd) }
  }
  const goPrev  = () => {
    if (view === 'week') setAnchor(addDays(anchor, -7))
    else { const nd = addDays(selectedDay, -1); setDay(nd); setAnchor(nd) }
  }
  const goToday = () => { const t = today(); setAnchor(t); setDay(t) }

  // ── Modal open ───────────────────────────────────────────────
  const openNew  = useCallback((date: string, hour?: number, allDay = false) => {
    setSourceDate(date)
    setEditing(emptyEvent(date, hour, allDay))
  }, [])

  const openEdit = useCallback((ev: CalEvent, clickedDate: string) => {
    setSourceDate(clickedDate)
    const occurrenceDate = ev.repeat.freq === 'none' ? ev.date : clickedDate
    setEditing({ ...ev, date: occurrenceDate })
  }, [])

  // ── Save / Delete ────────────────────────────────────────────
  const persistEvent = async (ev: CalEvent, isNew: boolean) => {
    const method = isNew ? 'POST' : 'PUT'
    const url    = isNew ? '/api/events' : `/api/events/${ev.id}`
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) })
  }

  const handleSaveAll = async () => {
    if (!editing?.title?.trim()) return
    const ev = { ...editing } as CalEvent
    if (!ev.allDay && ev.end <= ev.start) ev.end = ev.start + 0.5
    const isNew = !events[ev.id]
    setEvents(prev => ({ ...prev, [ev.id]: ev }))
    setEditing(null)
    setAnchor(ev.date)
    setDay(ev.date)
    await persistEvent(ev, isNew)
  }

  const handleSaveOccurrence = async () => {
    if (!editing?.title?.trim()) return
    const ev = { ...editing } as CalEvent
    if (!ev.allDay && ev.end <= ev.start) ev.end = ev.start + 0.5

    const series = events[ev.id]              // original, unedited series
    const skipDate = sourceDate               // the occurrence that was opened

    const standalone: CalEvent = { ...ev, id: uid(), repeat: { freq: 'none', days: [] }, exceptions: [] }

    let updatedSeries: CalEvent | null = null
    if (series && series.repeat.freq !== 'none' && skipDate && !series.exceptions?.includes(skipDate)) {
      updatedSeries = { ...series, exceptions: [...(series.exceptions ?? []), skipDate] }
    }

    setEvents(prev => {
      const next = { ...prev, [standalone.id]: standalone }
      if (updatedSeries) next[updatedSeries.id] = updatedSeries
      return next
    })
    setEditing(null)
    setAnchor(standalone.date)
    setDay(standalone.date)

    await persistEvent(standalone, true)
    if (updatedSeries) await persistEvent(updatedSeries, false)
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    const id = editing.id
    setEvents(prev => { const n = { ...prev }; delete n[id]; return n })
    setEditing(null)
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
  }

  // ── Routine toggle ───────────────────────────────────────────
  const toggleRoutine = async (key: string) => {
    const checked = !routine[key]
    setRoutine(prev => ({ ...prev, [key]: checked }))
    await fetch('/api/routine', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, checked }),
    })
  }

  // ── Summary (debounced — save 800ms after typing stops) ─────
  const saveSummaryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateSummary = (s: string) => {
    setSummary(prev => ({ ...prev, [weekStart]: s }))
    if (saveSummaryRef.current) clearTimeout(saveSummaryRef.current)
    saveSummaryRef.current = setTimeout(() => {
      fetch(`/api/summary/${weekStart}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: s }),
      })
    }, 800)
  }

  // ── Goals (debounced) ────────────────────────────────────────
  const saveGoalsRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateGoal = (i: 0 | 1 | 2, v: string) => {
    const cur: [string, string, string] = [...(goals[weekStart] ?? ['', '', ''])] as [string, string, string]
    cur[i] = v
    setGoals(prev => ({ ...prev, [weekStart]: cur }))
    if (saveGoalsRef.current) clearTimeout(saveGoalsRef.current)
    saveGoalsRef.current = setTimeout(() => {
      fetch(`/api/goals/${weekStart}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: cur }),
      })
    }, 800)
  }

  const switchToDay = (d: string) => { setDay(d); setView('day') }

  const isRecurring = editing?.repeat?.freq !== 'none'
  const isEditing   = !!editing?.id && !!events[editing.id]

  if (!hydrated) return null

  return (
    <div data-theme={theme} className="app-bg" style={{ minHeight: '100vh' }}>
      <Toolbar
        view={view} theme={theme} rangeLabel={rangeLabel}
        onPrev={goPrev} onNext={goNext} onToday={goToday}
        onViewChange={setView}
        onThemeToggle={() => setTheme(t => t === 'light' ? 'graphite' : 'light')}
        onNewEvent={() => openNew(view === 'day' ? selectedDay : today(), DAY_START)}
      />

      <div style={{ padding: '16px 22px 4px' }}>
        {view === 'week' ? (
          <WeekView
            days={days} events={events}
            onDayClick={switchToDay}
            onCellClick={(d, h) => openNew(d, h)}
            onAllDayCellClick={d => openNew(d, undefined, true)}
            onEventClick={(ev, clickedDate) => openEdit(ev, clickedDate)}
          />
        ) : (
          <DayView
            day={selectedDay} events={events}
            onCellClick={(d, h) => openNew(d, h)}
            onAllDayCellClick={d => openNew(d, undefined, true)}
            onEventClick={(ev) => openEdit(ev, selectedDay)}
          />
        )}
      </div>

      <PlanningPanel
        weekStart={weekStart} weekDays={days}
        summary={weekSummary} goals={weekGoals} routine={routine}
        weekRange={formatWeekRange(weekStart)}
        onSummaryChange={updateSummary}
        onGoalChange={updateGoal}
        onRoutineToggle={toggleRoutine}
      />

      {editing && (
        <EventModal
          ev={editing}
          isEditing={isEditing} isRecurring={isRecurring}
          onChange={setEditing}
          onSaveAll={handleSaveAll}
          onSaveOccurrence={handleSaveOccurrence}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
