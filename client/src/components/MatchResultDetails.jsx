import { Plus, X } from 'lucide-react'
import { getResultSchema } from '../constants/sports'

// Sport-specific result details: editor (inside the record-result modal)
// and a compact summary (on the result card). Data lives in
// matches.result_data (JSONB) and is shaped by RESULT_SCHEMAS.

const inputCls =
  'input w-full text-sm'

function InningsEditor({ schema, value, onChange, usLabel, themLabel }) {
  const data = value || {}
  const update = (sideKey, fieldKey, v) =>
    onChange({ ...data, [sideKey]: { ...(data[sideKey] || {}), [fieldKey]: v } })
  return (
    <div className="grid grid-cols-2 gap-4">
      {[['for', usLabel], ['against', themLabel]].map(([sideKey, label]) => (
        <div key={sideKey} className="space-y-2">
          <p className="text-xs font-semibold text-secondary">{label}</p>
          {schema.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-[11px] text-tertiary mb-0.5">{f.label}</label>
              <input
                type={f.type}
                step={f.step}
                min={f.type === 'number' ? 0 : undefined}
                placeholder={f.placeholder || ''}
                value={data[sideKey]?.[f.key] ?? ''}
                onChange={(e) => update(sideKey, f.key, f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function RowListEditor({ schema, value, onChange }) {
  const rows = value?.rows || []
  const setRows = (rows) => onChange({ ...(value || {}), rows })
  const updateRow = (i, key, v) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)))
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-secondary">{schema.rowsLabel}</p>
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          {schema.columns.map((c) => (
            <input
              key={c.key}
              type={c.type}
              placeholder={c.placeholder || c.label}
              value={row[c.key] ?? ''}
              onChange={(e) => updateRow(i, c.key, e.target.value)}
              className={`${inputCls} ${c.key === 'position' || c.key === 'score' ? 'max-w-[90px]' : ''}`}
            />
          ))}
          <button
            type="button"
            aria-label="Remove row"
            onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            className="mt-2 shrink-0 text-tertiary hover:text-status-error transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, {}])}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline"
      >
        <Plus className="w-3.5 h-3.5" /> Add {schema.rowsLabel.replace(/s$/, '').toLowerCase()}
      </button>
    </div>
  )
}

export function ResultDetailsEditor({ sport, value, onChange, usLabel = 'Us', themLabel = 'Them' }) {
  const schema = getResultSchema(sport)
  if (!schema) return null
  return (
    <div className="mt-5 pt-5 border-t border-border-default">
      {schema.type === 'innings' ? (
        <InningsEditor schema={schema} value={value} onChange={onChange} usLabel={usLabel} themLabel={themLabel} />
      ) : (
        <RowListEditor schema={schema} value={value} onChange={onChange} />
      )}
    </div>
  )
}

export function ResultDetailsSummary({ sport, data, usLabel = 'Us', themLabel = 'Them' }) {
  const schema = getResultSchema(sport)
  if (!schema || !data) return null
  if (schema.type === 'innings') {
    const us = schema.summarise(data.for)
    const them = schema.summarise(data.against)
    if (!us && !them) return null
    return (
      <p className="text-sm text-secondary">
        {usLabel} <span className="font-semibold text-primary">{us || '—'}</span>
        <span className="mx-2 text-tertiary">·</span>
        {themLabel} <span className="font-semibold text-primary">{them || '—'}</span>
      </p>
    )
  }
  const rows = (data.rows || []).filter((r) => Object.values(r).some(Boolean))
  if (rows.length === 0) return null
  return (
    <div className="space-y-1">
      {rows.map((row, i) => (
        <p key={i} className="text-sm text-secondary">
          {schema.columns
            .map((c) => row[c.key])
            .filter(Boolean)
            .join(' · ')}
        </p>
      ))}
    </div>
  )
}
