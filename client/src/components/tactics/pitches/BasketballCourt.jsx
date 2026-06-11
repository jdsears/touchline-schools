export default function BasketballCourt() {
  return (
    <div className="absolute inset-[4%] border-[2.5px] border-white/55 pointer-events-none rounded-sm">
      {/* Halfway line */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/55" />
      {/* Centre circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[16%] aspect-square border-[2.5px] border-white/55 rounded-full" />

      {/* Top key (attacking) */}
      <div className="absolute top-0 left-[34%] right-[34%] h-[19%] border-[2.5px] border-white/55 border-t-0" />
      <div className="absolute top-[19%] left-1/2 -translate-x-1/2 w-[16%] aspect-square -translate-y-1/2 border-[2.5px] border-white/55 rounded-full" />
      {/* Top three-point arc */}
      <div
        className="absolute border-[2.5px] border-white/40 rounded-b-full"
        style={{ top: 0, left: '12%', right: '12%', height: '32%', borderTopWidth: 0 }}
      />
      {/* Top basket */}
      <div className="absolute top-[4.5%] left-1/2 -translate-x-1/2 w-[4%] aspect-square border-[2px] border-white/80 rounded-full" />

      {/* Bottom key (defending) */}
      <div className="absolute bottom-0 left-[34%] right-[34%] h-[19%] border-[2.5px] border-white/55 border-b-0" />
      <div className="absolute bottom-[19%] left-1/2 -translate-x-1/2 w-[16%] aspect-square translate-y-1/2 border-[2.5px] border-white/55 rounded-full" />
      {/* Bottom three-point arc */}
      <div
        className="absolute border-[2.5px] border-white/40 rounded-t-full"
        style={{ bottom: 0, left: '12%', right: '12%', height: '32%', borderBottomWidth: 0 }}
      />
      {/* Bottom basket */}
      <div className="absolute bottom-[4.5%] left-1/2 -translate-x-1/2 w-[4%] aspect-square border-[2px] border-white/80 rounded-full" />
    </div>
  )
}
