import { useCallback, useEffect, useState } from 'react'
import { notificationService, consentService } from '../services/api'
import api from '../services/api'

// Top Bar notification spec §8.1: four severity classes.
//   A = action required (red dot + count)
//   B = flagged for you (amber dot)
//   C = heads-up
//   D = system (banner-style at top of tray)
export const NOTIF_CLASS = { A: 'A', B: 'B', C: 'C', D: 'D' }

// Map server-side notification.type strings → spec class. Conservative defaults
// so unknown future types don't accidentally raise an alarm.
const TYPE_TO_CLASS = {
  potm: NOTIF_CLASS.C,                      // celebratory heads-up
  availability_request: NOTIF_CLASS.A,      // pupil must respond
  announcement: NOTIF_CLASS.B,              // flagged for you
  suggestion: NOTIF_CLASS.B,
  suggestion_response: NOTIF_CLASS.B,
  // weather / kit / brief / system not yet emitted server-side; will land here
  weather_warning: NOTIF_CLASS.C,
  kit_clash: NOTIF_CLASS.C,
  brief_generated: NOTIF_CLASS.C,
  system: NOTIF_CLASS.D,
  maintenance: NOTIF_CLASS.D,
}

function classifyType(type) {
  return TYPE_TO_CLASS[type] || NOTIF_CLASS.C
}

// Synthetic-row dismissals are persisted in localStorage so consent / voice
// rows don't reappear after the user has acknowledged them on the popover.
const DISMISS_KEY = 'topbar.notif.dismissed'
function readDismissed() {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}
function writeDismissed(set) {
  try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set))) } catch { /* storage blocked */ }
}

// Produce a stable synthetic id for non-table sources.
const synthId = (kind, key) => `synth:${kind}:${key}`

// HoD-only voice safeguarding flags. 403 means feature not enabled; treat as empty.
async function fetchVoiceFlags() {
  try {
    const res = await api.get('/voice-safeguarding/flagged')
    return Array.isArray(res.data) ? res.data : []
  } catch (err) {
    if (err?.response?.status === 403 || err?.response?.status === 404) return []
    throw err
  }
}

