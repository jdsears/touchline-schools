import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import api from '../../services/api'

const EVENT_LABELS = {
  fixture: 'Match',
  training: 'Training',
  lesson: 'PE Lesson',
  assessment: 'Assessment',
}

export default function TodayStrip() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    api.get(`/pupils/me/schedule?from=${today}&to=${today}`)
      .then(r => setEvents(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const dateStr = format(now, 'EEEE, d MMMM')

  const summary = events
    .map(e => {
      const label = EVENT_LABELS[e.type] || e.type
      const time = e.start_time ? e.start_time.slice(0, 5) : ''
      return time ? `${label} ${time}` : label
    })
    .join(' | ')

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-white">{dateStr}</h2>
        <span className="text-xs text-navy-500">{format(now, 'HH:mm')}</span>
      </div>

      {loading ? (
        <div className="h-4 w-56 bg-navy-800 rounded animate-pulse mt-1.5" />
      ) : events.length > 0 ? (
        <p className="text-xs text-gold-400 mt-1 truncate">{summary}</p>
      ) : (
        <p className="text-xs text-navy-500 mt-1">No sport or PE scheduled today. Check tomorrow!</p>
      )}
    </div>
  )
}
