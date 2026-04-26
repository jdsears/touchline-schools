export default function CricketField({ size = 'medium', className = '', children }) {
  const sizeClasses = { small: 'h-48', medium: 'h-64', large: 'h-80' }

  return (
    <div className={className}>
      <div
        className={`${sizeClasses[size]} aspect-square relative rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10`}
        style={{
          background: `
            radial-gradient(ellipse at center, #22c55e 0%, #16a34a 40%, #15803d 70%, #14532d 100%)
          `
        }}
      >
        {/* Grass texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(60deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 6px)`,
        }} />

        {/* Boundary rope (circular) */}
        <div className="absolute inset-[6%] border-2 border-white/40 rounded-full pointer-events-none" />

        {/* 30-yard circle (inner ring) */}
        <div className="absolute inset-[22%] border-2 border-dashed border-white/30 rounded-full pointer-events-none" />

        {/* Pitch strip (centre) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[6%] h-[28%] bg-amber-700/60 border border-amber-600/40 rounded-sm pointer-events-none">
          {/* Crease lines */}
          {/* Popping crease (batting end) */}
          <div className="absolute bottom-[15%] left-[-40%] right-[-40%] border-t border-white/60" />
          {/* Popping crease (bowling end) */}
          <div className="absolute top-[15%] left-[-40%] right-[-40%] border-t border-white/60" />
          {/* Stumps */}
          <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 flex gap-[1px]">
            <div className="w-[2px] h-2 bg-white/70" />
            <div className="w-[2px] h-2 bg-white/70" />
            <div className="w-[2px] h-2 bg-white/70" />
          </div>
          <div className="absolute top-[12%] left-1/2 -translate-x-1/2 flex gap-[1px]">
            <div className="w-[2px] h-2 bg-white/70" />
            <div className="w-[2px] h-2 bg-white/70" />
            <div className="w-[2px] h-2 bg-white/70" />
          </div>
        </div>

        {/* Field position labels */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 text-[7px] text-primary/25 font-medium">LONG ON</div>
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 text-[7px] text-primary/25 font-medium">LONG OFF</div>
        <div className="absolute top-1/2 left-[10%] -translate-y-1/2 text-[7px] text-primary/25 font-medium">SQUARE LEG</div>
        <div className="absolute top-1/2 right-[8%] -translate-y-1/2 text-[7px] text-primary/25 font-medium">POINT</div>

        {children}
      </div>
    </div>
  )
}
