import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { weekGoals } from '@/db/schema'

export async function GET(_req: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params
  const row = db.select().from(weekGoals).where(eq(weekGoals.weekStart, weekStart)).get()
  return NextResponse.json({ goals: [row?.goal1 ?? '', row?.goal2 ?? '', row?.goal3 ?? ''] })
}

export async function PUT(req: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params
  const { goals }: { goals: [string, string, string] } = await req.json()
  const existing = db.select().from(weekGoals).where(eq(weekGoals.weekStart, weekStart)).get()
  if (existing) {
    db.update(weekGoals).set({ goal1: goals[0], goal2: goals[1], goal3: goals[2] })
      .where(eq(weekGoals.weekStart, weekStart)).run()
  } else {
    db.insert(weekGoals).values({ weekStart, goal1: goals[0], goal2: goals[1], goal3: goals[2] }).run()
  }
  return NextResponse.json({ ok: true })
}
