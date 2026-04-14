export default function NetballCourt({ size = 'medium', className = '', children }) {
  const sizeClasses = { small: 'h-48', medium: 'h-64', large: 'h-80' }

  return (
    <div className={className}>
      <div
        className={`${sizeClasses[size]} aspect-[1/2] relative rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10`}
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%), #b45309`
        }}
      >
        {/* Court surface texture */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)`,
        }} />

        {/* Court outline */}
        <div className="absolute inset-[5%] border-2 border-white/70 rounded-sm pointer-events-none">
          {/* Third lines (court divided into 3 equal thirds) */}
          <div className="absolute top-[33.33%] left-0 right-0 border-t-2 border-white/70" />
          <div className="absolute top-[66.66%] left-0 right-0 border-t-2 border-white/70" />

          {/* Centre circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] aspect-square border-2 border-white/70 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/70 rounded-full" />

          {/* Goal circles (semicircles at each end) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] aspect-square border-2 border-white/70 rounded-full" style={{ clipPath: 'inset(50% 0 0 0)' }} />
          <div className="absolute top-0 left-[18%] right-[18%] h-[16%] border-b-2 border-x-2 border-white/70" style={{ borderRadius: '0 0 50% 50%' }} />

          <div className="absolute bottom-0 left-[18%] right-[18%] h-[16%] border-t-2 border-x-2 border-white/70" style={{ borderRadius: '50% 50% 0 0' }} />

          {/* Goal posts */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[8%] h-1 bg-white/80 rounded" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[8%] h-1 bg-white/80 rounded" />
        </div>

        {/* Third labels */}
        <div className="absolute top-[14%] left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-medium tracking-wider">GOAL THIRD</div>
        <div className="absolute top-[48%] left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-medium tracking-wider">CENTRE THIRD</div>
        <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-medium tracking-wider">GOAL THIRD</div>

        {children}
      </div>
    </div>
  )
}
