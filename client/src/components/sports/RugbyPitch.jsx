export default function RugbyPitch({ size = 'medium', className = '', children }) {
  const sizeClasses = { small: 'h-48', medium: 'h-64', large: 'h-80' }

  return (
    <div className={className}>
      <div
        className={`${sizeClasses[size]} aspect-[2/3] relative rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10`}
        style={{
          background: `
            linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
            linear-gradient(to bottom, #15803d 0%, #16a34a 25%, #22c55e 50%, #16a34a 75%, #15803d 100%)
          `
        }}
      >
        {/* Grass stripes */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 16px, transparent 16px, transparent 32px)`,
          backgroundSize: '100% 32px'
        }} />

        {/* Pitch outline */}
        <div className="absolute inset-[4%] border-2 border-white/50 rounded-sm pointer-events-none">
          {/* Halfway line */}
          <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/50" />

          {/* 22-metre lines */}
          <div className="absolute top-[22%] left-0 right-0 border-t-2 border-dashed border-white/30" />
          <div className="absolute bottom-[22%] left-0 right-0 border-t-2 border-dashed border-white/30" />

          {/* 10-metre lines (from halfway) */}
          <div className="absolute top-[40%] left-0 right-0 border-t border-white/20" />
          <div className="absolute bottom-[40%] left-0 right-0 border-t border-white/20" />

          {/* Try lines (goal lines) are the top and bottom of the pitch outline */}

          {/* In-goal areas */}
          <div className="absolute -top-[8%] left-0 right-0 h-[8%] border-b-2 border-white/30 border-x-2 border-t-2" />
          <div className="absolute -bottom-[8%] left-0 right-0 h-[8%] border-t-2 border-white/30 border-x-2 border-b-2" />

          {/* Goal posts (centre of try line) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12%] h-1 bg-white/60 rounded" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[12%] h-1 bg-white/60 rounded" />

          {/* Centre spot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />

          {/* 5-metre hash marks */}
          {[15, 30, 45, 55, 70, 85].map(y => (
            <div key={`l-${y}`} className="absolute border-t border-white/20 w-[3%]" style={{ top: `${y}%`, left: 0 }} />
          ))}
          {[15, 30, 45, 55, 70, 85].map(y => (
            <div key={`r-${y}`} className="absolute border-t border-white/20 w-[3%]" style={{ top: `${y}%`, right: 0 }} />
          ))}
        </div>

        {/* Labels */}
        <div className="absolute top-[4%] left-1/2 -translate-x-1/2 text-[8px] text-primary/30 font-medium">TRY LINE</div>
        <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 text-[8px] text-primary/30 font-medium">TRY LINE</div>

        {children}
      </div>
    </div>
  )
}
