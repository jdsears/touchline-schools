import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function ThemeToggle({ compact }) {
  const { preference, setPreference } = useTheme()

  if (compact) {
    return (
      <button onClick={() => setPreference(p => p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light')}
        className="btn-ghost btn-sm" title={`Theme: ${preference}`}>
        {preference === 'light' ? <Sun className="w-4 h-4" /> : preference === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
      </button>
    )
  }

  return (
    <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
      {OPTIONS.map(opt => {
        const Icon = opt.icon
        const active = preference === opt.value
        return (
          <button key={opt.value} onClick={() => setPreference(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              active ? 'bg-brand-navy text-on-dark' : 'text-secondary hover:text-primary'
            }`}>
            <Icon className="w-4 h-4" />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
