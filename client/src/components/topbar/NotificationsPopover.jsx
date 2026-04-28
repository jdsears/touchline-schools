import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, Flag, Sparkles, Info, X, Check } from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import Popover from './Popover'
import { useTopBarNotifications, NOTIF_CLASS } from '../../hooks/useTopBarNotifications'

const CLASS_ICON = {
  A: AlertTriangle,
  B: Flag,
  C: Sparkles,
  D: Info,
}

const CLASS_TINT = {
  A: { rail: 'var(--brand-accent)', dot: 'var(--status-error)', icon: 'var(--status-error)' },
  B: { rail: 'var(--brand-accent)', dot: 'var(--status-warning)', icon: 'var(--status-warning)' },
  C: { rail: 'transparent', dot: 'var(--text-tertiary)', icon: 'var(--text-secondary)' },
  D: { rail: 'transparent', dot: 'var(--text-tertiary)', icon: 'var(--status-info)' },
}

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'action', label: 'Action', match: r => r.klass === NOTIF_CLASS.A },
  { id: 'flagged', label: 'Flagged', match: r => r.klass === NOTIF_CLASS.B },
]

function bucketOf(date) {
  if (!date) return 'earlier'
  const d = new Date(date)
  if (isToday(d)) return 'today'
  if (isYesterday(d)) return 'yesterday'
  return 'earlier'
}
const BUCKET_LABEL = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' }

function NotifRow({ row, onDismiss, onMarkRead }) {
  const Icon = CLASS_ICON[row.klass] || Bell
  const tint = CLASS_TINT[row.klass]
  const time = row.createdAt
    ? formatDistanceToNow(new Date(row.createdAt), { addSuffix: false })
        .replace('about ', '').replace('less than a minute', '<1m').replace(' minutes', 'm').replace(' hours', 'h').replace(' days', 'd')
    : ''
  const isAction = row.klass === NOTIF_CLASS.A

  // Hover-mark exempts Class A so passive engagement doesn't clear the only
  // persistent cue that an action is still pending — same rationale as the
  // 500ms passive read in useTopBarNotifications.markPassiveRead.
  const handleHover = () => {
    if (row.unread && row.klass !== NOTIF_CLASS.A) onMarkRead(row)
  }

  return (
    <div className="relative group flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-[var(--surface-sunken)]"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
      onMouseEnter={handleHover}
    >
      {/* Unread rail (3px brand-accent), spec §8.4 */}
      {row.unread && (
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: tint.rail }} />
      )}
      <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full"
        style={{ background: 'var(--surface-sunken)', color: tint.icon }}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="text-[12.5px] font-semibold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
            {row.title}
          </div>
          <div className="ml-auto shrink-0 text-[10.5px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {time}
          </div>
        </div>
        <div className="text-[12px] leading-snug mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {row.message}
        </div>
        {isAction && row.actionLabel && row.actionHref && (
          <Link to={row.actionHref}
            // Click on the action button is definitive engagement — mark this
            // Class A row read so the badge and rail clear once the user is
            // committed to handling it. (Auto / hover do NOT clear Class A.)
            onClick={() => row.unread && onMarkRead(row)}
            className="inline-flex items-center mt-1.5 px-2 py-[3px] rounded-[var(--radius-sm)] text-[11.5px] font-semibold transition-colors"
            style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
            {row.actionLabel}
          </Link>
        )}
      </div>
      <button onClick={() => onDismiss(row)}
        aria-label="Dismiss"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-5 h-5 rounded-full transition-opacity"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        <X size={11} />
      </button>
    </div>
  )
}

function GroupHeader({ label }) {
  return (
    <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.08em] uppercase"
      style={{ color: 'var(--text-tertiary)', background: 'var(--surface-card)' }}>
      {label}
    </div>
  )
}

function Empty() {
  return (
    <div className="px-6 py-9 text-center" style={{ color: 'var(--text-secondary)' }}>
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
        style={{ background: 'var(--brand-accent-tint)', color: 'var(--text-on-tint)' }}>
        <Check size={18} />
      </div>
      <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>You're up to date</div>
      <div className="text-[12px] mt-1">Nothing needs your attention right now.</div>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div className="px-4 py-6 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--status-error)' }}>Couldn't load notifications</div>
      <button onClick={onRetry} className="text-[12px] underline" style={{ color: 'var(--brand-primary)' }}>Retry</button>
    </div>
  )
}

