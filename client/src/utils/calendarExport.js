/**
 * Calendar Export Utilities
 * Generates ICS files for exporting events to Google Calendar, Apple Calendar, Outlook, etc.
 */

/**
 * Format a date for ICS file (YYYYMMDDTHHmmss format)
 */
function formatICSDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text) {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate a unique ID for ICS events
 */
function generateUID() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@football-hub`
}

/**
 * Create an ICS event string
 */
function createICSEvent({ title, description, location, startDate, endDate, uid }) {
  const start = formatICSDate(startDate)
  const end = formatICSDate(endDate || new Date(new Date(startDate).getTime() + 2 * 60 * 60 * 1000)) // Default 2 hours

  return `BEGIN:VEVENT
UID:${uid || generateUID()}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:${escapeICS(title)}
DESCRIPTION:${escapeICS(description || '')}
LOCATION:${escapeICS(location || '')}
END:VEVENT`
}

/**
 * Create a full ICS file content
 */
function createICSFile(events, calendarName = 'Football Hub Calendar') {
  const eventsStr = events.map(createICSEvent).join('\n')

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Football Hub//Calendar Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICS(calendarName)}
${eventsStr}
END:VCALENDAR`
}

/**
 * Download an ICS file
 */
function downloadICS(content, filename = 'calendar.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export a single match to calendar
 */
export function exportMatchToCalendar(match, teamName = 'Team') {
  const matchDate = new Date(match.date)
  const isHome = match.is_home !== undefined ? match.is_home : match.isHome
  const title = `${isHome ? '🏠' : '🚗'} ${teamName} vs ${match.opponent}`
  const description = [
    isHome ? 'Home Match' : 'Away Match',
    match.meetup_time ? `Meet: ${match.meetup_time}` : '',
    match.meetup_location ? `Meet at: ${match.meetup_location}` : '',
    match.notes ? `Notes: ${match.notes}` : '',
  ].filter(Boolean).join('\\n')

  const event = {
    title,
    description,
    location: match.location || '',
    startDate: matchDate,
    endDate: new Date(matchDate.getTime() + 2 * 60 * 60 * 1000), // 2 hour duration
  }

  const icsContent = createICSFile([event], `${teamName} Matches`)
  downloadICS(icsContent, `match-vs-${match.opponent.toLowerCase().replace(/\s+/g, '-')}.ics`)
}

/**
 * Export a training session to calendar
 */
export function exportTrainingToCalendar(session, teamName = 'Team') {
  const sessionDate = new Date(session.date)
  const isSC = session.session_type === 's&c'
  const title = isSC
    ? `💪 ${teamName} S&C Session`
    : `⚽ ${teamName} Training`

  const description = [
    session.focus_areas?.length ? `Focus: ${session.focus_areas.join(', ')}` : '',
    session.duration ? `Duration: ${session.duration} mins` : '',
    session.notes ? `Notes: ${session.notes}` : '',
  ].filter(Boolean).join('\\n')

  const duration = session.duration || (isSC ? 60 : 90) // Default durations
  const event = {
    title,
    description,
    location: session.location || '',
    startDate: sessionDate,
    endDate: new Date(sessionDate.getTime() + duration * 60 * 1000),
  }

  const icsContent = createICSFile([event], `${teamName} Training`)
  downloadICS(icsContent, `training-${sessionDate.toISOString().split('T')[0]}.ics`)
}

/**
 * Export all upcoming matches to calendar
 */
export function exportAllMatchesToCalendar(matches, teamName = 'Team') {
  const events = matches.map(match => {
    const matchDate = new Date(match.date)
    const isHome = match.is_home !== undefined ? match.is_home : match.isHome
    return {
      title: `${isHome ? '🏠' : '🚗'} ${teamName} vs ${match.opponent}`,
      description: [
        isHome ? 'Home Match' : 'Away Match',
        match.meetup_time ? `Meet: ${match.meetup_time}` : '',
        match.location ? `Location: ${match.location}` : '',
      ].filter(Boolean).join('\\n'),
      location: match.location || '',
      startDate: matchDate,
      endDate: new Date(matchDate.getTime() + 2 * 60 * 60 * 1000),
      uid: `match-${match.id}@football-hub`,
    }
  })

  const icsContent = createICSFile(events, `${teamName} Match Schedule`)
  downloadICS(icsContent, `${teamName.toLowerCase().replace(/\s+/g, '-')}-matches.ics`)
}

/**
 * Export all training sessions to calendar
 */
export function exportAllTrainingToCalendar(sessions, teamName = 'Team') {
  const events = sessions.map(session => {
    const sessionDate = new Date(session.date)
    const isSC = session.session_type === 's&c'
    const duration = session.duration || (isSC ? 60 : 90)
    return {
      title: isSC ? `💪 ${teamName} S&C` : `⚽ ${teamName} Training`,
      description: session.focus_areas?.length ? `Focus: ${session.focus_areas.join(', ')}` : '',
      location: session.location || '',
      startDate: sessionDate,
      endDate: new Date(sessionDate.getTime() + duration * 60 * 1000),
      uid: `training-${session.id}@football-hub`,
    }
  })

  const icsContent = createICSFile(events, `${teamName} Training Schedule`)
  downloadICS(icsContent, `${teamName.toLowerCase().replace(/\s+/g, '-')}-training.ics`)
}

/**
 * Export full schedule (matches + training) to calendar
 */
export function exportFullScheduleToCalendar(matches, training, teamName = 'Team') {
  const matchEvents = matches.map(match => {
    const matchDate = new Date(match.date)
    const isHome = match.is_home !== undefined ? match.is_home : match.isHome
    return {
      title: `${isHome ? '🏠' : '🚗'} ${teamName} vs ${match.opponent}`,
      description: isHome ? 'Home Match' : 'Away Match',
      location: match.location || '',
      startDate: matchDate,
      endDate: new Date(matchDate.getTime() + 2 * 60 * 60 * 1000),
      uid: `match-${match.id}@football-hub`,
    }
  })

  const trainingEvents = training.map(session => {
    const sessionDate = new Date(session.date)
    const isSC = session.session_type === 's&c'
    const duration = session.duration || (isSC ? 60 : 90)
    return {
      title: isSC ? `💪 ${teamName} S&C` : `⚽ ${teamName} Training`,
      description: session.focus_areas?.length ? `Focus: ${session.focus_areas.join(', ')}` : '',
      location: session.location || '',
      startDate: sessionDate,
      endDate: new Date(sessionDate.getTime() + duration * 60 * 1000),
      uid: `training-${session.id}@football-hub`,
    }
  })

  const allEvents = [...matchEvents, ...trainingEvents]
  const icsContent = createICSFile(allEvents, `${teamName} Full Schedule`)
  downloadICS(icsContent, `${teamName.toLowerCase().replace(/\s+/g, '-')}-schedule.ics`)
}

/**
 * Generate a Google Calendar add URL
 */
export function getGoogleCalendarUrl(event) {
  const startDate = new Date(event.startDate || event.date)
  const endDate = event.endDate || new Date(startDate.getTime() + 2 * 60 * 60 * 1000)

  const formatGoogleDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || `vs ${event.opponent}`,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description || '',
    location: event.location || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
