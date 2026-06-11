export default function VolleyballCourt() {
  return (
    <div className="absolute inset-[4%] border-[2.5px] border-white/55 pointer-events-none rounded-sm">
      {/* Net */}
      <div className="absolute top-1/2 -left-[2%] -right-[2%] h-[3px] bg-white/85 -translate-y-1/2" />
      <span className="absolute top-1/2 right-[2%] -translate-y-[150%] text-[8px] text-primary/45 font-semibold tracking-widest uppercase">Net</span>

      {/* Attack lines (3m) */}
      <div className="absolute top-[33%] left-0 right-0 h-[2px] bg-white/45" />
      <div className="absolute bottom-[33%] left-0 right-0 h-[2px] bg-white/45" />

      {/* Zone labels */}
      <span className="absolute top-[40%] left-1/2 -translate-x-1/2 text-[8px] text-primary/35 font-semibold tracking-widest uppercase">Front Court</span>
      <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-[8px] text-primary/35 font-semibold tracking-widest uppercase">Back Court</span>
    </div>
  )
}
