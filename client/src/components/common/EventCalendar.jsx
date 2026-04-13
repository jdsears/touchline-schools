import { useState } from 'react'
import { ChevronLeft, ChevronRight, Trophy, Target, Dumbbell, Download } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { exportAllMatchesToCalendar, exportFullScheduleToCalendar } from '../../utils/calendarExport'

/**
 * EventCalendar - A reusable calendar component for displaying matches and training sessions
 *
 * Props:
 * - matches: Array of match objects with { id, date, opponent, result, is_home }
 * - training: Array of training objects with { id, date, session_type, focus_areas }
 * - onSelectEvent: Callback when an event is clicked (event) => void
 * - onSelectDate: Callback when a date is clicked (date) => void
 * - className: Additional CSS classes
 */
export default function EventCalendar({
  matches = [],
  training = [],
  onSelectEvent,
  onSelectDate,
  teamName = 'Team',
  showExport = true,
  className = ''
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of week offset (Monday = 0)
  const startDayOfWeek = (monthStart.getDay() + 6) % 7

  function getEventsForDay(day) {
    const events = []

    // Check matches
    matches?.forEach(match => {
      const matchDate = new Date(match.date)
      if (isSameDay(matchDate, day)) {
        events.push({
          type: 'match',
          data: match,
          isPast: !!match.result,
          sortTime: matchDate.getTime()
        })
      }
    })

    // Check training
    training?.forEach(session => {
      const sessionDate = new Date(session.date)
      if (isSameDay(sessionDate, day)) {
        events.push({
          type: session.session_type === 's&c' ? 'sc' : 'training',
          data: session,
          sortTime: sessionDate.getTime()
        })
      }
    })

    // Sort chronologically by time
    return events.sort((a, b) => a.sortTime - b.sortTime)
  }

  // Helper to format event time
  function formatEventTime(dateStr) {
    const date = new Date(dateStr)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    if (hours === 0 && minutes === 0) return null // No time set
    return format(date, 'HH:mm')
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className={className}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-navy-400 hover:text-white rounded-lg hover:bg-navy-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-display font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-navy-400 hover:text-white rounded-lg hover:bg-navy-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-navy-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[70px]" />
        ))}

        {/* Day cells */}
        {days.map(day => {
          const events = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isCurrentDay = isToday(day)
          const hasEvents = events.length > 0

          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                if (hasEvents && onSelectEvent) {
                  // Select the first event (match takes priority)
                  const matchEvent = events.find(e => e.type === 'match')
                  onSelectEvent(matchEvent?.data || events[0].data, matchEvent ? 'match' : events[0].type)
                } else if (onSelectDate) {
                  onSelectDate(day)
                }
              }}
              className={`
                min-h-[70px] rounded-lg p-1 flex flex-col items-stretch transition-colors relative
                ${isCurrentDay ? 'bg-pitch-500/20 ring-2 ring-pitch-500' : ''}
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${hasEvents ? 'hover:bg-navy-800 cursor-pointer' : onSelectDate ? 'hover:bg-navy-800/50 cursor-pointer' : 'cursor-default'}
              `}
            >
              <span className={`text-xs font-medium text-center ${isCurrentDay ? 'text-pitch-400' : 'text-navy-300'}`}>
                {format(day, 'd')}
              </span>

              {/* Event Details */}
              {hasEvents && (
                <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                  {events.slice(0, 3).map((event, idx) => {
                    const time = formatEventTime(event.data.date)
                    return (
                      <div
                        key={idx}
                        className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                          event.type === 'match'
                            ? event.isPast
                              ? event.data.result?.includes('-') && parseInt(event.data.result.split('-')[0]) > parseInt(event.data.result.split('-')[1])
                                ? 'bg-pitch-500/30 text-pitch-300' // Win
                                : parseInt(event.data.result?.split('-')[0]) < parseInt(event.data.result?.split('-')[1])
                                  ? 'bg-alert-500/30 text-alert-300' // Loss
                                  : 'bg-navy-600 text-navy-300' // Draw or unknown
                              : 'bg-energy-500/30 text-energy-300' // Upcoming match
                            : event.type === 'sc'
                              ? 'bg-caution-500/30 text-caution-300'
                              : 'bg-pitch-500/20 text-pitch-300'
                        }`}
                        title={
                          event.type === 'match'
                            ? `${time ? time + ' - ' : ''}vs ${event.data.opponent}${event.data.result ? ` (${event.data.result})` : ''}`
                            : event.type === 'sc'
                              ? `${time ? time + ' - ' : ''}S&C`
                              : `${time ? time + ' - ' : ''}Training${event.data.focus_areas?.length ? ': ' + event.data.focus_areas.slice(0, 2).join(', ') : ''}`
                        }
                      >
                        {event.type === 'match' ? (
                          <>
                            {time && <span className="opacity-70">{time} </span>}
                            <span className="font-medium">vs {event.data.opponent?.split(' ')[0]}</span>
                          </>
                        ) : event.type === 'sc' ? (
                          <>
                            {time && <span className="opacity-70">{time} </span>}
                            <span className="font-medium">S&C</span>
                          </>
                        ) : (
                          <>
                            {time && <span className="opacity-70">{time} </span>}
                            <span className="font-medium">{event.data.focus_areas?.[0] || 'Training'}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                  {events.length > 3 && (
                    <span className="text-[8px] text-navy-400 text-center">+{events.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend & Export */}
      <div className="mt-4 pt-4 border-t border-navy-800">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-energy-400" />
            <span className="text-xs text-navy-400">Upcoming Match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pitch-400" />
            <span className="text-xs text-navy-400">Win / Training</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-caution-400" />
            <span className="text-xs text-navy-400">S&C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-alert-400" />
            <span className="text-xs text-navy-400">Loss</span>
          </div>
        </div>

        {/* Export Button */}
        {showExport && (matches.length > 0 || training.length > 0) && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                const upcomingMatches = matches.filter(m => !m.result)
                if (training.length > 0) {
                  exportFullScheduleToCalendar(upcomingMatches, training, teamName)
                } else {
                  exportAllMatchesToCalendar(upcomingMatches, teamName)
                }
              }}
              className="btn-sm btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
