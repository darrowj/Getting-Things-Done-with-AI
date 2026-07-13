import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { events } from '@/db/schema'
import { CalEvent } from '@/lib/types'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ev: CalEvent = await req.json()
  const now = new Date().toISOString()
  db.update(events)
    .set({
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
      updatedAt: now,
    })
    .where(eq(events.id, id))
    .run()
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  db.delete(events).where(eq(events.id, id)).run()
  return NextResponse.json({ ok: true })
}
