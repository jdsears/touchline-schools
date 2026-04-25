export default function CricketField({ teamFormat = 11 }) {
  return (
    <div className="absolute inset-[3%] pointer-events-none">
      {/* Outer boundary - oval */}
      <div className="absolute inset-0 border-[2.5px] border-white/45 rounded-full" />

      {/* Inner oval / rope line */}
      <div className="absolute inset-[5%] border-[1.5px] border-white/20 rounded-full border-dashed" />

      {/* 30-yard circle */}
      <div className="absolute inset-[18%] border-[2px] border-dashed border-white/40 rounded-full" />

      {/* Pitch strip */}
      <div className="absolute top-[28%] bottom-[28%] left-[46%] right-[46%] border-[2px] border-white/55 bg-yellow-900/25 rounded-sm" />

      {/* Batting crease - top */}
      <div className="absolute top-[34%] left-[41%] right-[41%] h-[1.5px] bg-white/65" />
      {/* Popping crease - top */}
      <div className="absolute top-[36.5%] left-[43%] right-[43%] h-[1px] bg-white/40" />

      {/* Batting crease - bottom */}
      <div className="absolute bottom-[34%] left-[41%] right-[41%] h-[1.5px] bg-white/65" />
      {/* Popping crease - bottom */}
      <div className="absolute bottom-[36.5%] left-[43%] right-[43%] h-[1px] bg-white/40" />

      {/* Wickets - top (3 stumps) */}
      <div className="absolute top-[31.5%] left-1/2 -translate-x-1/2 flex gap-[3px]">
        <div className="w-[2px] h-[8px] bg-white/85" />
        <div className="w-[2px] h-[8px] bg-white/85" />
        <div className="w-[2px] h-[8px] bg-white/85" />
      </div>
      {/* Wickets - bottom */}
      <div className="absolute bottom-[31.5%] left-1/2 -translate-x-1/2 flex gap-[3px]">
        <div className="w-[2px] h-[8px] bg-white/85" />
        <div className="w-[2px] h-[8px] bg-white/85" />
        <div className="w-[2px] h-[8px] bg-white/85" />
      </div>

      {/* Bowling crease markers at top & bottom of pitch */}
      <div className="absolute top-[28%] left-[44%] right-[44%] h-[1px] bg-white/30" />
      <div className="absolute bottom-[28%] left-[44%] right-[44%] h-[1px] bg-white/30" />

      {/* Centre pitch dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.5%] aspect-square bg-white/30 rounded-full" />

      {/* Fielding position labels for 11-a-side */}
      {teamFormat >= 11 && (
        <>
          <span className="absolute top-[6%] left-1/2 -translate-x-1/2 text-[8px] text-primary/40 font-medium tracking-wide">FINE LEG</span>
          <span className="absolute top-[6%] right-[10%] text-[8px] text-primary/40 font-medium tracking-wide">THIRD MAN</span>
          <span className="absolute bottom-[6%] left-1/2 -translate-x-1/2 text-[8px] text-primary/40 font-medium tracking-wide">LONG ON</span>
          <span className="absolute top-1/2 left-[4%] -translate-y-1/2 text-[8px] text-primary/40 font-medium tracking-wide" style={{ writingMode: 'vertical-rl' }}>MID WICKET</span>
          <span className="absolute top-1/2 right-[4%] -translate-y-1/2 text-[8px] text-primary/40 font-medium tracking-wide" style={{ writingMode: 'vertical-rl' }}>COVER</span>
        </>
      )}
    </div>
  )
}
