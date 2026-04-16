import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isToday, isSameWeek,
} from 'date-fns'
import api from '../../services/api'
import EventDetailModal from '../../components/pupil-lounge/EventDetailModal'

const EVENT_STYLE = {
  fixture: { bg: 'bg-gold-500/20', text: 'text-gold-400', dot: 'bg-gold-400' },
  training: { bg: 'bg-navy-700/60', text: 'text-navy-300', dot: 'bg-navy-400' },
  lesson: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  assessment: { bg: 'bg-violet-500/15', text: 'text-violet-400', dot: 'bg-violet-400' },
}

const SPORT_EMOJI = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', athletics: '🏃', swimming: '🏊', tennis: '🎾',
}

function EventPill({ event, onTap }) {
  const style = EVENT_STYLE[event.type] || EVENT_STYLE.training
  const extra = event.extra || {}
  const time = event.start_time ? event.start_time.slice(0, 5) : ''
  const sport = extra.sport
  const label = event.type === 'fixture'
    ? `vs ${event.title}`
    : event.title

  return (
    <button onClick={() => onTap(event)} className={`${style.bg} rounded-lg px-3 py-2 flex items-start gap-2 w-full text-left`}>
      <div className={`w-1.5 h-1.5 rounded-full ${style.dot} mt-1.5 flex-shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {sport && <span className="text-xs">{SPORT_EMOJI[sport] || ''}</span>}
          <span className={`text-xs font-medium ${style.text} truncate`}>{label}</span>
        </div>
        {time && (
          <span className="text-[10px] text-navy-500">{time}</span>
        )}
      </div>
    </button>
  )
}

function DayCard({ date, events, onEventTap }) {
  const today = isToday(date)
  const dayName = format(date, 'EEE')
  const dayNum = format(date, 'd')
  const monthShort = format(date, 'MMM')

  return (
    <div className={`rounded-2xl border p-3 ${
      today
        ? 'border-gold-500/30 bg-gold-500/5'
        : 'border-navy-800/40 bg-navy-900/40'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${today ? 'text-gold-400' : 'text-white'}`}>
            {dayName}
          </span>
          <span className="text-xs text-navy-500">{dayNum} {monthShort}</span>
        </div>
        {today && (
          <span className="text-[9px] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded-full font-semibold">
            TODAY
          </span>
        )}
      </div>

      {events.length > 0 ? (
        <div className="space-y-1.5">
          {events.map(e => <EventPill key={e.id} event={e} onTap={onEventTap} />)}
        </div>
      ) : (
        <p className="text-[10px] text-navy-600 italic">Rest day</p>
      )}
    </div>
  )
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 })

  useEffect(() => {
    setLoading(true)
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    api.get(`/pupils/me/schedule?from=${from}&to=${to}`)
      .then(r => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [weekStart])

  const eventsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter(e => e.date === dateStr)
  }

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekStart(s => subWeeks(s, 1))}
          className="p-2 text-navy-400 hover:text-white transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <h1 className="text-base font-bold text-white">
            {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
          </h1>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="text-[10px] text-gold-400 font-medium mt-0.5"
            >
              Jump to today
            </button>
          )}
        </div>

        <button
          onClick={() => setWeekStart(s => addWeeks(s, 1))}
          className="p-2 text-navy-400 hover:text-white transition-colors"
          aria-label="Next week"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-navy-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <DayCard
              key={day.toISOString()}
              date={day}
              events={eventsForDay(day)}
              onEventTap={setSelectedEvent}
            />
          ))}
        </div>
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
