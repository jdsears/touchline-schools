export default function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, destructive }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content p-6 max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="heading-subsection mb-2">{title}</h3>
        {description && <p className="text-secondary-styled mb-5">{description}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost btn-sm" autoFocus>Cancel</button>
          <button onClick={onConfirm} className={destructive ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
