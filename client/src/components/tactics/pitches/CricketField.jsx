// Cricket field markings - implemented in sub-task 2.2
export default function CricketField({ teamFormat = 11 }) {
  return (
    <div className="absolute inset-[4%] pointer-events-none">
      {/* Boundary (oval outline) */}
      <div className="absolute inset-0 border-[2.5px] border-white/40 rounded-full" />
      {/* 30-yard circle (dashed) */}
      <div className="absolute inset-[18%] border-[2px] border-dashed border-white/35 rounded-full" />
      {/* Pitch strip */}
      <div className="absolute top-[30%] bottom-[30%] left-[46%] right-[46%] border-[2px] border-white/50 bg-yellow-900/30" />
      {/* Crease lines */}
      <div className="absolute top-[35%] left-[43%] right-[43%] h-[1.5px] bg-white/60" />
      <div className="absolute bottom-[35%] left-[43%] right-[43%] h-[1.5px] bg-white/60" />
      {/* Wickets marker at each end */}
      <div className="absolute top-[33%] left-1/2 -translate-x-1/2 w-[3%] h-[2px] bg-white/80" />
      <div className="absolute bottom-[33%] left-1/2 -translate-x-1/2 w-[3%] h-[2px] bg-white/80" />
    </div>
  )
}
