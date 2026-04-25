const STATUS_MAP = {
  open: 'status-open',
  'in-progress': 'status-in-progress',
  'in_progress': 'status-in-progress',
  closed: 'status-closed',
  published: 'status-published',
  draft: 'status-draft',
  cancelled: 'status-cancelled',
  granted: 'badge-pitch',
  pending: 'badge-caution',
  refused: 'badge-alert',
  expired: 'badge-navy',
  excluded: 'badge-alert',
  cleared: 'badge-pitch',
}

export default function StatusBadge({ status, label }) {
  const cls = STATUS_MAP[status?.toLowerCase()] || 'badge-navy'
  const text = label || status?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || ''
  return <span className={cls}>{text}</span>
}
