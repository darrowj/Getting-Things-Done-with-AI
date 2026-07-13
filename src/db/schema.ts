import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date').notNull(),           // YYYY-MM-DD
  allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
  start: real('start'),                   // decimal hour e.g. 9.5 = 9:30 AM
  end: real('end'),
  category: text('category').notNull().default('other'),
  repeatFreq: text('repeat_freq').notNull().default('none'),  // none | daily | weekly
  repeatDays: text('repeat_days'),        // JSON array of weekday numbers e.g. [1,3,5]
  exceptions: text('exceptions'),         // JSON array of YYYY-MM-DD the series skips
  remindLead: text('remind_lead').notNull().default('none'),  // none | 0 | 5 | 15 | 30 | 60 | 1440
  remindPush: integer('remind_push', { mode: 'boolean' }).notNull().default(false),
  remindEmail: integer('remind_email', { mode: 'boolean' }).notNull().default(false),
  remindEmailAddr: text('remind_email_addr'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const routine = sqliteTable('routine', {
  id: text('id').primaryKey(),            // "<dayISO>|<itemIndex>"
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
})

export const routineItems = sqliteTable('routine_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const weekSummary = sqliteTable('week_summary', {
  weekStart: text('week_start').primaryKey(),  // ISO date of Monday
  summary: text('summary').notNull().default(''),
})

export const weekGoals = sqliteTable('week_goals', {
  weekStart: text('week_start').primaryKey(),
  goal1: text('goal1').notNull().default(''),
  goal2: text('goal2').notNull().default(''),
  goal3: text('goal3').notNull().default(''),
})
