'use client'
import React from 'react'
import { Category, CATEGORY_META, DEFAULT_ROUTINE_ITEMS } from '@/lib/types'

const WD_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface Props {
  weekStart: string
  weekDays: string[]
  summary: string
  goals: [string, string, string]
  routine: Record<string, boolean>
  weekRange: string
  onSummaryChange: (s: string) => void
  onGoalChange: (i: 0 | 1 | 2, v: string) => void
  onRoutineToggle: (key: string) => void
}

/* ── Themed planning card ─────────────────────────────────── */
function PlanCard({
  hue, icon, title, meta, watermark, children,
}: {
  hue: string; icon: string; title: string; meta?: React.ReactNode
  watermark: string; children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid var(--line)',
        borderTop: `3px solid rgba(${hue},0.85)`,
        background: `linear-gradient(135deg, rgba(${hue},var(--card-grad-alpha)), transparent 52%), var(--surface)`,
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
      {/* Watermark */}
      <div style={{
        position: 'absolute', top: -10, right: 10,
        fontSize: 92, opacity: 'var(--wm-opacity)' as string,
        transform: 'rotate(-8deg)', pointerEvents: 'none', zIndex: 0,
        lineHeight: 1,
      }}>
        {watermark}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: `rgba(${hue},0.16)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {icon}
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', flex: 1 }}>{title}</span>
          {meta}
        </div>
        {children}
      </div>
    </div>
  )
}

export default function PlanningPanel({
  weekStart, weekDays, summary, goals, routine, weekRange,
  onSummaryChange, onGoalChange, onRoutineToggle,
}: Props) {
  const textareaStyle: React.CSSProperties = {
    width: '100%', minHeight: 70, resize: 'vertical',
    border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px',
    background: 'var(--input-bg)', color: 'var(--text)',
    fontSize: 13, lineHeight: 1.5, outline: 'none',
    fontFamily: 'inherit',
  }

  const routineDone = DEFAULT_ROUTINE_ITEMS.reduce((acc, item) =>
    acc + weekDays.filter(d => routine[`${d}|${item.id}`]).length, 0)
  const routineTotal = DEFAULT_ROUTINE_ITEMS.length * 7

  const GOAL_PLACEHOLDERS = [
    'e.g. Run 3× this week (Mon / Wed / Fri, 30 min each)',
    'e.g. Finish Q3 deck draft and share by Friday 5pm',
    'e.g. Read "Deep Work" to chapter 5 by Sunday',
  ]

  return (
    <div style={{ padding: '8px 22px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Category legend */}
      <div style={{ padding: '12px 0 4px', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {(Object.entries(CATEGORY_META) as [Category, { icon: string; label: string }][]).map(([cat, { icon, label }]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            <span style={{
              display: 'inline-block', width: 11, height: 11, borderRadius: 3,
              background: `var(--cat-${cat}-bar)`,
            }} />
            <span style={{ fontSize: 12, color: 'var(--sub)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Weekly Summary */}
      <PlanCard
        hue="47,111,219" icon="📝" title="Weekly Summary" watermark="📝"
        meta={<span style={{ fontSize: 12, color: 'var(--sub)' }}>{weekRange}</span>}
      >
        <textarea
          style={textareaStyle}
          placeholder="Reflect on the week — top priorities, wins, what to improve…"
          value={summary}
          onChange={e => onSummaryChange(e.target.value)}
        />
      </PlanCard>

      {/* Routine + Goals row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>

        {/* Daily Routine */}
        <PlanCard
          hue="47,158,99" icon="🔁" title="Daily Routine" watermark="🔁"
          meta={
            <div style={{
              background: 'var(--accent)', color: 'var(--accent-text)',
              fontWeight: 700, fontSize: 12, borderRadius: 20, padding: '2px 10px',
            }}>
              {routineDone} / {routineTotal}
            </div>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px,1fr) repeat(7, 30px)',
              gap: '8px 6px', alignItems: 'center',
              minWidth: 340,
            }}>
              {/* Header row */}
              <div />
              {weekDays.map(d => {
                const date = new Date(d + 'T00:00:00')
                return (
                  <div key={d} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sub)' }}>
                      {WD_INITIALS[date.getDay()]}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{date.getDate()}</div>
                  </div>
                )
              })}

              {/* Item rows */}
              {DEFAULT_ROUTINE_ITEMS.map(item => (
                <React.Fragment key={item.id}>
                  <div style={{ fontSize: 13 }}>{item.label}</div>
                  {weekDays.map(d => {
                    const key = `${d}|${item.id}`
                    const checked = routine[key] ?? false
                    return (
                      <div
                        key={key}
                        onClick={() => onRoutineToggle(key)}
                        className={checked ? 'cb-checked' : ''}
                        style={{
                          width: 26, height: 26, borderRadius: 6,
                          border: checked ? 'none' : '1px solid var(--line)',
                          background: checked ? 'var(--accent)' : 'transparent',
                          color: checked ? 'var(--accent-text)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'transform 0.12s',
                          margin: '0 auto',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.12)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
                      >
                        {checked ? '✓' : ''}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </PlanCard>

        {/* SMART Goals */}
        <PlanCard
          hue="217,138,61" icon="🎯" title="SMART Goals" watermark="🎯"
          meta={<span style={{ fontSize: 12, color: 'var(--sub)' }}>3 for this week</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {([0, 1, 2] as const).map(i => (
              <div key={i}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sub)', marginBottom: 5 }}>
                  Goal {i + 1}
                </div>
                <textarea
                  style={{ ...textareaStyle, minHeight: 50 }}
                  placeholder={GOAL_PLACEHOLDERS[i]}
                  value={goals[i]}
                  onChange={e => onGoalChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </PlanCard>
      </div>
    </div>
  )
}
