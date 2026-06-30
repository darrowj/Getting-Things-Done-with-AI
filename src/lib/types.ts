export type Theme = 'light' | 'graphite'
export type View = 'week' | 'day'
export type RepeatFreq = 'none' | 'daily' | 'weekly'
export type RemindLead = 'none' | '0' | '5' | '15' | '30' | '60' | '1440'
export type Category = 'work' | 'personal' | 'health' | 'focus' | 'other'

export interface CalEvent {
  id: string
  title: string
  date: string
  allDay: boolean
  start: number
  end: number
  category: Category
  repeat: { freq: RepeatFreq; days: number[] }
  remind: { lead: RemindLead; push: boolean; email: boolean; emailAddr: string }
}

export interface RoutineItem {
  id: number
  label: string
  sortOrder: number
}

export interface AppState {
  view: View
  theme: Theme
  anchor: string
  selectedDay: string
  events: Record<string, CalEvent>
  routine: Record<string, boolean>
  summary: Record<string, string>
  goals: Record<string, [string, string, string]>
  editing: Partial<CalEvent> | null
}

export const DEFAULT_ROUTINE_ITEMS: RoutineItem[] = [
  { id: 0, label: 'Cold Plunge', sortOrder: 0 },
  { id: 1, label: 'Meditate', sortOrder: 1 },
  { id: 2, label: 'Take Vitamins', sortOrder: 2 },
  { id: 3, label: 'Back Stretch & PT', sortOrder: 3 },
  { id: 4, label: '30 min Reading', sortOrder: 4 },
]

export const CATEGORY_META: Record<Category, { icon: string; label: string }> = {
  work:     { icon: '💼', label: 'Work' },
  personal: { icon: '🏡', label: 'Personal' },
  health:   { icon: '🌿', label: 'Health' },
  focus:    { icon: '🎯', label: 'Focus' },
  other:    { icon: '📌', label: 'Other' },
}

export const DAY_START = 6
export const DAY_END = 22
export const ROW_HEIGHT = 44
