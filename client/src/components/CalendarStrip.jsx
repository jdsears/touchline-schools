import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const ROLE_DOTS = {
  schoolAdmin: 'var(--brand-primary)',
  hod: 'var(--text-secondary)',
  teacherCurriculum: 'var(--status-info)',
  teacherExtraCurricular: 'var(--brand-accent)',
}

const ROLE_TAG = {
  schoolAdmin: 'ADMIN',
  hod: 'HOD',
  teacherCurriculum: 'CURRICULUM',
  teacherExtraCurricular: 'EXTRA',
}

export function CalendarStrip({ events = [] }) {
  const start = 8, end = 18, hourW = 80
  const hours = end - start
  const totalW = hours * hourW
  const now = new Date()
  const nowHour = now.getHours() + now.getMinutes() / 60
  const nowX = Math.max(0, Math.min((nowHour - start) * hourW, totalW))
  const nowLabel = `NOW · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div className="relative overflow-x-auto pb-2">
      <div className="flex pb-1.5 mb-[10px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {Array.from({ length: hours + 1 }).map((_, i) => (
          <div key={i} style={{ width: hourW, fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}>
            {String(start + i).padStart(2, '0')}:00
          </div>
        ))}
      </div>
      <div className="relative" style={{ height: 56, width: totalW }}>
        {Array.from({ length: hours }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0" style={{ left: i * hourW, width: 1, background: 'var(--border-subtle)' }} />
        ))}
        {nowHour >= start && nowHour <= end && (
          <div className="absolute z-[2]" style={{ left: nowX, top: -6, bottom: -6, width: 2, background: 'var(--status-error)' }}>
            <div className="absolute" style={{ top: -8, left: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--status-error)' }} />
            <div className="absolute whitespace-nowrap" style={{
              top: -22, left: -16, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              color: 'var(--status-error)', fontFamily: 'var(--font-mono)',
            }}>{nowLabel}</div>
          </div>
        )}
        {events.map((ev, i) => {
          const left = (ev.start - start) * hourW
          const width = Math.max((ev.end - ev.start) * hourW - 6, 40)
          const dotColor = ROLE_DOTS[ev.role] || 'var(--text-secondary)'
          const isPast = ev.end <= nowHour
          const Block = ev.href ? Link : 'div'
          const linkProps = ev.href ? { to: ev.href, title: ev.label } : {}
          return (
            <Block key={ev.id || i} {...linkProps} className="absolute flex items-center gap-1.5 overflow-hidden no-underline" style={{
              left, top: (ev.lane || 0) * 28, width, height: 26,
              borderRadius: 'var(--radius-sm)',
              background: isPast ? 'var(--surface-sunken)' : 'var(--surface-card)',
              border: `1px solid ${isPast ? 'var(--border-subtle)' : 'var(--border-default)'}`,
              borderLeft: `3px solid ${dotColor}`,
              padding: '3px 8px', opacity: isPast ? 0.55 : 1,
              fontSize: 11.5, color: 'var(--text-primary)', fontWeight: 600,
            }}>
              <span className="truncate">{ev.label}</span>
            </Block>
          )
        })}
      </div>
    </div>
  )
}

function ActionRow({ action: a }) {
  const Row = a.href ? Link : 'div'
  const linkProps = a.href ? { to: a.href } : {}
  const pillBg = a.urgency === 'high' ? 'var(--status-error-tint)' : a.urgency === 'medium' ? 'var(--status-warning-tint)' : 'var(--surface-sunken)'
  const pillFg = a.urgency === 'high' ? 'var(--status-error)' : a.urgency === 'medium' ? 'var(--status-warning)' : 'var(--text-secondary)'
  return (
    <Row {...linkProps}
      className={`flex items-center gap-3 py-[10px] px-[14px] no-underline transition-colors ${a.href ? 'hover:bg-[var(--surface-card)]' : ''}`}
      style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ROLE_DOTS[a.role] || 'var(--text-tertiary)' }} />
      <span className="shrink-0 w-16 text-[9.5px] font-bold tracking-[0.06em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
        {ROLE_TAG[a.role] || ''}
      </span>
      <span className="flex-1 min-w-0 text-[13.5px] truncate" style={{ color: 'var(--text-primary)' }}>
        <strong className="font-semibold">{a.verb}</strong>
        <span style={{ color: 'var(--text-secondary)' }}> · {a.subject}</span>
      </span>
      {a.deadline && (
        <span className="text-[12px] font-semibold px-[10px] py-[3px] rounded-full whitespace-nowrap"
          style={{ background: pillBg, color: pillFg }}>
          {a.deadline}
        </span>
      )}
      {a.href && <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />}
    </Row>
  )
}

export function AttentionQueue({ actions = [], limit = 5, showAll = false }) {
  if (!actions.length) {
    return (
      <div className="py-4 text-center">
        <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>Nothing needs your attention right now.</p>
      </div>
    )
  }

  const visible = showAll ? actions : actions.slice(0, limit)
  return (
    <div>
      {visible.map((a, i) => <ActionRow key={a.id || i} action={a} />)}
    </div>
  )
}

export { ROLE_DOTS, ROLE_TAG }
