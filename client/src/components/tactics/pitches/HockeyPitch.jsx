export default function HockeyPitch({ teamFormat = 11 }) {
  return (
    <div className="absolute inset-[4%] border-[2.5px] border-white/55 pointer-events-none rounded-sm">
      {/* Halfway line */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/55 -translate-y-1/2" />

      {/* Centre circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[14%] aspect-square border-[2px] border-white/40 rounded-full" />
      {/* Centre spot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2%] aspect-square bg-white/50 rounded-full" />

      {/* 23m lines */}
      <div className="absolute top-[23%] left-0 right-0 h-[1.5px] bg-white/35" />
      <div className="absolute bottom-[23%] left-0 right-0 h-[1.5px] bg-white/35" />

      {/* Shooting circles (D) - top */}
      <div
        className="absolute border-[2.5px] border-white/55 rounded-b-full"
        style={{ top: 0, left: '20%', right: '20%', height: '20%', borderTopWidth: 0 }}
      />
      {/* Shooting circles (D) - bottom */}
      <div
        className="absolute border-[2.5px] border-white/55 rounded-t-full"
        style={{ bottom: 0, left: '20%', right: '20%', height: '20%', borderBottomWidth: 0 }}
      />

      {/* Goal lines (goal mouth) - top */}
      <div className="absolute top-0 left-[37%] right-[37%] h-[4%] border-x-[2px] border-b-[2px] border-white/70" />
      {/* Goal lines (goal mouth) - bottom */}
      <div className="absolute bottom-0 left-[37%] right-[37%] h-[4%] border-x-[2px] border-t-[2px] border-white/70" />

      {/* Penalty spots */}
      <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[2%] aspect-square bg-white/55 rounded-full" />
      <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[2%] aspect-square bg-white/55 rounded-full" />

      {/* 5m hash marks on sidelines - top third */}
      {[18, 21, 24].map(pct => (
        <div key={`tl-${pct}`} className="absolute left-0 h-[2px] w-[2%] bg-white/40" style={{ top: `${pct}%` }} />
      ))}
      {[18, 21, 24].map(pct => (
        <div key={`tr-${pct}`} className="absolute right-0 h-[2px] w-[2%] bg-white/40" style={{ top: `${pct}%` }} />
      ))}
      {/* 5m hash marks - bottom third */}
      {[76, 79, 82].map(pct => (
        <div key={`bl-${pct}`} className="absolute left-0 h-[2px] w-[2%] bg-white/40" style={{ top: `${pct}%` }} />
      ))}
      {[76, 79, 82].map(pct => (
        <div key={`br-${pct}`} className="absolute right-0 h-[2px] w-[2%] bg-white/40" style={{ top: `${pct}%` }} />
      ))}
    </div>
  )
}