export default function NotificationsPopover({ isAdmin = false, isHoD = false, isMobile = false }) {
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const { rows, loading, error, counts, reload, dismiss, markRead, markAllRead, markPassiveRead } = useTopBarNotifications({ isAdmin, isHoD })

  // Auto-clear visual noise 500ms after open, per spec §8.4. Class A is exempt
  // — see useTopBarNotifications.markPassiveRead for the rationale.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => { markPassiveRead() }, 500)
    return () => clearTimeout(t)
  }, [open, markPassiveRead])

  const filterFn = FILTERS.find(f => f.id === filter)?.match || (() => true)
  const filtered = useMemo(() => rows.filter(filterFn), [rows, filter])

  const grouped = useMemo(() => {
    const buckets = { today: [], yesterday: [], earlier: [] }
    for (const r of filtered) buckets[bucketOf(r.createdAt)].push(r)
    return buckets
  }, [filtered])

  const filterCounts = {
    all: rows.length,
    action: rows.filter(r => r.klass === NOTIF_CLASS.A).length,
    flagged: rows.filter(r => r.klass === NOTIF_CLASS.B).length,
  }

  // Bell badge: red dot + count for Class A unread; amber dot for Class B; nothing otherwise.
  const badgeColor = counts.A > 0 ? 'var(--status-error)' : counts.B > 0 ? 'var(--status-warning)' : null
  const badgeCount = counts.A > 0 ? counts.A : null

  // TODO(v1.5-mobile-pass): spec §8.5 requires a true full-screen takeover on
  // mobile (back-arrow, full-width rows). This is currently a viewport-clamped
  // popover — acceptable for desktop QA, broken pattern on phone in a corridor.
  // Same class of issue as the formation-editor mobile bottom sheet.
  const mobileWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth - 16, 380) : 380

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={badgeCount ? `Notifications, ${badgeCount} action required` : 'Notifications'}
        className="w-[34px] h-[34px] rounded-[var(--radius-md)] inline-flex items-center justify-center shrink-0 relative transition-colors"
        style={{
          background: open ? 'var(--brand-primary-tint)' : 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          color: open ? 'var(--brand-primary)' : 'var(--text-secondary)',
        }}
      >
        <Bell size={15} />
        {badgeColor && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 999,
            background: badgeColor, color: 'var(--on-brand-primary)',
            fontSize: 10, fontWeight: 700, lineHeight: '16px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surface-page)',
          }}>{badgeCount || ''}</span>
        )}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} width={isMobile ? mobileWidth : 380} align="right">
        {/* Header: title + filters + mark-all */}
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</div>
            {rows.some(r => r.unread) && (
              <button onClick={markAllRead} className="text-[11.5px] hover:underline"
                style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {FILTERS.map(f => {
              const isActive = filter === f.id
              const c = filterCounts[f.id] || 0
              return (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className="px-2 py-[3px] rounded-full text-[11.5px] font-semibold transition-colors"
                  style={{
                    background: isActive ? 'var(--brand-primary)' : 'transparent',
                    color: isActive ? 'var(--on-brand-primary)' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}>
                  {f.label}{c > 0 && <span className="ml-1 opacity-80">{c}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', background: 'var(--surface-card)' }}>
          {loading && rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</div>
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : filtered.length === 0 ? (
            <Empty />
          ) : (
            ['today', 'yesterday', 'earlier'].map(bucket =>
              grouped[bucket].length > 0 ? (
                <div key={bucket}>
                  <GroupHeader label={BUCKET_LABEL[bucket]} />
                  {grouped[bucket].map(row =>
                    <NotifRow key={row.id} row={row} onDismiss={dismiss} onMarkRead={markRead} />
                  )}
                </div>
              ) : null
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 text-center" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}>
          <Link to="/teacher/notifications" onClick={() => setOpen(false)}
            className="text-[12px] font-semibold hover:underline" style={{ color: 'var(--brand-primary)' }}>
            View all
          </Link>
        </div>
      </Popover>
    </>
  )
}
