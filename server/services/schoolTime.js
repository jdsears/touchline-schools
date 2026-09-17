// Calendar date in the school's timezone. The server runs in UTC, so at
// 00:30 on a BST morning `new Date().toISOString()` still says yesterday and
// "today" views would miss the day's fixtures until 01:00.
export function londonToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}
