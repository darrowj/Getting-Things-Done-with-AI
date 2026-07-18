'use client'
import { useEffect, useState, type ReactNode } from 'react'
import type {
  BriefEmail,
  BriefJobItem,
  BriefNetworkItem,
  BriefScheduleItem,
  BriefTask,
  DailyBrief,
  DailyBriefResponse,
} from '@/lib/types'

const HUE = '220, 38, 38' // bright red

function formatHeaderDate(iso: string, dayOfWeek: string): string {
  const d = new Date(iso + 'T12:00:00')
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return `${dayOfWeek}, ${monthDay}`
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: 'var(--sub)',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 8,
      border: '1px solid var(--line)',
      background: 'var(--input-bg)',
      fontSize: 13,
      lineHeight: 1.45,
    }}>
      {children}
    </div>
  )
}

function urgencyColor(u: BriefEmail['urgency']): string {
  if (u === 'Urgent') return `rgba(${HUE},0.85)`
  if (u === 'Soon') return 'rgba(217,138,61,0.95)'
  return 'var(--sub)'
}

export default function DailyBriefPanel() {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'empty'; message: string }
    | { status: 'ready'; brief: DailyBrief }
    | { status: 'error'; message: string }
  >({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/brief', { cache: 'no-store' })
        const data = (await res.json()) as DailyBriefResponse
        if (cancelled) return
        if (data.ok) {
          setState({ status: 'ready', brief: data.brief })
        } else {
          setState({ status: 'empty', message: data.message })
        }
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Could not load daily brief' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  const titleMeta = (() => {
    if (state.status === 'ready') {
      return formatHeaderDate(state.brief.date, state.brief.dayOfWeek)
    }
    return null
  })()

  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid var(--line)',
        borderTop: `3px solid rgba(${HUE},0.85)`,
        background: `linear-gradient(135deg, rgba(${HUE},var(--card-grad-alpha)), transparent 52%), var(--surface)`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{
        position: 'absolute', top: -10, right: 10,
        fontSize: 92, opacity: 'var(--wm-opacity)' as string,
        transform: 'rotate(-8deg)', pointerEvents: 'none', zIndex: 0,
        lineHeight: 1,
      }}>
        🎣
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: `rgba(${HUE},0.16)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            🎣
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', flex: 1 }}>
            {titleMeta ? `Daily Brief — ${titleMeta}` : 'Daily Brief'}
          </span>
        </div>

        {state.status === 'loading' && (
          <div style={{ fontSize: 13, color: 'var(--sub)' }}>Loading…</div>
        )}

        {(state.status === 'empty' || state.status === 'error') && (
          <div style={{
            padding: '14px 12px',
            borderRadius: 8,
            border: '1px dashed var(--line)',
            background: 'var(--input-bg)',
            fontSize: 13,
            color: 'var(--sub)',
            lineHeight: 1.5,
          }}>
            {state.message}. Run <code style={{ fontSize: 12 }}>data/daily_brief.py</code> on the
            Linux box (weekdays ~7:00 AM) to generate today’s brief.
          </div>
        )}

        {state.status === 'ready' && <BriefBody brief={state.brief} />}
      </div>
    </div>
  )
}

function BriefBody({ brief }: { brief: DailyBrief }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {brief.mostImportant && (
        <Section title="Most important">
          <Row>
            <span style={{ fontWeight: 600 }}>{brief.mostImportant}</span>
          </Row>
        </Section>
      )}

      {brief.schedule && brief.schedule.length > 0 && (
        <Section title="Schedule">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.schedule.map((ev: BriefScheduleItem, i) => (
              <Row key={`${ev.time}-${ev.title}-${i}`}>
                <span style={{ color: 'var(--sub)', fontWeight: 600, marginRight: 8 }}>{ev.time}</span>
                <span style={{ fontWeight: 600 }}>{ev.title}</span>
                {ev.attendees && ev.attendees.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--sub)' }}>
                    {ev.attendees.join(', ')}
                  </div>
                )}
              </Row>
            ))}
          </div>
        </Section>
      )}

      {brief.emails && brief.emails.length > 0 && (
        <Section title="Unread email">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.emails.map((em: BriefEmail, i) => (
              <Row key={`${em.from}-${em.subject}-${i}`}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.04em', color: urgencyColor(em.urgency), marginRight: 8,
                }}>
                  {em.urgency}
                </span>
                <span style={{ fontWeight: 600 }}>{em.subject}</span>
                <div style={{ marginTop: 3, fontSize: 12, color: 'var(--sub)' }}>{em.from}</div>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {brief.tasks && (brief.tasks.dueTodayOrOverdue?.length || brief.tasks.dueLaterThisWeek?.length) ? (
        <Section title="Tasks">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {brief.tasks.dueTodayOrOverdue && brief.tasks.dueTodayOrOverdue.length > 0 && (
              <TaskGroup label="Due today / overdue" tasks={brief.tasks.dueTodayOrOverdue} />
            )}
            {brief.tasks.dueLaterThisWeek && brief.tasks.dueLaterThisWeek.length > 0 && (
              <TaskGroup label="Later this week" tasks={brief.tasks.dueLaterThisWeek} />
            )}
          </div>
        </Section>
      ) : null}

      {brief.networking && brief.networking.length > 0 && (
        <Section title="Networking">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.networking.map((n: BriefNetworkItem, i) => (
              <Row key={`${n.name}-${i}`}>
                <div style={{ fontWeight: 600 }}>{n.name}</div>
                <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>{n.why}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Next: {n.nextStep}</div>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {brief.jobTracker && brief.jobTracker.length > 0 && (
        <Section title="Job tracker">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.jobTracker.map((j: BriefJobItem, i) => (
              <Row key={`${j.company}-${i}`}>
                <span style={{ fontWeight: 600 }}>{j.company}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--sub)' }}>{j.stage}</span>
                <div style={{ fontSize: 12, marginTop: 4 }}>Next: {j.nextAction}</div>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {brief.actionItems && brief.actionItems.length > 0 && (
        <Section title="Action items">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {brief.actionItems.map((item, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.45 }}>{item}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function TaskGroup({ label, tasks }: { label: string; tasks: BriefTask[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sub)' }}>{label}</div>
      {tasks.map((t, i) => (
        <Row key={`${t.name}-${i}`}>
          <span style={{ fontWeight: 600 }}>
            {t.highPriority && (
              <span style={{ color: `rgba(${HUE},0.95)`, marginRight: 6 }}>HIGH</span>
            )}
            {t.name}
          </span>
          <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 3 }}>
            {[t.due && `Due ${t.due}`, t.project, t.priority].filter(Boolean).join(' · ')}
          </div>
        </Row>
      ))}
    </div>
  )
}
