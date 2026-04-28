import { useCallback, useEffect, useRef, useState } from 'react'
import {
  pupilManagementService,
  hodService,
  teachingGroupService,
  lessonService,
  reportingService,
} from '../services/api'

// Result shape:
//   { id, type, title, subtitle, href, meta }
//   type ∈ 'pupil' | 'teacher' | 'team' | 'class' | 'lesson' | 'report'

const RECENT_KEY = 'topbar.search.recent'
const RECENT_MAX = 5

function readRecent() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function writeRecent(list) {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* storage blocked */ }
}

const includesQ = (q) => (s) => (s || '').toLowerCase().includes(q)

// Light per-feature query helpers. They never throw — empty array on failure
// so a single broken endpoint doesn't blank the whole panel.
async function searchPupils(q) {
  try {
    const res = await pupilManagementService.list({ search: q, limit: 8 })
    return (res.data?.pupils || res.data || []).slice(0, 8).map(p => ({
      id: `pupil:${p.id}`,
      type: 'pupil',
      title: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      subtitle: [p.year_group ? `Y${p.year_group}` : null, p.house].filter(Boolean).join(' · '),
      href: `/teacher/pupils/${p.id}`,
      meta: p.year_group ? `Y${p.year_group}` : null,
    })).filter(r => r.title)
  } catch { return [] }
}

async function searchTeachers(q, isAdminOrHoD) {
  if (!isAdminOrHoD) return []
  try {
    const res = await hodService.getTeachers()
    const list = Array.isArray(res.data) ? res.data : (res.data?.teachers || [])
    return list
      .filter(t => includesQ(q)(t.name) || includesQ(q)(t.email))
      .slice(0, 8)
      .map(t => ({
        id: `teacher:${t.id || t.user_id}`,
        type: 'teacher',
        title: t.name,
        subtitle: t.email,
        href: '/teacher/hod/teachers',
        meta: t.role || null,
      }))
  } catch { return [] }
}

async function searchTeams(q, isAdminOrHoD) {
  if (!isAdminOrHoD) return []
  try {
    const res = await hodService.getTeams()
    const list = Array.isArray(res.data) ? res.data : (res.data?.teams || [])
    return list
      .filter(t => includesQ(q)(t.name) || includesQ(q)(t.sport))
      .slice(0, 8)
      .map(t => ({
        id: `team:${t.id}`,
        type: 'team',
        title: t.name,
        subtitle: [t.sport, t.age_group].filter(Boolean).join(' · '),
        href: '/teacher/hod/teams',
        meta: t.sport || null,
      }))
  } catch { return [] }
}

async function searchClasses(q) {
  try {
    const res = await teachingGroupService.list()
    const list = Array.isArray(res.data) ? res.data : (res.data?.groups || [])
    return list
      .filter(g => includesQ(q)(g.name) || includesQ(q)(g.year_group))
      .slice(0, 8)
      .map(g => ({
        id: `class:${g.id}`,
        type: 'class',
        title: g.name,
        subtitle: [g.year_group, g.pupil_count != null ? `${g.pupil_count} pupils` : null].filter(Boolean).join(' · '),
        href: `/teacher/classes/${g.id}`,
        meta: g.year_group || null,
      }))
  } catch { return [] }
}

async function searchLessons(q) {
  try {
    const res = await lessonService.list()
    const list = Array.isArray(res.data) ? res.data : (res.data?.lessons || [])
    return list
      .filter(l => includesQ(q)(l.title) || includesQ(q)(l.objective) || includesQ(q)(l.sport))
      .slice(0, 8)
      .map(l => ({
        id: `lesson:${l.id}`,
        type: 'lesson',
        title: l.title || 'Untitled lesson',
        subtitle: [l.sport, l.year_group, l.duration_min ? `${l.duration_min}m` : null].filter(Boolean).join(' · '),
        href: `/teacher/lessons`,
        meta: l.sport || null,
      }))
  } catch { return [] }
}

async function searchReports(q) {
  try {
    const res = await reportingService.getMyReports()
    const list = Array.isArray(res.data) ? res.data : (res.data?.reports || [])
    return list
      .filter(r => includesQ(q)(r.title) || includesQ(q)(r.pupil_name) || includesQ(q)(r.window_name))
      .slice(0, 8)
      .map(r => ({
        id: `report:${r.id}`,
        type: 'report',
        title: r.title || `${r.pupil_name || 'Pupil'} report`,
        subtitle: [r.window_name, r.status].filter(Boolean).join(' · '),
        href: `/teacher/reports`,
        meta: r.status || null,
      }))
  } catch { return [] }
}

const GROUPS = [
  { id: 'pupil',   label: 'Pupils',   fn: searchPupils },
  { id: 'teacher', label: 'Teachers', fn: searchTeachers, requiresAdminHoD: true },
  { id: 'team',    label: 'Teams',    fn: searchTeams,    requiresAdminHoD: true },
  { id: 'class',   label: 'Classes',  fn: searchClasses },
  { id: 'lesson',  label: 'Lessons',  fn: searchLessons },
  { id: 'report',  label: 'Reports',  fn: searchReports },
]

export const SEARCH_GROUP_LABEL = {
  pupil: 'Pupils', teacher: 'Teachers', team: 'Teams',
  class: 'Classes', lesson: 'Lessons', report: 'Reports',
}

export function useTopBarSearch({ isAdmin = false, isHoD = false } = {}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([]) // [{group, items: []}]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recent, setRecent] = useState(() => readRecent())
  const debounceRef = useRef(null)
  const reqRef = useRef(0)

  const isAdminOrHoD = isAdmin || isHoD

  const runFanout = useCallback(async (q) => {
    const reqId = ++reqRef.current
    setLoading(true); setError(null)
    try {
      const groups = GROUPS.filter(g => !g.requiresAdminHoD || isAdminOrHoD)
      const settled = await Promise.all(groups.map(async g => ({
        id: g.id,
        label: g.label,
        items: await g.fn(q.toLowerCase(), isAdminOrHoD),
      })))
      // Out-of-order guard
      if (reqId !== reqRef.current) return
      setResults(settled.filter(g => g.items.length > 0))
    } catch (err) {
      if (reqId !== reqRef.current) return
      setError(err)
    } finally {
      if (reqId === reqRef.current) setLoading(false)
    }
  }, [isAdminOrHoD])

  // Debounce 120ms per spec §5.2
  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runFanout(query.trim()), 120)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [query, runFanout])

  const recordRecent = useCallback((q) => {
    const trimmed = q.trim()
    if (!trimmed) return
    const next = [trimmed, ...recent.filter(r => r !== trimmed)].slice(0, RECENT_MAX)
    setRecent(next); writeRecent(next)
  }, [recent])

  const clearRecent = useCallback(() => {
    setRecent([]); writeRecent([])
  }, [])

  const totalResults = results.reduce((n, g) => n + g.items.length, 0)

  return { query, setQuery, results, loading, error, totalResults, recent, recordRecent, clearRecent }
}
