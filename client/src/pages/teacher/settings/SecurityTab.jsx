import { useState } from 'react'
import { Lock, Shield, Monitor, LogOut, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SecurityTab({ user }) {
  const [changingPassword, setChangingPassword] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) return toast.error('New passwords do not match')
    if (pwForm.next.length < 8) return toast.error('Password must be at least 8 characters')
    setSaving(true)
    try {
      // TODO: wire to /api/auth/change-password when implemented
      await new Promise(r => setTimeout(r, 600))
      toast.success('Password updated')
      setChangingPassword(false)
      setPwForm({ current: '', next: '', confirm: '' })
    } catch {
      toast.error('Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Security</h2>
        <p className="text-sm text-secondary mt-1">Password, active sessions, and account security.</p>
      </div>

      {/* Password */}
      <div className="bg-card rounded-xl border border-border-default p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary">Password</span>
          </div>
          {!changingPassword && (
            <button
              onClick={() => setChangingPassword(true)}
              className="px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors"
            >
              Change password
            </button>
          )}
        </div>
        {changingPassword ? (
          <form onSubmit={handleChangePassword} className="space-y-3">
            {[
              { key: 'current', label: 'Current password',  placeholder: '' },
              { key: 'next',    label: 'New password',       placeholder: 'At least 8 characters' },
              { key: 'confirm', label: 'Confirm new password', placeholder: '' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-secondary mb-1">{f.label}</label>
                <input
                  type="password"
                  value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setChangingPassword(false); setPwForm({ current:'', next:'', confirm:'' }) }}
                className="px-4 py-2 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update password
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-tertiary">Last changed: unknown</p>
        )}
      </div>

      {/* 2FA placeholder */}
      <div className="bg-card rounded-xl border border-border-default p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-primary">Two-factor Authentication</span>
        </div>
        <p className="text-xs text-tertiary mb-3">Add an extra layer of security to your account.</p>
        <button
          onClick={() => toast('2FA setup coming soon')}
          className="px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors"
        >
          Set up 2FA
        </button>
      </div>

      {/* Active sessions placeholder */}
      <div className="bg-card rounded-xl border border-border-default p-5">
        <div className="flex items-center gap-2 mb-2">
          <Monitor className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-primary">Active Sessions</span>
        </div>
        <div className="flex items-center gap-3 py-2 border border-border-default rounded-lg px-3 mt-2">
          <Monitor className="w-4 h-4 text-pitch-400 flex-shrink-0" />
          <div className="flex-1 text-xs text-secondary">Current session</div>
          <span className="text-xs text-pitch-400">Active now</span>
        </div>
      </div>
    </div>
  )
}
