import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import api from '../../services/api'

const EVENT_LABELS = {
  fixture: 'Match',
  training: 'Training',
  lesson: 'PE',
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

  return (
    <div className="px-4 pt-2 pb-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-navy-400 font-medium">{dateStr}</span>
      </div>

      {loading ? (
        <div className="h-3.5 w-48 bg-navy-800/50 rounded animate-pulse mt-1.5" />
      ) : events.length > 0 ? (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Clock size={11} className="text-gold-400 flex-shrink-0" />
          <span className="text-[11px] text-gold-400 font-medium truncate">
            {events.map(e => {
              const label = EVENT_LABELS[e.type] || e.type
              const time = e.start_time ? e.start_time.slice(0, 5) : ''
              return time ? `${label} ${time}` : label
            }).join(' \u2022 ')}
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-navy-600 mt-1.5">No sport or PE today</p>
      )}
    </div>
  )
}
