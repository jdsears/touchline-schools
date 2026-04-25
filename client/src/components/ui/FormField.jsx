import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

export function FormField({ label, help, error, required, optional, children, className = '' }) {
  const labelCls = `label${required ? ' label-required' : ''}${optional ? ' label-optional' : ''}`
  return (
    <div className={`form-group ${className}`}>
      {label && <label className={labelCls}>{label}</label>}
      {children}
      {error && <p className="field-error"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}
      {!error && help && <p className="field-help">{help}</p>}
    </div>
  )
}

export function TextInput({ label, help, error, required, optional, className = '', ...props }) {
  return (
    <FormField label={label} help={help} error={error} required={required} optional={optional}>
      <input className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />
    </FormField>
  )
}

export function TextArea({ label, help, error, required, optional, className = '', rows = 3, ...props }) {
  return (
    <FormField label={label} help={help} error={error} required={required} optional={optional}>
      <textarea className={`textarea ${error ? 'input-error' : ''} ${className}`} rows={rows} {...props} />
    </FormField>
  )
}

export function Select({ label, help, error, required, optional, children, className = '', ...props }) {
  return (
    <FormField label={label} help={help} error={error} required={required} optional={optional}>
      <select className={`select ${error ? 'input-error' : ''} ${className}`} {...props}>{children}</select>
    </FormField>
  )
}

export function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer text-sm ${className}`}>
      <input type="checkbox" className="checkbox" {...props} />
      <span style={{ color: 'var(--color-text-primary)' }}>{label}</span>
    </label>
  )
}

export function RadioGroup({ label, options, value, onChange, name, layout = 'vertical' }) {
  return (
    <FormField label={label}>
      <div className={`flex ${layout === 'horizontal' ? 'flex-row gap-4' : 'flex-col gap-2'}`}>
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer text-sm">
            <input type="radio" name={name} className="radio" checked={value === opt.value}
              onChange={() => onChange(opt.value)} />
            <span style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </FormField>
  )
}

export function FileUpload({ label, help, accept, onFile, className = '' }) {
  const [dragActive, setDragActive] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) onFile?.(e.dataTransfer.files[0])
  }

  function handleChange(e) {
    if (e.target.files?.[0]) onFile?.(e.target.files[0])
  }

  return (
    <FormField label={label} help={help}>
      <label className={`file-upload ${dragActive ? 'file-upload-active' : ''} ${className}`}
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Drop file here or click to browse
        </span>
        <span className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          {accept || 'Any file type'}
        </span>
        <input type="file" className="sr-only" accept={accept} onChange={handleChange} />
      </label>
    </FormField>
  )
}