// Adapter — aggregates the table-backed notifications endpoint with synthesized
// rows from per-feature endpoints. Returns rows already classified, sorted, and
// filtered against the local dismissal set.
export function useTopBarNotifications({ isAdmin = false, isHoD = false } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dismissed, setDismissed] = useState(() => (typeof window !== 'undefined' ? readDismissed() : new Set()))

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const calls = [notificationService.getNotifications(50)]
      if (isAdmin || isHoD) calls.push(consentService.getExpiring(30).catch(() => ({ data: [] })))
      if (isAdmin || isHoD) calls.push(fetchVoiceFlags().then(d => ({ data: d })).catch(() => ({ data: [] })))

      const [notifRes, consentRes, voiceRes] = await Promise.all(calls)

      const out = []

      // 1. Persisted notifications
      for (const n of (notifRes.data || [])) {
        out.push({
          id: n.id,
          source: 'table',
          klass: classifyType(n.type),
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.created_at,
          unread: !n.is_read,
          team_name: n.team_name,
          data: n.data,
        })
      }

      // 2. Consent expiring → Class A
      for (const c of (consentRes?.data || [])) {
        const id = synthId('consent', c.id)
        out.push({
          id,
          source: 'consent',
          klass: NOTIF_CLASS.A,
          type: 'consent_expiring',
          title: `${c.consent_type_name} expiring`,
          message: `${c.pupil_name}${c.year_group ? ` (Y${c.year_group})` : ''} — expires ${new Date(c.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
          createdAt: c.expires_at,
          unread: !dismissed.has(id),
          actionLabel: 'Review',
          actionHref: '/teacher/hod/consent',
        })
      }

      // 3. Voice safeguarding flags → Class A (DSL/HoD)
      for (const v of (voiceRes?.data || [])) {
        const id = synthId('voice', v.id)
        out.push({
          id,
          source: 'voice',
          klass: NOTIF_CLASS.A,
          type: 'voice_flagged',
          title: 'Voice obs flagged for review',
          message: `${v.pupil_name || 'Pupil'} — ${(v.transcript || '').slice(0, 80)}${(v.transcript || '').length > 80 ? '…' : ''}`,
          createdAt: v.flagged_at || v.created_at,
          unread: !dismissed.has(id),
          actionLabel: 'Review',
          actionHref: '/teacher/hod/voice-safeguarding',
        })
      }

      // Drop synthetics the user has already dismissed
      const filtered = out.filter(r => !(r.source !== 'table' && dismissed.has(r.id)))

      // Stable order: unread first (within class A → B → C → D), then by createdAt desc
      const classRank = { A: 0, B: 1, C: 2, D: 3 }
      filtered.sort((a, b) => {
        if (a.unread !== b.unread) return a.unread ? -1 : 1
        if (a.klass !== b.klass) return classRank[a.klass] - classRank[b.klass]
        return new Date(b.createdAt) - new Date(a.createdAt)
      })

      setRows(filtered)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isHoD, dismissed])

  useEffect(() => { load() }, [load])

  // Re-fetch on window focus so the bell stays fresh when a teacher returns to a tab.
  useEffect(() => {
    function onFocus() { load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const dismiss = useCallback(async (row) => {
    if (row.source === 'table') {
      try { await notificationService.deleteNotification(row.id) } catch { /* swallow */ }
    } else {
      const next = new Set(dismissed); next.add(row.id); setDismissed(next); writeDismissed(next)
    }
    setRows(rs => rs.filter(r => r.id !== row.id))
  }, [dismissed])

  const markRead = useCallback(async (row) => {
    if (!row.unread) return
    if (row.source === 'table') {
      try { await notificationService.markAsRead(row.id) } catch { /* swallow */ }
    } else {
      // For synthetics, mark-read == dismiss (they're action-required by definition).
      const next = new Set(dismissed); next.add(row.id); setDismissed(next); writeDismissed(next)
    }
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, unread: false } : r))
  }, [dismissed])

  const markAllRead = useCallback(async () => {
    try { await notificationService.markAllAsRead() } catch { /* swallow */ }
    const next = new Set(dismissed)
    for (const r of rows) if (r.source !== 'table' && r.unread) next.add(r.id)
    setDismissed(next); writeDismissed(next)
    setRows(rs => rs.map(r => ({ ...r, unread: false })))
  }, [rows, dismissed])

  // Auto mark-on-open clears visual noise (heads-up / flagged-FYI / system)
  // but leaves Class A "action required" alone — Class A's red rail is the
  // only persistent cue that a deadline / disagreement / consent expiry is
  // still pending. Spec §8.4 reads "gives the eye time to register" — the
  // eye registers Class A; auto-clearing it would defeat the signal.
  // Use the explicit Mark-all-read button for full clear (user-initiated).
  const markPassiveRead = useCallback(async () => {
    const targets = rows.filter(r => r.unread && r.klass !== NOTIF_CLASS.A)
    if (targets.length === 0) return
    // Per-id calls; notificationService doesn't expose a bulk-by-id endpoint
    // and we can't use markAllAsRead because it would flip Class A on the
    // server too.
    await Promise.all(targets
      .filter(r => r.source === 'table')
      .map(r => notificationService.markAsRead(r.id).catch(() => {}))
    )
    const next = new Set(dismissed)
    for (const r of targets) if (r.source !== 'table') next.add(r.id)
    setDismissed(next); writeDismissed(next)
    const targetIds = new Set(targets.map(r => r.id))
    setRows(rs => rs.map(r => targetIds.has(r.id) ? { ...r, unread: false } : r))
  }, [rows, dismissed])

  // Counts by class — used to power filter chips and the bell badge
  const counts = rows.reduce((acc, r) => {
    if (!r.unread) return acc
    acc[r.klass] = (acc[r.klass] || 0) + 1
    acc.total = (acc.total || 0) + 1
    return acc
  }, { A: 0, B: 0, C: 0, D: 0, total: 0 })

  return { rows, loading, error, counts, reload: load, dismiss, markRead, markAllRead, markPassiveRead }
}
