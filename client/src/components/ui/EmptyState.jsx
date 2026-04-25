export default function EmptyState({ icon: Icon, title, description, action, actionLabel, secondaryAction, secondaryLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-tertiary)' }}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      {title && <h3 className="heading-section mb-2">{title}</h3>}
      {description && <p className="text-secondary-styled max-w-sm">{description}</p>}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-5">
          {action && (
            <button onClick={action} className="btn-primary btn-sm">{actionLabel}</button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction} className="btn-tertiary text-sm">{secondaryLabel}</button>
          )}
        </div>
      )}
    </div>
  )
}
