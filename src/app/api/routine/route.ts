import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { routine } from '@/db/schema'

export async function GET() {
  const rows = db.select().from(routine).all()
  const result: Record<string, boolean> = {}
  for (const row of rows) result[row.id] = row.checked
  return NextResponse.json(result)
}

export async function PUT(req: Request) {
  const { key, checked }: { key: string; checked: boolean } = await req.json()
  const existing = db.select().from(routine).where(eq(routine.id, key)).get()
  if (existing) {
    db.update(routine).set({ checked }).where(eq(routine.id, key)).run()
  } else {
    db.insert(routine).values({ id: key, checked }).run()
  }
  return NextResponse.json({ ok: true })
}
