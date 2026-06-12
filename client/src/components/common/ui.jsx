import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'

// Shared design primitives for the app shell. Keep these boring and
// consistent - every teacher page should read the same way.

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.015em] text-primary">{title}</h1>
        {subtitle && <p className="mt-1.5 text-secondary">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function IconTile({ icon: Icon, size = 'md', className = '' }) {
  const dims = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl'
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
  return (
    <span className={`flex shrink-0 items-center justify-center bg-brand-primary ${dims} ${className}`}>
      <Icon className={`${icon} text-brand-accent`} strokeWidth={1.9} />
    </span>
  )
}

function AnimatedNumber({ value }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) })
    return () => controls.stop()
  }, [inView, value])
  return <span ref={ref}>{n}</span>
}

export function StatCard({ label, value, suffix = '', sub, trend }) {
  const numeric = typeof value === 'number' && Number.isFinite(value)
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border-default bg-card px-4 py-3.5 transition-shadow hover:shadow-sm">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tertiary">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-primary tabular-nums">
          {numeric ? <AnimatedNumber value={value} /> : (value ?? '—')}
          {suffix}
        </span>
        {trend && (
          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            trend.tone === 'positive' ? 'bg-status-success-tint text-status-success'
              : trend.tone === 'negative' ? 'bg-status-error-tint text-status-error'
              : 'bg-subtle text-tertiary'
          }`}>
            {trend.label}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-[11.5px] text-tertiary">{sub}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, hint, actionLabel, onAction, actionTo, linkComponent: LinkComp }) {
  return (
    <div className="py-10 text-center">
      {Icon && (
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle">
          <Icon className="h-6 w-6 text-tertiary" strokeWidth={1.6} />
        </span>
      )}
      <h3 className="font-display text-base font-semibold text-primary">{title}</h3>
      {hint && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-secondary">{hint}</p>}
      {actionLabel && (onAction || actionTo) && (
        onAction ? (
          <button
            onClick={onAction}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-4 py-2 text-xs font-medium text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            {actionLabel}
          </button>
        ) : (
          <LinkComp
            to={actionTo}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-4 py-2 text-xs font-medium text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            {actionLabel}
          </LinkComp>
        )
      )}
    </div>
  )
}
