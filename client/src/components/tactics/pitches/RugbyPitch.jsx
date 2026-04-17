// Rugby Union pitch markings
// Real proportions: playing area 100m x 70m, in-goal areas 6-22m each end
// We use y=0 (top) as attacking end, y=100 (bottom) as defending end
// In-goal areas: top 10%, bottom 10%. Try lines at 10% and 90%.
// 22m lines at ~29% and ~71%. 10m lines at ~42% and ~58%. Halfway at 50%.

export default function RugbyPitch({ teamFormat = 15 }) {
  const line = 'absolute bg-white/55 pointer-events-none'
  const h = `${line} left-0 right-0`  // horizontal full-width
  const hInner = `${line} left-[4%] right-[4%]` // horizontal inset

  return (
    <>
      {/* Outer pitch border (includes in-goal areas) */}
      <div className="absolute inset-[3%] border-[2.5px] border-white/55 pointer-events-none rounded-sm">

        {/* Dead ball lines are the outer border - try lines inside */}
        {/* Try lines (goal lines) at 10% from each end */}
        <div className={`${h} h-[2.5px] top-[10%]`} />
        <div className={`${h} h-[2.5px] bottom-[10%]`} style={{ top: 'auto' }} />

        {/* 22m lines */}
        <div className={`${h} h-[2px] top-[29%]`} style={{ opacity: 0.5 }} />
        <div className={`${h} h-[2px] bottom-[29%]`} style={{ opacity: 0.5, top: 'auto' }} />

        {/* 10m lines */}
        <div className={`${h} h-[2px] top-[42%]`} style={{ opacity: 0.4, borderTop: '2px dashed rgba(255,255,255,0.4)' }} />
        <div className={`${h} h-[2px] bottom-[42%]`} style={{ opacity: 0.4, top: 'auto', borderTop: '2px dashed rgba(255,255,255,0.4)' }} />

        {/* Halfway line */}
        <div className={`${h} h-[2.5px] top-1/2 -translate-y-1/2`} />

        {/* 5m lines from each try line (hash marks on sidelines only) */}
        {/* Top try line + 5m marks */}
        <div className="absolute top-[14%] left-0 w-[4%] h-[2px] bg-white/40" />
        <div className="absolute top-[14%] right-0 w-[4%] h-[2px] bg-white/40" />
        <div className="absolute bottom-[14%] left-0 w-[4%] h-[2px] bg-white/40" />
        <div className="absolute bottom-[14%] right-0 w-[4%] h-[2px] bg-white/40" />

        {/* Center spot on halfway */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full" />

        {/* H-posts at try lines (top and bottom) */}
        {/* Top posts */}
        <svg className="absolute top-0 left-0 w-full h-[10%] pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
          <line x1="42" y1="10" x2="42" y2="0" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
          <line x1="58" y1="10" x2="58" y2="0" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
          <line x1="38" y1="3" x2="62" y2="3" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
        </svg>
        {/* Bottom posts */}
        <svg className="absolute bottom-0 left-0 w-full h-[10%] pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
          <line x1="42" y1="0" x2="42" y2="10" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
          <line x1="58" y1="0" x2="58" y2="10" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
          <line x1="38" y1="7" x2="62" y2="7" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
        </svg>

        {/* Zone labels */}
        <span className="absolute top-[2%] left-1/2 -translate-x-1/2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">In-Goal</span>
        <span className="absolute bottom-[2%] left-1/2 -translate-x-1/2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">In-Goal</span>
        <span className="absolute top-[11%] left-1 text-[7px] text-white/30 font-medium">Try Line</span>
        <span className="absolute top-[30%] left-1 text-[7px] text-white/30 font-medium">22m</span>
        <span className="absolute bottom-[30%] left-1 text-[7px] text-white/30 font-medium">22m</span>
        <span className="absolute top-[43%] left-1 text-[7px] text-white/25 font-medium">10m</span>
        <span className="absolute bottom-[43%] left-1 text-[7px] text-white/25 font-medium">10m</span>
      </div>
    </>
  )
}
