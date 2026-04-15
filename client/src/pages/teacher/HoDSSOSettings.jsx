import { useState, useEffect } from 'react'
import { ssoService } from '../../services/api'
import { Link2, Shield, X, Plus, Check, AlertTriangle, Loader2, Save, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const PROVIDER_INFO = {
  microsoft: {
    label: 'Microsoft 365',
    icon: (
      <svg viewBox="0 0 21 21" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
        <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
        <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
      </svg>
    ),
    setupUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    setupInstructions: [
      'Go to Azure Portal → Azure Active Directory → App registrations',
      'Register a new application',
      'Set redirect URI to: https://app.moonbootssports.com/api/sso/microsoft/callback',
      'Add API permissions: Microsoft Graph → openid, profile, email (Delegated)',
      'Create a client secret and paste the values below',
    ],
    tenantHelp: 'Your Azure tenant ID (or "common" to allow any Microsoft 365 account)',
  },
  google: {
    label: 'Google Workspace',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
    setupInstructions: [
      'Go to Google Cloud Console → APIs & Services → Credentials',
      'Create OAuth 2.0 Client ID (Web application)',
      'Add redirect URI: https://app.moonbootssports.com/api/sso/google/callback',
      'Paste your Client ID and Secret below',
    ],
    hdHelp: 'Your Google Workspace domain (e.g. langleyprep.co.uk) - restricts sign-in to your school\'s accounts',
  },
}

export default function HoDSSOSettings() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState(null)
  const [tenantId, setTenantId] = useState('')
  const [hd, setHd] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [domains, setDomains] = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [domainLoading, setDomainLoading] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const res = await ssoService.getConfig()
      const c = res.data
      setConfig(c)
      setProvider(c.sso_provider || null)
      setTenantId(c.sso_config?.tenant_id || '')
      setHd(c.sso_config?.hd || '')
      setDomains(c.domains || [])
    } catch (err) {
      console.error('Failed to load SSO config:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = { provider }
      if (provider === 'microsoft') {
        if (tenantId) payload.tenant_id = tenantId
        if (clientId) payload.client_id = clientId
        if (clientSecret) payload.client_secret = clientSecret
      }
      if (provider === 'google') {
        if (hd) payload.hd = hd
        if (clientId) payload.client_id = clientId
        if (clientSecret) payload.client_secret = clientSecret
      }
      await ssoService.updateConfig(payload)
      toast.success('SSO configuration saved')
      setClientId('')
      setClientSecret('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save SSO config')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddDomain() {
    if (!newDomain.trim()) return
    setDomainLoading(true)
    try {
      const res = await ssoService.addDomain(newDomain.trim())
      setDomains(res.data)
      setNewDomain('')
      toast.success(`${newDomain} added to allowlist`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add domain')
    } finally {
      setDomainLoading(false)
    }
  }

  async function handleRemoveDomain(domain) {
    try {
      const res = await ssoService.removeDomain(domain)
      setDomains(res.data)
      toast.success(`${domain} removed`)
    } catch {
      toast.error('Failed to remove domain')
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  const providerInfo = provider ? PROVIDER_INFO[provider] : null
  const platformProviders = config?.platform_providers || {}

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Link2 className="w-7 h-7 text-pitch-400" />
          Single Sign-On (SSO)
        </h1>
        <p className="text-navy-400 mt-1">
          Allow staff to sign in with their school Microsoft 365 or Google Workspace account
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-pitch-400 shrink-0 mt-0.5" />
          <div className="text-sm text-navy-300 space-y-1">
            <p className="font-medium text-white">How SSO works</p>
            <p>Once configured, staff can click "Sign in with Microsoft" or "Sign in with Google" on the login page. Their school email is matched to their MoonBoots Sports account automatically - no separate password needed.</p>
            <p>If <strong className="text-white">domain auto-provisioning</strong> is enabled (via the allowlist below), new staff with that email domain are automatically added as Teachers when they first sign in via SSO.</p>
          </div>
        </div>
      </div>

      {/* Platform-level providers notice */}
      {!platformProviders.microsoft && !platformProviders.google && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              SSO is not yet enabled on this instance. Contact your MoonBoots Sports administrator to configure platform-level OAuth credentials, then you can set school-specific details here.
            </p>
          </div>
        </div>
      )}

      {/* Provider selector */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-6 mb-6">
        <h3 className="text-base font-semibold text-white mb-4">Identity Provider</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[{ value: null, label: 'Disabled', icon: null }, ...Object.entries(PROVIDER_INFO).map(([k, v]) => ({ value: k, ...v }))].map(p => (
            <button
              key={p.value ?? 'none'}
              onClick={() => setProvider(p.value)}
              disabled={p.value && !platformProviders[p.value]}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                provider === p.value
                  ? 'border-pitch-500 bg-pitch-600/10 text-white'
                  : 'border-navy-700 hover:border-navy-600 text-navy-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {p.icon ? p.icon : <div className="w-5 h-5 rounded bg-navy-700" />}
              <span className="text-sm font-medium">{p.label}</span>
              {provider === p.value && <Check className="w-3.5 h-3.5 text-pitch-400 ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Provider-specific config */}
      {providerInfo && (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              {providerInfo.icon}
              {providerInfo.label} Configuration
            </h3>
            <a
              href={providerInfo.setupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-pitch-400 hover:text-pitch-300 flex items-center gap-1"
            >
              Set up in {providerInfo.label} <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Setup instructions */}
          <ol className="space-y-1">
            {providerInfo.setupInstructions.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-navy-400">
                <span className="shrink-0 w-4 h-4 rounded-full bg-navy-700 flex items-center justify-center text-[10px] text-navy-300 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder={config?.sso_config?.has_client_id ? '••••• (saved)' : 'Paste client ID'}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-600 focus:outline-none focus:border-pitch-500"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder={config?.sso_config?.has_client_secret ? '••••• (saved)' : 'Paste client secret'}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-600 focus:outline-none focus:border-pitch-500"
              />
            </div>

            {provider === 'microsoft' && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">Tenant ID</label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  placeholder="common (or your tenant ID)"
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-600 focus:outline-none focus:border-pitch-500"
                />
                <p className="text-xs text-navy-600 mt-1">{providerInfo.tenantHelp}</p>
              </div>
            )}

            {provider === 'google' && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">Hosted Domain (hd)</label>
                <input
                  type="text"
                  value={hd}
                  onChange={e => setHd(e.target.value)}
                  placeholder="e.g. langleyprep.co.uk"
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-600 focus:outline-none focus:border-pitch-500"
                />
                <p className="text-xs text-navy-600 mt-1">{providerInfo.hdHelp}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Domain auto-provisioning allowlist */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-6 mb-6">
        <h3 className="text-base font-semibold text-white mb-1">Domain Auto-Provisioning</h3>
        <p className="text-sm text-navy-400 mb-4">
          Email domains on this list are automatically provisioned as Teachers when signing in via SSO for the first time.
          Only add domains that belong exclusively to your school (e.g. your MIS or Google Workspace domain).
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
            placeholder="e.g. langleyprep.co.uk"
            className="flex-1 px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-600 focus:outline-none focus:border-pitch-500"
          />
          <button
            onClick={handleAddDomain}
            disabled={!newDomain.trim() || domainLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {domainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>

        {domains.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {domains.map(d => (
              <div key={d} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 rounded-lg text-sm text-white">
                <Check className="w-3.5 h-3.5 text-pitch-400" />
                {d}
                <button
                  onClick={() => handleRemoveDomain(d)}
                  className="ml-1 text-navy-500 hover:text-alert-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-navy-600">No domains configured. Auto-provisioning is disabled.</p>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save SSO Settings
        </button>
      </div>
    </div>
  )
}
