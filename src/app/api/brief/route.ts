import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { DailyBrief } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function todayEastern(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'daily-brief.json')
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const brief = JSON.parse(raw) as DailyBrief
    const today = todayEastern()

    if (!brief.date || brief.date !== today) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'stale',
          today,
          briefDate: brief.date ?? null,
          message: 'No brief generated for today',
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        },
      )
    }

    return NextResponse.json(
      { ok: true, brief },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return NextResponse.json(
        {
          ok: false,
          reason: 'missing',
          today: todayEastern(),
          briefDate: null,
          message: 'No brief generated for today',
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        },
      )
    }
    console.error('Failed to read daily brief:', err)
    return NextResponse.json(
      { ok: false, reason: 'error', message: 'Failed to read daily brief' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  }
}
