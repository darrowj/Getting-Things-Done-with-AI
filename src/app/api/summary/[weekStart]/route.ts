import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { weekSummary } from '@/db/schema'

export async function GET(_req: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params
  const row = db.select().from(weekSummary).where(eq(weekSummary.weekStart, weekStart)).get()
  return NextResponse.json({ summary: row?.summary ?? '' })
}

export async function PUT(req: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params
  const { summary }: { summary: string } = await req.json()
  const existing = db.select().from(weekSummary).where(eq(weekSummary.weekStart, weekStart)).get()
  if (existing) {
    db.update(weekSummary).set({ summary }).where(eq(weekSummary.weekStart, weekStart)).run()
  } else {
    db.insert(weekSummary).values({ weekStart, summary }).run()
  }
  return NextResponse.json({ ok: true })
}
