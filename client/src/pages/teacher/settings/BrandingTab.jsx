import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Loader2, Mail } from 'lucide-react'

function Swatch({ label, color }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg border border-border-strong flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <div className="text-sm text-primary">{label}</div>
        <div className="text-xs font-mono text-secondary">{color}</div>
      </div>
    </div>
  )
}

export default function BrandingTab() {
  const [branding, setBranding] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    settingsService.getSchoolBranding()
      .then(r => setBranding(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-secondary" />
    </div>
  )

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Branding</h2>
        <p className="text-sm text-secondary mt-1">
          Your school's brand configuration, as set up by MoonBoots during onboarding.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border-default p-5 space-y-5">
        {/* Logo */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Logo</h3>
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt="School logo"
              className="h-16 object-contain rounded-lg bg-subtle p-2"
            />
          ) : (
            <div className="h-16 w-32 rounded-lg bg-subtle border border-border-strong flex items-center justify-center">
              <span className="text-xs text-tertiary">No logo set</span>
            </div>
          )}
        </div>

        {/* Colours */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Brand Colours</h3>
          <div className="space-y-3">
            <Swatch label="Primary"   color={branding?.primary_color   || '#1a365d'} />
            <Swatch label="Secondary" color={branding?.secondary_color || '#38a169'} />
            <Swatch label="Accent"    color={branding?.accent_color    || '#F97316'} />
          </div>
        </div>

        {/* Preview */}
        {branding && (
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">Preview</h3>
            <div className="flex gap-3 flex-wrap">
              <span
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: branding.primary_color || '#1a365d',
                  color: '#fff',
                }}
              >
                Primary button
              </span>
              <span
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: branding.accent_color || '#F97316',
                  color: '#fff',
                }}
              >
                Accent button
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Managed-by notice */}
      <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 flex items-start gap-3">
        <Mail className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <span className="text-amber-400 font-medium">Branding is managed by MoonBoots.</span>
          <span className="text-secondary ml-1">
            To request changes to your logo or colours, email{' '}
            <a href="mailto:hello@moonbootssports.com" className="underline text-amber-400 hover:text-amber-300">
              hello@moonbootssports.com
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}
