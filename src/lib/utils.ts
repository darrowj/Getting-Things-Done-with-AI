import { CalEvent } from './types'

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function isoWeekday(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

export function formatHour(h: number): string {
  const hour = Math.floor(h)
  const min = h % 1 !== 0 ? '30' : '00'
  const ampm = hour < 12 ? 'AM' : 'PM'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${min} ${ampm}`
}

export function formatWeekRange(weekStart: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(weekStart + 'T00:00:00')
  e.setDate(e.getDate() + 6)
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`
}

export function formatDayLabel(dateStr: string): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const d = new Date(dateStr + 'T00:00:00')
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function formatDayHeader(dateStr: string): { weekday: string; month: string; day: number; year: number } {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const d = new Date(dateStr + 'T00:00:00')
  return { weekday: days[d.getDay()], month: months[d.getMonth()], day: d.getDate(), year: d.getFullYear() }
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function eventOccursOn(ev: CalEvent, dateStr: string): boolean {
  if (ev.repeat.freq === 'none') return ev.date === dateStr
  if (ev.exceptions?.includes(dateStr)) return false
  if (ev.repeat.freq === 'daily') return true
  if (ev.repeat.freq === 'weekly') {
    const wd = new Date(dateStr + 'T00:00:00').getDay()
    return ev.repeat.days.includes(wd)
  }
  return false
}

export interface LayoutEvent {
  ev: CalEvent
  col: number
  cols: number
}

export function layoutEvents(events: CalEvent[]): LayoutEvent[] {
  const timed = events.filter(e => !e.allDay).sort((a, b) => a.start - b.start)
  const result: LayoutEvent[] = []
  const clusters: CalEvent[][] = []

  for (const ev of timed) {
    let placed = false
    for (const cluster of clusters) {
      if (cluster.some(c => c.start < ev.end && ev.start < c.end)) {
        cluster.push(ev)
        placed = true
        break
      }
    }
    if (!placed) clusters.push([ev])
  }

  for (const cluster of clusters) {
    const cols = cluster.length
    cluster.forEach((ev, col) => result.push({ ev, col, cols }))
  }

  return result
}

export function makeSeedEvents(): Record<string, CalEvent> {
  const t = today()
  const ws = startOfWeek(t)
  const tomorrow = addDays(t, 1)
  const events: Record<string, CalEvent> = {}

  const add = (ev: CalEvent) => { events[ev.id] = ev }

  add({
    id: uid(), title: 'Drive to CT — help Mom', date: tomorrow,
    allDay: true, start: 0, end: 0, category: 'personal',
    repeat: { freq: 'none', days: [] },
    exceptions: [],
    remind: { lead: 'none', push: false, email: false, emailAddr: '' },
  })

  add({
    id: uid(), title: 'Gym', date: ws,
    allDay: false, start: 12, end: 13, category: 'health',
    repeat: { freq: 'weekly', days: [1, 3, 5] },
    exceptions: [],
    remind: { lead: 'none', push: false, email: false, emailAddr: '' },
  })

  add({
    id: uid(), title: 'Library', date: ws,
    allDay: false, start: 14, end: 15, category: 'focus',
    repeat: { freq: 'weekly', days: [3] },
    exceptions: [],
    remind: { lead: 'none', push: false, email: false, emailAddr: '' },
  })

  return events
}
