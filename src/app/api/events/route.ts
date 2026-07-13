import { NextResponse } from 'next/server'
import { db } from '@/db'
import { events } from '@/db/schema'
import { CalEvent } from '@/lib/types'

function toRow(ev: CalEvent) {
  const now = new Date().toISOString()
  return {
    id: ev.id,
    title: ev.title,
    date: ev.date,
    allDay: ev.allDay,
    start: ev.start,
    end: ev.end,
    category: ev.category,
    repeatFreq: ev.repeat.freq,
    repeatDays: JSON.stringify(ev.repeat.days),
    exceptions: JSON.stringify(ev.exceptions ?? []),
    remindLead: ev.remind.lead,
    remindPush: ev.remind.push,
    remindEmail: ev.remind.email,
    remindEmailAddr: ev.remind.emailAddr,
    createdAt: now,
    updatedAt: now,
  }
}

function fromRow(row: typeof events.$inferSelect): CalEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    allDay: row.allDay,
    start: row.start ?? 0,
    end: row.end ?? 0,
    category: row.category as CalEvent['category'],
    repeat: {
      freq: row.repeatFreq as CalEvent['repeat']['freq'],
      days: row.repeatDays ? JSON.parse(row.repeatDays) : [],
    },
    exceptions: row.exceptions ? JSON.parse(row.exceptions) : [],
    remind: {
      lead: row.remindLead as CalEvent['remind']['lead'],
      push: row.remindPush,
      email: row.remindEmail,
      emailAddr: row.remindEmailAddr ?? '',
    },
  }
}

export async function GET() {
  const rows = db.select().from(events).all()
  const result: Record<string, CalEvent> = {}
  for (const row of rows) result[row.id] = fromRow(row)
  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const ev: CalEvent = await req.json()
  db.insert(events).values(toRow(ev)).run()
  return NextResponse.json({ ok: true })
}
