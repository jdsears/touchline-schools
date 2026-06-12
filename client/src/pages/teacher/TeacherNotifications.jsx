import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, Flag, Sparkles, Info, X, CheckCheck, Loader2 } from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import { hodService } from '../../services/api'
import { useTopBarNotifications, NOTIF_CLASS } from '../../hooks/useTopBarNotifications'
import { PageHeader, EmptyState } from '../../components/common/ui'

const CLASS_ICON = { A: AlertTriangle, B: Flag, C: Sparkles, D: Info }
const CLASS_LABEL = {
  A: 'Action required',
  B: 'Flagged for you',
  C: 'Heads-up',
  D: 'System',
}
const CLASS_TINT = {
  A: 'bg-status-error-tint text-status-error',
  B: 'bg-status-warning-tint text-status-warning',
  C: 'bg-subtle text-secondary',
  D: 'bg-status-info-tint text-status-info',
}

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'action', label: 'Action', match: r => r.klass === NOTIF_CLASS.A },
  { id: 'flagged', label: 'Flagged', match: r => r.klass === NOTIF_CLASS.B },
  { id: 'unread', label: 'Unread', match: r => r.unread },
]

function bucketOf(date) {
  if (!date) return 'earlier'
  const d = new Date(date)
  if (isToday(d)) return 'today'
  if (isYesterday(d)) return 'yesterday'
  return 'earlier'
}
const BUCKET_LABEL = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' }

function timeAgo(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true }).replace('about ', '')
}

function NotifRow({ row, onDismiss, onMarkRead }) {
  const Icon = CLASS_ICON[row.klass] || Bell
  return (
    <div
      className={`group relative flex gap-3.5 rounded-xl border bg-card p-4 transition-all hover:shadow-sm ${
        row.unread ? 'border-brand-accent/50' : 'border-border-default'
      }`}
      onMouseEnter={() => row.unread && onMarkRead(row)}
    >
      {row.unread && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-brand-accent" />}
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${CLASS_TINT[row.klass]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={`truncate text-sm text-primary ${row.unread ? 'font-semibold' : 'font-medium'}`}>{row.title}</p>
          <span className="ml-auto shrink-0 text-[11px] text-tertiary">{timeAgo(row.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-secondary">{row.message}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-tertiary">{CLASS_LABEL[row.klass]}</span>
          {row.team_name && <span className="text-[11px] text-tertiary">· {row.team_name}</span>}
          {row.actionLabel && row.actionHref && (
            <Link
              to={row.actionHref}
              className="ml-auto rounded-full bg-brand-primary px-3 py-1 text-[11.5px] font-semibold text-on-dark transition-colors hover:bg-brand-primary-hover"
            >
              {row.actionLabel}
            </Link>
          )}
        </div>
      </div>
      <button
        onClick={() => onDismiss(row)}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-card text-tertiary opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export default function TeacherNotifications() {
  const { user } = useAuth()
  const [isHoD, setIsHoD] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    hodService.check()
      .then(res => setIsHoD(!!res.data.isHoD))
      .catch(() => setIsHoD(false))
  }, [])

  const { rows, loading, error, counts, reload, dismiss, markRead, markAllRead } =
    useTopBarNotifications({ isAdmin: !!user?.is_admin, isHoD })

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
    unread: rows.filter(r => r.unread).length,
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader
        title="Notifications"
        subtitle={counts.total > 0 ? `${counts.total} unread` : 'Everything that needs your attention, in one place'}
        actions={rows.some(r => r.unread) && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-2 text-sm font-medium text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      />

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map(f => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                active
                  ? 'bg-brand-primary text-on-dark'
                  : 'border border-border-default bg-card text-secondary hover:border-border-strong hover:text-primary'
              }`}
            >
              {f.label}
              {filterCounts[f.id] > 0 && <span className="ml-1.5 opacity-70">{filterCounts[f.id]}</span>}
            </button>
          )
        })}
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-status-error/40 bg-card p-6">
          <EmptyState
            icon={Bell}
            title="Couldn't load notifications"
            hint="Something went wrong fetching your notifications."
            actionLabel="Try again"
            onAction={reload}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-card p-6">
          <EmptyState
            icon={Bell}
            title={filter === 'all' ? "You're up to date" : `No ${filter === 'unread' ? 'unread' : filter} notifications`}
            hint={filter === 'all'
              ? 'Nothing needs your attention right now. Consent expiries, flagged voice notes, and team updates will appear here.'
              : 'Switch back to All to see everything.'}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {['today', 'yesterday', 'earlier'].map(bucket =>
            grouped[bucket].length > 0 ? (
              <section key={bucket}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-tertiary">{BUCKET_LABEL[bucket]}</h2>
                <div className="space-y-2">
                  {grouped[bucket].map(row => (
                    <NotifRow key={row.id} row={row} onDismiss={dismiss} onMarkRead={markRead} />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}
