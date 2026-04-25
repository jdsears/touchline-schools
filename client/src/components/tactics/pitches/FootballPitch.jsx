// Football pitch markings - rendered inside the pitch container div
export default function FootballPitch({ teamFormat = 11 }) {
  return (
    <>
      {/* Pitch border + markings */}
      <div className="absolute inset-[4%] border-[2.5px] border-white/50 rounded-sm pointer-events-none">
        {/* Center circle */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
          teamFormat <= 7 ? 'w-[14%]' : teamFormat === 9 ? 'w-[18%]' : 'w-[20%]'
        } aspect-square border-[2.5px] border-white/50 rounded-full`} />
        {/* Center spot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full" />
        {/* Halfway line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2.5px] bg-white/50 -translate-y-1/2" />

        {teamFormat === 5 ? (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28%] h-[10%] border-[2.5px] border-t-0 border-white/50 rounded-b-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28%] h-[10%] border-[2.5px] border-b-0 border-white/50 rounded-t-full" />
          </>
        ) : teamFormat === 7 ? (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-[11%] border-[2.5px] border-t-0 border-white/50 rounded-b-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[30%] h-[11%] border-[2.5px] border-b-0 border-white/50 rounded-t-full" />
            <div className="absolute top-[7%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
            <div className="absolute bottom-[7%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
          </>
        ) : teamFormat === 9 ? (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[32%] h-[12%] border-[2.5px] border-t-0 border-white/50 rounded-b-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32%] h-[12%] border-[2.5px] border-b-0 border-white/50 rounded-t-full" />
            <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
            <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
          </>
        ) : (
          <>
            {/* 11-a-side: penalty areas, goal areas, penalty spots, penalty arcs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-[2.5px] border-t-0 border-white/50" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-[2.5px] border-b-0 border-white/50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-[2.5px] border-t-0 border-white/50" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-[2.5px] border-b-0 border-white/50" />
            <div className="absolute top-[11%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
            <div className="absolute bottom-[11%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
            <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[16%] h-[8%] border-[2.5px] border-t-0 border-white/50 rounded-b-full" />
            <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 w-[16%] h-[8%] border-[2.5px] border-b-0 border-white/50 rounded-t-full" />
          </>
        )}
      </div>
    </>
  )
}
