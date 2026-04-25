export function SkeletonLine({ width = '100%', height = 16 }) {
  return (
    <div className="animate-pulse rounded"
      style={{ width, height, backgroundColor: 'var(--color-bg-subtle)' }} />
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-3">
      <SkeletonLine width="40%" height={20} />
      <SkeletonLine width="80%" />
      <SkeletonLine width="60%" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 space-y-3">
        <SkeletonLine width="30%" height={12} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <SkeletonLine key={j} width={`${20 + Math.random() * 30}%`} height={14} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }) {
  return (
    <div className="animate-pulse rounded-full"
      style={{ width: size, height: size, backgroundColor: 'var(--color-bg-subtle)' }} />
  )
}
