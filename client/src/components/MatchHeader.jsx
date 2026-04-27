import { ChevronRight } from 'lucide-react'

const RESULT_TONES = {
  W: { bg: 'var(--status-success-tint)', fg: 'var(--status-success)', label: 'Win' },
  L: { bg: 'var(--status-error-tint)', fg: 'var(--status-error)', label: 'Loss' },
  D: { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)', label: 'Draw' },
}

function Pill({ tone, children, live, dot }) {
  const tones = {
    accent: { bg: 'var(--brand-accent-tint)', fg: 'var(--brand-primary)' },
    live: { bg: 'var(--status-error-tint)', fg: 'var(--status-error)' },
    warning: { bg: 'var(--status-warning-tint)', fg: 'var(--status-warning)' },
    success: { bg: 'var(--status-success-tint)', fg: 'var(--status-success)' },
    error: { bg: 'var(--status-error-tint)', fg: 'var(--status-error)' },
    neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <span className="inline-flex items-center gap-1.5 px-[10px] py-[3px] rounded-full text-[12px] font-semibold tracking-[0.01em] whitespace-nowrap"
      style={{ background: t.bg, color: t.fg }}>
      {live && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--status-error)' }} />}
      {dot && !live && <span className="w-[5px] h-[5px] rounded-full" style={{ background: 'currentColor' }} />}
      {children}
    </span>
  )
}

function Crest({ initials, size = 56 }) {
  return (
    <span className="inline-flex items-center justify-center shrink-0 rounded-[var(--crest-radius)]"
      style={{ width: size, height: size, background: 'rgba(255,255,255,0.10)', color: 'var(--brand-accent)', border: '1px solid rgba(255,255,255,0.18)', fontSize: size * 0.35, fontWeight: 700, letterSpacing: '0.02em' }}>
      {initials}
    </span>
  )
}

export default function MatchHeader({ match, team }) {
  if (!match || !team) return null

  const navy = 'var(--brand-primary)'
  const onNavy = 'var(--text-on-dark)'
  const onNavyDim = 'var(--text-on-dark-secondary)'

  const hasResult = match.score_for != null && match.score_against != null
  const isHome = match.home_away === 'home'
  const isPast = match.date && new Date(match.date || match.match_date) < new Date()
  const state = isPast ? 'post' : 'pre'

  const homeInitials = isHome ? (team.name || '').slice(0, 2).toUpperCase() : (match.opponent || '').slice(0, 2).toUpperCase()
  const awayInitials = isHome ? (match.opponent || '').slice(0, 2).toUpperCase() : (team.name || '').slice(0, 2).toUpperCase()
  const homeName = isHome ? team.name : match.opponent
  const awayName = isHome ? match.opponent : team.name

  const resultChar = hasResult
    ? (match.score_for > match.score_against ? 'W' : match.score_for < match.score_against ? 'L' : 'D')
    : null

  const statusPill = state === 'pre'
    ? <Pill tone="accent" dot>Upcoming</Pill>
    : hasResult
      ? <Pill tone={resultChar === 'W' ? 'success' : resultChar === 'L' ? 'error' : 'neutral'} dot>{RESULT_TONES[resultChar]?.label}</Pill>
      : <Pill tone="warning" dot>Result not recorded</Pill>

  const matchDate = match.date || match.match_date
  const dateStr = matchDate ? new Date(matchDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const timeStr = match.match_time ? match.match_time.slice(0, 5) : '00:00'

  return (
    <div className="rounded-[var(--radius-xl)] overflow-hidden mb-6" style={{ background: navy }}>
      <div className="h-[3px]" style={{ background: 'var(--brand-accent)' }} />
      <div className="px-6 py-5">
        {/* Top row: pill + competition + CTA */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {statusPill}
            {match.competition && <span className="text-[12px]" style={{ color: onNavyDim }}>{match.competition}</span>}
          </div>
        </div>

        {/* Centre: crests + score */}
        <div className="flex items-center justify-center gap-6 md:gap-10">
          <div className="flex flex-col items-center gap-2 min-w-0">
            <Crest initials={homeInitials} size={56} />
            <span className="text-[13px] font-semibold truncate max-w-[120px]" style={{ color: onNavy }}>{homeName}</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
            {state === 'pre' ? (
              <>
                <span className="text-[11px] tracking-[0.1em] uppercase font-semibold" style={{ color: onNavyDim }}>Kick-off</span>
                <span className="text-[36px] font-mono font-semibold leading-none tracking-[-0.02em]" style={{ color: onNavy }}>{timeStr}</span>
                <span className="text-[12px]" style={{ color: onNavyDim }}>{dateStr}</span>
              </>
            ) : hasResult ? (
              <span className="text-[48px] font-mono font-bold leading-none tracking-[-0.02em] tabular-nums" style={{ color: onNavy }}>
                {isHome ? match.score_for : match.score_against} - {isHome ? match.score_against : match.score_for}
              </span>
            ) : (
              <span className="text-[14px] italic" style={{ color: onNavyDim }}>No result recorded</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 min-w-0">
            <Crest initials={awayInitials} size={56} />
            <span className="text-[13px] font-semibold truncate max-w-[120px]" style={{ color: onNavy }}>{awayName}</span>
          </div>
        </div>

        {/* Bottom meta */}
        <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
          {dateStr && <span className="text-[12px]" style={{ color: onNavyDim }}>{dateStr}</span>}
          {match.location && <span className="text-[12px]" style={{ color: onNavyDim }}>{match.location}</span>}
          <span className="text-[12px] font-medium" style={{ color: onNavyDim }}>{isHome ? 'Home' : 'Away'}</span>
        </div>
      </div>
    </div>
  )
}
