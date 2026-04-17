// Hockey pitch markings - implemented in sub-task 2.3
export default function HockeyPitch({ teamFormat = 11 }) {
  return (
    <div className="absolute inset-[4%] border-[2.5px] border-white/50 pointer-events-none rounded-sm">
      <div className="absolute top-1/2 left-0 right-0 h-[2.5px] bg-white/50 -translate-y-1/2" />
      <div className="absolute top-[17%] left-1/2 -translate-x-1/2 w-[60%] h-[17%] border-[2.5px] border-t-0 border-white/50 rounded-b-full" />
      <div className="absolute bottom-[17%] left-1/2 -translate-x-1/2 w-[60%] h-[17%] border-[2.5px] border-b-0 border-white/50 rounded-t-full" />
      <div className="absolute top-[17%] left-0 right-0 h-[2px] bg-white/35" />
      <div className="absolute bottom-[17%] left-0 right-0 h-[2px] bg-white/35" />
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
      <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
    </div>
  )
}
