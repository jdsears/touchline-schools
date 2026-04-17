export default function NetballCourt({ teamFormat = 7 }) {
  return (
    <div className="absolute inset-[4%] border-[2.5px] border-white/55 pointer-events-none rounded-sm">
      {/* Court thirds */}
      <div className="absolute top-[33.33%] left-0 right-0 h-[2px] bg-white/55" />
      <div className="absolute top-[66.67%] left-0 right-0 h-[2px] bg-white/55" />

      {/* Goal circles - top (shooting circle, semi-circle) */}
      <div
        className="absolute border-[2.5px] border-white/55 rounded-b-full"
        style={{ top: 0, left: '25%', right: '25%', height: '29%', borderTopWidth: 0 }}
      />
      {/* Goal circles - bottom */}
      <div
        className="absolute border-[2.5px] border-white/55 rounded-t-full"
        style={{ bottom: 0, left: '25%', right: '25%', height: '29%', borderBottomWidth: 0 }}
      />

      {/* Goal posts (centre top) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[6%] bg-white/80" />
      {/* Goal posts (centre bottom) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-[6%] bg-white/80" />

      {/* Centre circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[14%] aspect-square border-[2.5px] border-white/55 rounded-full" />

      {/* Centre transverse line tick marks */}
      <div className="absolute top-[33.33%] left-[48%] right-[48%] h-[3%] bg-white/30 -translate-y-1/2" />

      {/* Zone labels */}
      <span className="absolute top-[16%] left-1/2 -translate-x-1/2 text-[8px] text-white/35 font-semibold tracking-widest uppercase">Att. Third</span>
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-6 text-[8px] text-white/35 font-semibold tracking-widest uppercase">Centre</span>
      <span className="absolute bottom-[16%] left-1/2 -translate-x-1/2 text-[8px] text-white/35 font-semibold tracking-widest uppercase">Def. Third</span>
    </div>
  )
}
