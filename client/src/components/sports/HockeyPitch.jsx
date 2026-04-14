export default function HockeyPitch({ size = 'medium', className = '', children }) {
  const sizeClasses = { small: 'h-48', medium: 'h-64', large: 'h-80' }

  return (
    <div className={className}>
      <div
        className={`${sizeClasses[size]} aspect-[1/2] relative rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10`}
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%), #1565C0`
        }}
      >
        {/* Astroturf texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 4px, transparent 4px, transparent 8px)`,
          backgroundSize: '100% 8px'
        }} />

        {/* Pitch outline */}
        <div className="absolute inset-[5%] border-2 border-white/60 rounded-sm pointer-events-none">
          {/* Centre line */}
          <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/60" />

          {/* Centre spot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/70 rounded-full" />

          {/* 25-yard lines (dotted) */}
          <div className="absolute top-[25%] left-0 right-0 border-t-2 border-dashed border-white/40" />
          <div className="absolute bottom-[25%] left-0 right-0 border-t-2 border-dashed border-white/40" />

          {/* Shooting circles (D shapes) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55%] aspect-square border-2 border-white/60 rounded-full" style={{ clipPath: 'inset(50% 0 0 0)' }}>
          </div>
          {/* Top D - using a different approach */}
          <div className="absolute top-0 left-[15%] right-[15%] h-[18%] border-b-2 border-x-2 border-white/60" style={{ borderRadius: '0 0 50% 50%' }} />
          {/* Bottom D */}
          <div className="absolute bottom-0 left-[15%] right-[15%] h-[18%] border-t-2 border-x-2 border-white/60" style={{ borderRadius: '50% 50% 0 0' }} />

          {/* Penalty spots */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
          <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />

          {/* Goals */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-[14%] h-[3%] border-2 border-white/60 bg-white/10" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-[14%] h-[3%] border-2 border-white/60 bg-white/10" />
        </div>

        {children}
      </div>
    </div>
  )
}
