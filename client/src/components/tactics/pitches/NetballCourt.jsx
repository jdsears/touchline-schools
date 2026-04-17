// Netball court markings - implemented in sub-task 2.4
export default function NetballCourt({ teamFormat = 7 }) {
  return (
    <div className="absolute inset-[4%] border-[2.5px] border-white/50 pointer-events-none rounded-sm">
      {/* Thirds */}
      <div className="absolute top-[33%] left-0 right-0 h-[2px] bg-white/50" />
      <div className="absolute top-[67%] left-0 right-0 h-[2px] bg-white/50" />
      {/* Goal circles (semi-circles) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[18%] border-[2.5px] border-t-0 border-white/50 rounded-b-full" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[18%] border-[2.5px] border-b-0 border-white/50 rounded-t-full" />
      {/* Centre circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12%] aspect-square border-[2.5px] border-white/50 rounded-full" />
      {/* Goal posts */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[5%] bg-white/70" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-[5%] bg-white/70" />
    </div>
  )
}
