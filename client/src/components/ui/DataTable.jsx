import { useState } from 'react'
import { ChevronUp, ChevronDown, Rows3, Rows4 } from 'lucide-react'

export default function DataTable({ columns, data, onRowClick, compact: initialCompact, emptyMessage = 'No data to display' }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [compact, setCompact] = useState(initialCompact || false)

  function handleSort(col) {
    if (!col.sortable) return
    if (sortCol === col.key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col.key)
      setSortDir('asc')
    }
  }

  const sorted = sortCol
    ? [...data].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol]
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  return (
    <div className="card overflow-hidden">
      {/* Density toggle */}
      <div className="flex justify-end px-3 py-1.5 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <button onClick={() => setCompact(c => !c)} className="btn-ghost btn-sm flex items-center gap-1 text-xs"
          title={compact ? 'Comfortable view' : 'Compact view'}>
          {compact ? <Rows3 className="w-3.5 h-3.5" /> : <Rows4 className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className={`data-table ${compact ? 'data-table-compact' : ''}`}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col)}
                  className={col.sortable ? 'cursor-pointer select-none' : ''}
                  style={{ textAlign: col.align || 'left', width: col.width }}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortCol === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-12" style={{ color: 'var(--color-text-tertiary)' }}>{emptyMessage}</td></tr>
            ) : sorted.map((row, i) => (
              <tr key={row.id || i} onClick={() => onRowClick?.(row)} className={onRowClick ? 'cursor-pointer' : ''}>
                {columns.map(col => (
                  <td key={col.key} className={col.numeric ? 'numeric' : col.center ? 'center' : ''}
                    style={{ textAlign: col.align }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
