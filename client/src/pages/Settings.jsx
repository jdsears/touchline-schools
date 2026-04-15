import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTeam, isLightColor } from '../context/TeamContext'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon, User, Users, CreditCard,
  Bell, Shield, Loader2, Check, UserPlus, Copy, Mail, Palette, Link as LinkIcon, X,
  Target, Plus, Trash2, ExternalLink, CheckCircle, Video, RefreshCw, Eye, EyeOff, AlertTriangle,
  Share2, Lock, MessageCircle, Award, BookOpen, Upload, FileText, Search, Tag
} from 'lucide-react'
import toast from 'react-hot-toast'
import QuickStartGuide from '../components/QuickStartGuide'
import { teamService, playerChatService, streamingService, profileService, knowledgeBaseService } from '../services/api'
import { getEntitlements, getUsage, getSubscription, createPortalSession, syncSubscription } from '../services/billing'
import { Link, useSearchParams } from 'react-router-dom'

// Formations by team format
const FORMATIONS_BY_FORMAT = {
  11: ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '4-1-4-1', '4-5-1', '5-3-2', '5-4-1', '4-4-2 Diamond', '4-3-2-1', '3-4-2-1', '4-1-2-1-2', '3-3-4', '2-3-5'],
  9: ['3-3-2', '3-2-3', '2-4-2', '3-1-3-1', '2-3-2-1', '2-3-3'],
  7: ['2-3-1', '3-2-1', '2-1-2-1', '1-2-1-2', '3-1-2'],
  5: ['2-1-1', '1-2-1', '2-2', '1-1-2', '3-1'],
}

// Default to 11-a-side for backwards compatibility
const FORMATIONS = FORMATIONS_BY_FORMAT[11]

// Map age groups to recommended team format (FA guidelines)
const AGE_GROUP_FORMAT_MAP = {
  'U7': 5, 'U8': 5,
  'U9': 7, 'U10': 7,
  'U11': 9, 'U12': 9,
  'U13': 11, 'U14': 11, 'U15': 11, 'U16': 11, 'U17': 11, 'U18': 11,
  'Adult': 11,
}

const presetColors = [
  { name: 'Green', color: '#22C55E' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Yellow', color: '#EAB308' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Purple', color: '#A855F7' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'Navy', color: '#1E3A5F' },
  { name: 'Black', color: '#171717' },
  { name: 'White', color: '#F5F5F5' },
  { name: 'Gold', color: '#FFD700' },
]

// Knowledge Base categories
const KB_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'coaching_guidelines', label: 'Coaching Guidelines' },
  { value: 'session_plans', label: 'Session Plans' },
  { value: 'player_development', label: 'Pupil Development' },
  { value: 'tactical', label: 'Tactical' },
  { value: 'match_prep', label: 'Match Preparation' },
  { value: 'observations', label: 'Observations' },
  { value: 'safeguarding', label: 'Safeguarding' },
]

const AGE_GROUPS = ['U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'Adult']

// Knowledge Base Tab Component
function KnowledgeBaseTab({ teamId }) {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMode, setAddMode] = useState('text') // 'text' or 'file'
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'general',
    ageGroup: '',
    tags: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (teamId) loadData()
  }, [teamId])

  async function loadData() {
    setLoading(true)
    try {
      const [docsRes, statsRes] = await Promise.all([
        knowledgeBaseService.getDocuments(teamId),
        knowledgeBaseService.getStats(teamId),
      ])
      setDocuments(docsRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to load knowledge base:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitText(e) {
    e.preventDefault()
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required')
      return
    }
    setSaving(true)
    try {
      const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      await knowledgeBaseService.addText(teamId, {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        category: formData.category,
        ageGroup: formData.ageGroup || null,
        tags,
      })
      toast.success('Content added to knowledge base')
      setFormData({ title: '', description: '', content: '', category: 'general', ageGroup: '', tags: '' })
      setShowAddForm(false)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add content')
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadFile(e) {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('title', formData.title || selectedFile.name)
      fd.append('description', formData.description || '')
      fd.append('category', formData.category)
      if (formData.ageGroup) fd.append('ageGroup', formData.ageGroup)
      const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      fd.append('tags', JSON.stringify(tags))
      await knowledgeBaseService.uploadFile(teamId, fd)
      toast.success('File processed and added to knowledge base')
      setSelectedFile(null)
      setFormData({ title: '', description: '', content: '', category: 'general', ageGroup: '', tags: '' })
      setShowAddForm(false)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process file')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(docId) {
    setDeleting(docId)
    try {
      await knowledgeBaseService.deleteDocument(teamId, docId)
      toast.success('Document removed from knowledge base')
      loadData()
    } catch (error) {
      toast.error('Failed to delete document')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-pitch-400" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white mb-1">Coaching Knowledge Base</h2>
            <p className="text-navy-400 text-sm">
              Add your coaching resources, session plans, and notes. The Gaffer will use this knowledge to give advice grounded in your methodology.
            </p>
          </div>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setAddMode('text') }}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Content
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-navy-800/50 rounded-lg border border-navy-700">
              <p className="text-2xl font-bold text-white">{stats.document_count || 0}</p>
              <p className="text-xs text-navy-400">Documents</p>
            </div>
            <div className="p-3 bg-navy-800/50 rounded-lg border border-navy-700">
              <p className="text-2xl font-bold text-white">{stats.total_chunks || 0}</p>
              <p className="text-xs text-navy-400">Knowledge Chunks</p>
            </div>
            <div className="p-3 bg-navy-800/50 rounded-lg border border-navy-700">
              <p className="text-2xl font-bold text-white">{stats.categories?.filter(Boolean).length || 0}</p>
              <p className="text-xs text-navy-400">Categories</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Content Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-white">Add to Knowledge Base</h3>
            <button onClick={() => setShowAddForm(false)} className="text-navy-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAddMode('text')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'text'
                  ? 'bg-pitch-500/20 text-pitch-400 border border-pitch-500/30'
                  : 'bg-navy-800 text-navy-400 border border-navy-700 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Text
            </button>
            <button
              onClick={() => setAddMode('file')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'file'
                  ? 'bg-pitch-500/20 text-pitch-400 border border-pitch-500/30'
                  : 'bg-navy-800 text-navy-400 border border-navy-700 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          </div>

          <form onSubmit={addMode === 'text' ? handleSubmitText : handleUploadFile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. FA Passing & Receiving Guide, My Session Plans for U13"
                className="input w-full"
                required={addMode === 'text'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this resource"
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                >
                  {KB_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Age Group</label>
                <select
                  value={formData.ageGroup}
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                  className="input w-full"
                >
                  <option value="">All Ages</option>
                  {AGE_GROUPS.map(ag => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">
                Tags <span className="text-navy-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g. passing, warm-up, defending, set pieces"
                className="input w-full"
              />
            </div>

            {addMode === 'text' ? (
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Paste your coaching notes, session plans, guidelines, or any coaching knowledge here..."
                  className="input w-full min-h-[200px] resize-y"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">File</label>
                <div className="border-2 border-dashed border-navy-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".txt,.csv,.md"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="hidden"
                    id="kb-file-upload"
                  />
                  <label htmlFor="kb-file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-navy-400 mx-auto mb-2" />
                    <p className="text-sm text-navy-400">
                      {selectedFile ? (
                        <span className="text-pitch-400">{selectedFile.name}</span>
                      ) : (
                        <>Click to upload a <span className="text-white">text, CSV, or markdown</span> file</>
                      )}
                    </p>
                    <p className="text-xs text-navy-500 mt-1">Max 5MB</p>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Knowledge Base
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Documents List */}
      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold text-white mb-4">Your Coaching Resources</h3>

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-navy-600 mx-auto mb-3" />
            <p className="text-navy-400 mb-1">No resources added yet</p>
            <p className="text-sm text-navy-500">
              Add coaching guidelines, session plans, or your own notes to make The Gaffer's advice specific to your team.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-start justify-between p-4 bg-navy-800/50 rounded-lg border border-navy-700 hover:border-navy-600 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    doc.status === 'ready' ? 'bg-pitch-500/20' : 'bg-amber-500/20'
                  }`}>
                    {doc.source_type === 'file' ? (
                      <FileText className={`w-5 h-5 ${doc.status === 'ready' ? 'text-pitch-400' : 'text-amber-400'}`} />
                    ) : (
                      <BookOpen className={`w-5 h-5 ${doc.status === 'ready' ? 'text-pitch-400' : 'text-amber-400'}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">{doc.title}</p>
                      {doc.source_type === 'fa_guidelines' && (
                        <span className="px-2 py-0.5 bg-pitch-500/20 text-pitch-400 text-xs rounded font-medium flex-shrink-0">
                          Auto
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-navy-400 truncate">{doc.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-navy-700 text-navy-300 text-xs rounded">
                        {KB_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                      </span>
                      {doc.age_group && (
                        <span className="px-2 py-0.5 bg-navy-700 text-navy-300 text-xs rounded">
                          {doc.age_group}
                        </span>
                      )}
                      <span className="text-xs text-navy-500">
                        {doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''}
                      </span>
                      {doc.status !== 'ready' && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="text-navy-500 hover:text-alert-400 transition-colors ml-2 flex-shrink-0"
                  title="Remove from knowledge base"
                >
                  {deleting === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="card p-6 bg-navy-800/30 border-navy-700">
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-pitch-400" />
          What to add to your Knowledge Base
        </h4>
        <ul className="space-y-2 text-sm text-navy-400">
          <li className="flex items-start gap-2">
            <span className="text-pitch-400 mt-0.5">•</span>
            <span><strong className="text-navy-300">FA development guidelines</strong> are automatically added for your age group (marked <span className="px-1.5 py-0.5 bg-pitch-500/20 text-pitch-400 text-xs rounded">Auto</span>). They update when you change age group.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pitch-400 mt-0.5">•</span>
            <span><strong className="text-navy-300">Session plan libraries</strong> and drill collections you use</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pitch-400 mt-0.5">•</span>
            <span><strong className="text-navy-300">Your own coaching notes</strong> and observations from training and matches</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pitch-400 mt-0.5">•</span>
            <span><strong className="text-navy-300">Team-specific methodology</strong> and principles of play</span>
          </li>
        </ul>
      </div>
    </motion.div>
  )
}

// Billing Tab Component
function BillingTab({ teamId, userEmail }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [entitlements, setEntitlements] = useState(null)
  const [usage, setUsage] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    // Check for success parameter from Stripe checkout
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      // Clear the success param from URL
      searchParams.delete('success')
      setSearchParams(searchParams, { replace: true })

      // Sync subscription from Stripe — safety net in case the webhook was missed.
      // This ensures the local subscription record exists after checkout.
      if (teamId) {
        syncSubscription(teamId).then(result => {
          if (result.synced) {
            console.log(`[Billing] Subscription synced from Stripe: ${result.action} (${result.planId})`)
          }
          // Reload billing data after sync attempt
          loadBillingData()
        }).catch(err => {
          console.error('[Billing] Subscription sync failed:', err)
          loadBillingData()
        })
        return // loadBillingData will be called after sync
      }
    }
    loadBillingData()
  }, [teamId])

  async function loadBillingData(skipSync = false) {
    if (!teamId) {
      setLoading(false)
      return
    }

    try {
      const [entResult, usageResult, subResult] = await Promise.all([
        getEntitlements(teamId),
        getUsage(teamId),
        getSubscription(teamId),
      ])

      // Self-healing: if local DB shows free tier but Stripe might have a subscription,
      // attempt a sync and reload. This fixes users whose webhook was missed.
      if (!skipSync && entResult.planId === 'free' && !subResult?.subscription) {
        try {
          const syncResult = await syncSubscription(teamId)
          if (syncResult.synced) {
            console.log(`[Billing] Auto-synced subscription from Stripe: ${syncResult.action} (${syncResult.planId})`)
            // Reload with skipSync to avoid infinite loop
            return loadBillingData(true)
          }
        } catch (err) {
          // Sync failed (no Stripe customer, etc.) — that's fine, user is genuinely on free tier
          console.log('[Billing] Auto-sync found no Stripe subscription')
        }
      }

      setEntitlements(entResult)
      setUsage(usageResult)
      setSubscription(subResult)
    } catch (error) {
      console.error('Failed to load billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const result = await createPortalSession(`${window.location.origin}/settings?tab=billing`)
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error)
      toast.error('Failed to open billing portal. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-6 flex items-center justify-center"
      >
        <Loader2 className="w-6 h-6 animate-spin text-pitch-400" />
      </motion.div>
    )
  }

  const daysRemaining = entitlements?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(entitlements.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  const hasStripeSubscription = subscription?.subscription?.provider === 'stripe'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Success message */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-pitch-500/10 border border-pitch-500/30 rounded-lg flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-pitch-400 flex-shrink-0" />
          <div>
            <p className="text-pitch-400 font-medium">Payment successful!</p>
            <p className="text-sm text-navy-400">Your subscription is now active. Thank you for subscribing!</p>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="ml-auto text-navy-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Current Plan */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Current Plan</h2>

        {entitlements?.billingExempt ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-400 font-medium">Billing Exempt (Internal)</p>
            <p className="text-sm text-navy-400">Full access to all features</p>
          </div>
        ) : entitlements?.isTrial ? (
          <div className="p-4 bg-pitch-500/10 border border-pitch-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pitch-400 font-medium">Free Trial</p>
                <p className="text-sm text-navy-400">{daysRemaining} days remaining</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-navy-500">Ends</p>
                <p className="text-sm text-white">
                  {entitlements?.currentPeriodEnd
                    ? new Date(entitlements.currentPeriodEnd).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        ) : subscription?.plan ? (
          <div className="p-4 bg-navy-800/50 border border-navy-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{subscription.plan.name}</p>
                <p className="text-sm text-navy-400">{subscription.plan.priceFormatted}/{subscription.plan.interval}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                subscription.subscription?.status === 'active'
                  ? 'bg-pitch-500/20 text-pitch-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {subscription.subscription?.status || 'Unknown'}
              </div>
            </div>
            {subscription.subscription?.currentPeriodEnd && (
              <p className="text-xs text-navy-500 mt-2">
                Renews {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 bg-navy-800/50 border border-navy-700 rounded-lg">
            <p className="text-white font-medium">No Active Plan</p>
            <p className="text-sm text-navy-400">Upgrade to access all features</p>
          </div>
        )}

        {!entitlements?.billingExempt && (
          <div className="mt-4 space-y-2">
            {hasStripeSubscription && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="btn-secondary w-full"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Manage Subscription
              </button>
            )}
            <Link to="/pricing" className="btn-primary w-full block text-center">
              {entitlements?.status === 'active' ? 'Change Plan' : 'View Plans & Upgrade'}
            </Link>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold text-white mb-2">Usage This Month</h2>
        <p className="text-sm text-navy-400 mb-6">
          {usage?.period ? `Period: ${usage.period}` : 'Current billing period'}
        </p>

        <div className="space-y-4">
          {usage?.usage && Object.entries(usage.usage).map(([key, data]) => (
            <UsageBar
              key={key}
              label={key === 'video' ? 'Video Analyses' : key === 'ocr' ? 'OCR Imports' : 'Emails Sent'}
              current={data.current}
              limit={data.limit}
              billingExempt={entitlements?.billingExempt}
            />
          ))}
        </div>
      </div>

      {/* Plan Details */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold text-white mb-4">Plan Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-navy-800/50 rounded-lg">
            <p className="text-xs text-navy-400 mb-1">Teams</p>
            <p className="text-lg font-semibold text-white">
              {entitlements?.teamLimit === Infinity ? 'Unlimited' : entitlements?.teamLimit || 0}
            </p>
          </div>
          <div className="p-3 bg-navy-800/50 rounded-lg">
            <p className="text-xs text-navy-400 mb-1">Players per Team</p>
            <p className="text-lg font-semibold text-white">
              {entitlements?.playerLimitPerTeam || 25}
            </p>
          </div>
        </div>

        {entitlements?.flags && Object.keys(entitlements.flags).length > 0 && (
          <div className="mt-4 pt-4 border-t border-navy-800">
            <p className="text-sm font-medium text-white mb-3">Features Included</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(entitlements.flags).filter(([_, enabled]) => enabled).map(([flag]) => (
                <span key={flag} className="px-2 py-1 bg-pitch-500/10 text-pitch-400 rounded text-xs">
                  {flag.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Usage bar component
function UsageBar({ label, current, limit, billingExempt }) {
  const percentage = billingExempt || limit === Infinity
    ? 0
    : Math.min(100, (current / limit) * 100)

  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-navy-300">{label}</span>
        <span className={`text-sm font-medium ${
          isAtLimit ? 'text-alert-400' : isNearLimit ? 'text-amber-400' : 'text-white'
        }`}>
          {current} / {billingExempt || limit === Infinity ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit ? 'bg-alert-500' : isNearLimit ? 'bg-amber-500' : 'bg-pitch-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Streaming Tab Component (RTMP Integration)
function StreamingTab({ teamId, userRole, teamName }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [showStreamKey, setShowStreamKey] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  // Guest sharing state
  const [guestPin, setGuestPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [copiedShareUrl, setCopiedShareUrl] = useState(false)
  const [regeneratingShareCode, setRegeneratingShareCode] = useState(false)

  useEffect(() => {
    if (teamId) {
      loadCredentials()
    }
  }, [teamId])

  async function loadCredentials() {
    setLoading(true)
    try {
      const response = await streamingService.getCredentials(teamId)
      setHasCredentials(response.data.hasCredentials)
      setCredentials(response.data.credentials)
    } catch (error) {
      console.error('Failed to load streaming credentials:', error)
      toast.error('Failed to load streaming settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup() {
    setSaving(true)
    try {
      const response = await streamingService.setup(teamId)
      setHasCredentials(true)
      setCredentials(response.data.credentials)
      toast.success('Streaming credentials created!')
    } catch (error) {
      console.error('Failed to setup streaming:', error)
      toast.error(error.response?.data?.message || 'Failed to create streaming credentials')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    setSaving(true)
    try {
      const response = await streamingService.regenerateKey(teamId)
      setCredentials(response.data.credentials)
      setShowRegenerateConfirm(false)
      setShowStreamKey(false)
      toast.success('Stream key regenerated! Update your streaming settings with the new key.')
    } catch (error) {
      console.error('Failed to regenerate stream key:', error)
      toast.error(error.response?.data?.message || 'Failed to regenerate stream key')
    } finally {
      setSaving(false)
    }
  }

  function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text)
    if (type === 'url') {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else if (type === 'shareUrl') {
      setCopiedShareUrl(true)
      setTimeout(() => setCopiedShareUrl(false), 2000)
    } else {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
    toast.success('Copied to clipboard!')
  }

  async function handleSavePin() {
    setSavingPin(true)
    try {
      await streamingService.updatePin(teamId, guestPin || null)
      setCredentials(prev => ({ ...prev, hasGuestPin: !!guestPin, guestPin: guestPin || null }))
      toast.success(guestPin ? 'Guest PIN saved!' : 'Guest PIN removed')
    } catch (error) {
      console.error('Failed to update PIN:', error)
      toast.error(error.response?.data?.message || 'Failed to save PIN')
    } finally {
      setSavingPin(false)
    }
  }

  async function handleRegenerateShareCode() {
    setRegeneratingShareCode(true)
    try {
      const response = await streamingService.regenerateShareCode(teamId)
      setCredentials(prev => ({ ...prev, shareCode: response.data.shareCode }))
      toast.success('Share link regenerated! Previous links will no longer work.')
    } catch (error) {
      console.error('Failed to regenerate share code:', error)
      toast.error('Failed to regenerate share link')
    } finally {
      setRegeneratingShareCode(false)
    }
  }

  function getShareUrl() {
    if (!credentials?.shareCode) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/watch/${credentials.shareCode}`
  }

  function getShareMessage() {
    const url = getShareUrl()
    if (!url) return ''
    const name = teamName || 'our team'
    const lines = [`${name}`, `Watch our team live!`, '', `Link: ${url}`]
    if (credentials?.guestPin) {
      lines.push(`PIN: ${credentials.guestPin}`)
    }
    return lines.join('\n')
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-6 flex items-center justify-center"
      >
        <Loader2 className="w-6 h-6 animate-spin text-pitch-400" />
      </motion.div>
    )
  }

  // Only managers can access streaming settings
  if (userRole !== 'manager') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-6"
      >
        <h2 className="font-display text-xl font-semibold text-white mb-4">Live Streaming</h2>
        <p className="text-navy-400">Only team managers can configure streaming settings.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-pitch-500/20 flex items-center justify-center flex-shrink-0">
            <Video className="w-6 h-6 text-pitch-400" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-white mb-1">Live Streaming</h2>
            <p className="text-navy-400 text-sm">
              Connect your camera to stream matches live to your team hub.
            </p>
          </div>
        </div>
      </div>

      {!hasCredentials ? (
        /* Setup Card */
        <div className="card p-6">
          <h3 className="font-medium text-white mb-4">Set Up Live Streaming</h3>
          <p className="text-navy-400 text-sm mb-6">
            Generate RTMP credentials to connect your camera for live streaming.
            Once set up, you'll receive a URL and stream key to enter in your camera's streaming settings.
          </p>

          <div className="p-4 bg-navy-800/50 rounded-lg border border-navy-700 mb-6">
            <h4 className="font-medium text-white mb-2">How it works:</h4>
            <ol className="space-y-2 text-sm text-navy-400">
              <li className="flex items-start gap-2">
                <span className="text-pitch-400 font-medium">1.</span>
                Click "Generate Credentials" below
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pitch-400 font-medium">2.</span>
                Copy the RTMP URL and Stream Key
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pitch-400 font-medium">3.</span>
                In your camera app, go to Stream Settings → Add streaming destination
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pitch-400 font-medium">4.</span>
                Paste the URL and Key into the streaming form
              </li>
            </ol>
          </div>

          <button
            onClick={handleSetup}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            Generate Streaming Credentials
          </button>
        </div>
      ) : (
        /* Credentials Card */
        <>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-white">Your Streaming Credentials</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                credentials?.status === 'active'
                  ? 'bg-pitch-500/20 text-pitch-400'
                  : 'bg-navy-700 text-navy-400'
              }`}>
                {credentials?.status === 'active' ? 'Streaming' : 'Idle'}
              </div>
            </div>

            <div className="space-y-4">
              {/* RTMP URL */}
              <div>
                <label className="label">RTMP URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={credentials?.rtmpUrl || ''}
                    className="input font-mono text-sm flex-1"
                  />
                  <button
                    onClick={() => copyToClipboard(credentials?.rtmpUrl, 'url')}
                    className="btn-secondary btn-sm"
                  >
                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-navy-500 mt-1">
                  Enter this in the "RTMP URL" field in your camera's streaming settings
                </p>
              </div>

              {/* Stream Key */}
              <div>
                <label className="label">Stream Key</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showStreamKey ? 'text' : 'password'}
                      readOnly
                      value={credentials?.streamKey || ''}
                      className="input font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
                    >
                      {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentials?.streamKey, 'key')}
                    className="btn-secondary btn-sm"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-navy-500 mt-1">
                  Enter this in the "Stream key" field in your camera's streaming settings. Keep this secret!
                </p>
              </div>
            </div>

            {/* Last active */}
            {credentials?.lastActiveAt && (
              <p className="text-xs text-navy-500 mt-4">
                Last stream: {new Date(credentials.lastActiveAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Regenerate Key */}
          <div className="card p-6">
            <h3 className="font-medium text-white mb-2">Security</h3>
            <p className="text-navy-400 text-sm mb-4">
              If you believe your stream key has been compromised, you can regenerate it.
              You'll need to update the key in your streaming settings after regenerating.
            </p>

            {showRegenerateConfirm ? (
              <div className="p-4 bg-alert-500/10 border border-alert-500/30 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-alert-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-alert-400 font-medium">Are you sure?</p>
                    <p className="text-sm text-navy-400 mt-1">
                      This will invalidate your current stream key. You'll need to update
                      the key in your camera's streaming settings.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowRegenerateConfirm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={saving}
                    className="btn-primary bg-alert-500 hover:bg-alert-600 flex-1"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate Key
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="btn-ghost text-amber-400 hover:bg-amber-500/10"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate Stream Key
              </button>
            )}
          </div>

          {/* Guest Sharing */}
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Share2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Share with Friends & Family</h3>
                <p className="text-navy-400 text-sm mt-1">
                  Allow guests to watch your live stream without logging in.
                </p>
              </div>
            </div>

            {/* Share Message */}
            <div className="mb-6">
              <label className="label">Share Message</label>
              <div className="flex items-start gap-2">
                <textarea
                  readOnly
                  value={getShareMessage()}
                  rows={credentials?.guestPin ? 5 : 4}
                  className="input font-mono text-sm flex-1 resize-none"
                  placeholder="Generate credentials first"
                />
                <button
                  onClick={() => copyToClipboard(getShareMessage(), 'shareUrl')}
                  disabled={!credentials?.shareCode}
                  className="btn-secondary btn-sm mt-1"
                >
                  {copiedShareUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-navy-500 mt-1">
                Copy and share with friends and family — includes link{credentials?.guestPin ? ' and PIN' : ''}
              </p>
              {credentials?.shareCode && (
                <button
                  onClick={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`, '_blank')
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Share via WhatsApp
                </button>
              )}
            </div>

            {/* Guest PIN */}
            <div className="mb-6">
              <label className="label flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Guest PIN (Required)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={guestPin}
                  onChange={(e) => setGuestPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={credentials?.hasGuestPin ? '••••' : 'Enter 4-6 digit PIN'}
                  className="input text-center tracking-widest flex-1"
                />
                <button
                  onClick={handleSavePin}
                  disabled={savingPin || (guestPin.length > 0 && guestPin.length < 4)}
                  className="btn-primary btn-sm"
                >
                  {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </button>
              </div>
              <p className="text-xs text-navy-500 mt-1">
                {credentials?.hasGuestPin
                  ? 'PIN is set. Enter a new PIN to change it, or save empty to remove.'
                  : 'Set a PIN that guests must enter to watch the stream.'}
              </p>
            </div>

            {/* Regenerate Share Code */}
            <div className="pt-4 border-t border-navy-700">
              <button
                onClick={handleRegenerateShareCode}
                disabled={regeneratingShareCode}
                className="btn-ghost text-navy-400 hover:text-white text-sm"
              >
                {regeneratingShareCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Generate New Share Link
              </button>
              <p className="text-xs text-navy-500 mt-1">
                This will invalidate the old share link.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Help */}
      <div className="card p-6">
        <h3 className="font-medium text-white mb-4">Need Help?</h3>
        <div className="p-4 bg-navy-800/50 rounded-lg border border-navy-700">
          <p className="text-sm text-navy-400">
            For detailed setup instructions, check your camera manufacturer's documentation on RTMP streaming.
            The streaming destination should be configured in your camera's streaming settings.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const { team, updateTeam, branding } = useTeam()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [showQuickStart, setShowQuickStart] = useState(false)

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  const [teamSettings, setTeamSettings] = useState({
    name: team?.name || '',
    ageGroup: team?.age_group || 'U13',
    teamFormat: team?.team_format || 11,
    timezone: team?.timezone || 'Europe/London',
  })

  const [brandingSettings, setBrandingSettings] = useState({
    primaryColor: branding?.primaryColor || '#22C55E',
    secondaryColor: branding?.secondaryColor || '#0F172A',
    accentColor: branding?.accentColor || '#F97316',
  })

  const [teamFormations, setTeamFormations] = useState([])
  const [coachingPhilosophy, setCoachingPhilosophy] = useState('')
  const [savingPhilosophy, setSavingPhilosophy] = useState(false)

  // Coaching qualifications
  const [qualifications, setQualifications] = useState([])
  const [savingQualifications, setSavingQualifications] = useState(false)

  // Update branding settings and formations when team loads
  useEffect(() => {
    if (team) {
      setBrandingSettings({
        primaryColor: team.primary_color || '#22C55E',
        secondaryColor: team.secondary_color || '#0F172A',
        accentColor: team.accent_color || '#F97316',
      })
      // Parse formations from team data
      const formations = team.formations
        ? (typeof team.formations === 'string' ? JSON.parse(team.formations) : team.formations)
        : []
      setTeamFormations(formations)
      setCoachingPhilosophy(team.coaching_philosophy || '')
    }
  }, [team])

  // Load coaching qualifications
  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'assistant') {
      profileService.getQualifications()
        .then(res => setQualifications(res.data.qualifications || []))
        .catch(() => {})
    }
  }, [user?.role])

  function addQualification() {
    setQualifications(prev => [...prev, { badge: '', issued: '', expires: '' }])
  }

  function removeQualification(index) {
    setQualifications(prev => prev.filter((_, i) => i !== index))
  }

  function updateQualification(index, field, value) {
    setQualifications(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  async function handleSaveQualifications() {
    setSavingQualifications(true)
    try {
      const filtered = qualifications.filter(q => q.badge.trim())
      await profileService.updateQualifications(filtered)
      setQualifications(filtered)
      toast.success('Qualifications saved')
    } catch (error) {
      console.error('Failed to save qualifications:', error)
      toast.error('Failed to save qualifications')
    }
    setSavingQualifications(false)
  }

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('assistant')
  const [coachInviteSuccess, setCoachInviteSuccess] = useState(null)
  const [copiedCoachLink, setCopiedCoachLink] = useState(false)

  // Parent AI control state (The Gaffer)
  const [gafferDisabled, setGafferDisabled] = useState(false)
  const [loadingGafferStatus, setLoadingGafferStatus] = useState(true)

  // Load Gaffer status for parents
  useEffect(() => {
    if (user?.role === 'parent' && user?.pupil_id) {
      loadGafferStatus()
    } else {
      setLoadingGafferStatus(false)
    }
  }, [user?.role, user?.pupil_id])

  async function loadGafferStatus() {
    try {
      const response = await playerChatService.getGafferStatus(user.pupil_id)
      setGafferDisabled(response.data.disabled)
    } catch (error) {
      console.error('Failed to load Gaffer status:', error)
    } finally {
      setLoadingGafferStatus(false)
    }
  }

  async function handleToggleGaffer() {
    setSaving(true)
    try {
      const newStatus = !gafferDisabled
      await playerChatService.setGafferStatus(user.pupil_id, newStatus)
      setGafferDisabled(newStatus)
      toast.success(newStatus ? 'The Gaffer has been disabled' : 'The Gaffer has been enabled')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'tactics', label: 'Tactics', icon: Target },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'streaming', label: 'Live Streaming', icon: Video },
    { id: 'invites', label: 'Invite Members', icon: UserPlus },
    ...(['manager', 'assistant'].includes(user?.role) ? [{ id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen }] : []),
    ...(['manager', 'assistant'].includes(user?.role) ? [{ id: 'qualifications', label: 'Qualifications', icon: Award }] : []),
    ...(user?.role === 'parent' ? [{ id: 'parental', label: 'Parental Controls', icon: Shield }] : []),
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]
  
  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    // API call would go here
    await new Promise(r => setTimeout(r, 500))
    toast.success('Profile updated!')
    setSaving(false)
  }
  
  async function handleSaveTeam(e) {
    e.preventDefault()
    setSaving(true)
    const result = await updateTeam({
      name: teamSettings.name,
      age_group: teamSettings.ageGroup,
      team_format: teamSettings.teamFormat,
      timezone: teamSettings.timezone,
    })
    if (result.success) {
      toast.success('Team settings updated!')
    } else {
      toast.error('Failed to update team')
    }
    setSaving(false)
  }

  async function handleSaveBranding(e) {
    e.preventDefault()
    setSaving(true)
    const result = await updateTeam({
      primary_color: brandingSettings.primaryColor,
      secondary_color: brandingSettings.secondaryColor,
      accent_color: brandingSettings.accentColor,
    })
    if (result.success) {
      toast.success('Brand colors updated!')
    } else {
      toast.error('Failed to update branding')
    }
    setSaving(false)
  }

  function ColorPicker({ label, value, onChange, description }) {
    return (
      <div className="space-y-2">
        <label className="label">{label}</label>
        {description && <p className="text-xs text-navy-500 -mt-1 mb-2">{description}</p>}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-navy-700"
              style={{ backgroundColor: value }}
            />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input w-32 font-mono text-sm"
            placeholder="#000000"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {presetColors.map((preset) => (
            <button
              key={preset.color}
              type="button"
              onClick={() => onChange(preset.color)}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                value.toUpperCase() === preset.color.toUpperCase()
                  ? 'border-white scale-110'
                  : 'border-navy-700 hover:border-navy-500'
              }`}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
            />
          ))}
        </div>
      </div>
    )
  }
  
  async function handleSendInvite(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await teamService.inviteMember(team.id, { email: inviteEmail, role: inviteRole })
      setCoachInviteSuccess(response.data)
      setInviteEmail('')
      toast.success('Invite link generated!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create invite')
    }
    setSaving(false)
  }

  function copyCoachInviteLink() {
    if (coachInviteSuccess?.inviteLink) {
      navigator.clipboard.writeText(coachInviteSuccess.inviteLink)
      setCopiedCoachLink(true)
      setTimeout(() => setCopiedCoachLink(false), 2000)
      toast.success('Link copied!')
    }
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/invite/abc123`
    navigator.clipboard.writeText(link)
    toast.success('Invite link copied!')
  }
  
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-navy-400">Manage your account and team</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <nav className="md:w-48 flex-shrink-0">
          <ul className="space-y-1">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-navy-800 text-white' 
                      : 'text-navy-400 hover:text-white hover:bg-navy-800/50'
                    }
                  `}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6"
            >
              <h2 className="font-display text-xl font-semibold text-white mb-6">Profile Settings</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                    className="input"
                  />
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              </form>

              {['manager', 'assistant'].includes(user?.role) && (
                <div className="mt-6 pt-6 border-t border-navy-800">
                  <button
                    onClick={() => setShowQuickStart(true)}
                    className="btn-ghost w-full text-navy-400 hover:text-white"
                  >
                    <BookOpen className="w-4 h-4" />
                    Replay Quick Start Guide
                  </button>
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'team' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6"
            >
              <h2 className="font-display text-xl font-semibold text-white mb-6">Team Settings</h2>
              <form onSubmit={handleSaveTeam} className="space-y-4">
                <div>
                  <label className="label">Team Name</label>
                  <input
                    type="text"
                    value={teamSettings.name}
                    onChange={(e) => setTeamSettings(t => ({ ...t, name: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Age Group</label>
                  <select
                    value={teamSettings.ageGroup}
                    onChange={(e) => {
                      const ageGroup = e.target.value
                      const recommendedFormat = AGE_GROUP_FORMAT_MAP[ageGroup]
                      setTeamSettings(t => ({
                        ...t,
                        ageGroup,
                        ...(recommendedFormat ? { teamFormat: recommendedFormat } : {}),
                      }))
                    }}
                    className="input"
                  >
                    {['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Adult'].map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Team Format</label>
                  <select
                    value={teamSettings.teamFormat}
                    onChange={(e) => setTeamSettings(t => ({ ...t, teamFormat: parseInt(e.target.value) }))}
                    className="input"
                  >
                    <option value={11}>11-a-side</option>
                    <option value={9}>9-a-side</option>
                    <option value={7}>7-a-side</option>
                    <option value={5}>5-a-side</option>
                  </select>
                  <p className="text-xs text-navy-500 mt-1">
                    {teamSettings.teamFormat === 9 && 'FA standard for U11/U12 — auto-set when age group changes'}
                    {teamSettings.teamFormat === 7 && 'FA standard for U9/U10 — auto-set when age group changes'}
                    {teamSettings.teamFormat === 5 && 'FA standard for U7/U8 — auto-set when age group changes'}
                    {teamSettings.teamFormat === 11 && 'FA standard for U13+ — auto-set when age group changes'}
                  </p>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select
                    value={teamSettings.timezone}
                    onChange={(e) => setTeamSettings(t => ({ ...t, timezone: e.target.value }))}
                    className="input"
                  >
                    {Intl.supportedValuesOf('timeZone').map(tz => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <p className="text-xs text-navy-500 mt-1">
                    All match and training times will be displayed in this timezone
                  </p>
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'tactics' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6"
            >
              <h2 className="font-display text-xl font-semibold text-white mb-2">Team Formations</h2>
              <p className="text-navy-400 text-sm mb-6">
                Select up to 3 formations your team typically plays. This helps the AI assistant understand your tactical approach.
              </p>

              <div className="space-y-4">
                {/* Selected formations */}
                <div className="space-y-2">
                  <label className="label">Selected Formations ({teamFormations.length}/3)</label>
                  {teamFormations.length === 0 ? (
                    <p className="text-navy-500 text-sm">No formations selected yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {teamFormations.map((formation, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 bg-pitch-500/20 border border-pitch-500/30 rounded-lg"
                        >
                          <span className="text-white font-medium">{formation}</span>
                          <button
                            type="button"
                            onClick={() => setTeamFormations(teamFormations.filter((_, i) => i !== index))}
                            className="text-navy-400 hover:text-alert-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add formation dropdown */}
                {teamFormations.length < 3 && (
                  <div>
                    <label className="label">Add Formation</label>
                    <select
                      className="input"
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !teamFormations.includes(e.target.value)) {
                          setTeamFormations([...teamFormations, e.target.value])
                        }
                      }}
                    >
                      <option value="">Select a formation...</option>
                      {(FORMATIONS_BY_FORMAT[teamSettings.teamFormat] || FORMATIONS).filter(f => !teamFormations.includes(f)).map(formation => (
                        <option key={formation} value={formation}>{formation}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    const result = await updateTeam({ formations: teamFormations })
                    if (result.success) {
                      toast.success('Team formations updated!')
                    } else {
                      toast.error('Failed to update formations')
                    }
                    setSaving(false)
                  }}
                  className="btn-primary mt-4"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Formations
                </button>
              </div>

              {/* Coaching Philosophy Section */}
              <div className="mt-8 pt-8 border-t border-navy-800">
                <h2 className="font-display text-xl font-semibold text-white mb-2">Coaching Philosophy</h2>
                <p className="text-navy-400 text-sm mb-4">
                  Describe your coaching philosophy and approach. This will be used by Pep and other AI features to tailor their advice and session plans to match your style.
                </p>
                <textarea
                  value={coachingPhilosophy}
                  onChange={(e) => setCoachingPhilosophy(e.target.value)}
                  className="input"
                  rows={5}
                  placeholder="e.g., I believe in pupil-led development with a focus on creativity and expression. We play a possession-based style and encourage pupils to take risks with the ball. Fun and enjoyment come first, but I want to build technically excellent pupils who understand the game..."
                />
                <p className="text-xs text-navy-500 mt-2">
                  {coachingPhilosophy.length}/500 characters
                </p>
                <button
                  type="button"
                  disabled={savingPhilosophy}
                  onClick={async () => {
                    setSavingPhilosophy(true)
                    const result = await updateTeam({ coaching_philosophy: coachingPhilosophy || '' })
                    if (result.success) {
                      toast.success('Coaching philosophy saved!')
                    } else {
                      toast.error('Failed to save coaching philosophy')
                    }
                    setSavingPhilosophy(false)
                  }}
                  className="btn-primary mt-4"
                >
                  {savingPhilosophy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Philosophy
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'branding' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6"
            >
              <h2 className="font-display text-xl font-semibold text-white mb-2">Brand Colors</h2>
              <p className="text-navy-400 text-sm mb-6">
                Customize the colors of your team hub. These colors will appear throughout the app.
              </p>
              <form onSubmit={handleSaveBranding} className="space-y-6">
                <ColorPicker
                  label="Primary Color"
                  value={brandingSettings.primaryColor}
                  onChange={(color) => setBrandingSettings((b) => ({ ...b, primaryColor: color }))}
                  description="Main brand color used for buttons and accents"
                />
                <ColorPicker
                  label="Secondary Color"
                  value={brandingSettings.secondaryColor}
                  onChange={(color) => setBrandingSettings((b) => ({ ...b, secondaryColor: color }))}
                  description="Secondary color for backgrounds and cards"
                />
                <ColorPicker
                  label="Accent Color"
                  value={brandingSettings.accentColor}
                  onChange={(color) => setBrandingSettings((b) => ({ ...b, accentColor: color }))}
                  description="Highlight color for special elements"
                />

                {/* Preview section */}
                <div className="border-t border-navy-800 pt-6">
                  <h3 className="font-medium text-white mb-4">Preview</h3>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="btn px-4 py-2 rounded-lg"
                        style={{
                          backgroundColor: brandingSettings.primaryColor,
                          color: isLightColor(brandingSettings.primaryColor) ? '#0F172A' : '#FFFFFF',
                        }}
                      >
                        Primary Button
                      </button>
                      <button
                        type="button"
                        className="btn px-4 py-2 rounded-lg"
                        style={{
                          backgroundColor: brandingSettings.accentColor,
                          color: isLightColor(brandingSettings.accentColor) ? '#0F172A' : '#FFFFFF',
                        }}
                      >
                        Accent Button
                      </button>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: brandingSettings.secondaryColor }}
                    >
                      <p className="text-white text-sm">Secondary background preview</p>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Brand Colors
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'invites' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="card p-6">
                <h2 className="font-display text-xl font-semibold text-white mb-6">Invite Coaches</h2>

                {coachInviteSuccess ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-pitch-500/10 border border-pitch-500/30 rounded-lg">
                      <Check className="w-5 h-5 text-pitch-400" />
                      <p className="text-pitch-400">
                        Invite link generated for {coachInviteSuccess.invite?.email}
                      </p>
                    </div>

                    {coachInviteSuccess.inviteLink && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-white mb-2">Share this invite link:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={coachInviteSuccess.inviteLink}
                              className="input text-sm font-mono"
                            />
                            <button
                              onClick={copyCoachInviteLink}
                              className="btn-primary btn-sm"
                            >
                              {copiedCoachLink ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-navy-500">
                          Send this link to the coach. The link expires in 7 days.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setCoachInviteSuccess(null)}
                        className="btn-secondary flex-1"
                      >
                        Invite Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendInvite} className="space-y-4">
                    <p className="text-navy-400 text-sm mb-2">
                      Generate an invite link for a coach or staff member.
                    </p>
                    <div>
                      <label className="label">Email Address</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="input"
                        placeholder="coach@example.com"
                        required
                      />
                      <p className="text-xs text-navy-500 mt-1">Used to identify them when they sign up</p>
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="input"
                      >
                        <option value="assistant">Assistant Coach</option>
                        <option value="scout">Scout</option>
                      </select>
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                      Generate Invite Link
                    </button>
                  </form>
                )}
              </div>

              <div className="card p-6">
                <h2 className="font-display text-xl font-semibold text-white mb-4">Invite Players/Parents</h2>
                <p className="text-navy-400 text-sm mb-4">
                  To invite parents, go to a pupil's profile and click the "Invite Parent" button.
                  This creates a personalized invite linked to their child's profile.
                </p>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'streaming' && (
            <StreamingTab teamId={team?.id} userRole={user?.role} teamName={team?.name} />
          )}

          {activeTab === 'qualifications' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6"
            >
              <h2 className="font-display text-xl font-semibold text-white mb-2">Coaching Qualifications</h2>
              <p className="text-sm text-navy-400 mb-6">Record your coaching badges and certifications. These are used by School Intelligence for development suggestions.</p>

              <div className="space-y-3">
                {qualifications.map((q, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-navy-800/50 border border-navy-700">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs">Badge / Qualification</label>
                        <select
                          value={q.badge}
                          onChange={(e) => updateQualification(index, 'badge', e.target.value)}
                          className="input text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="FA Playmaker">FA Playmaker</option>
                          <option value="FA Level 1">FA Level 1</option>
                          <option value="FA Level 2">FA Level 2</option>
                          <option value="UEFA B">UEFA B</option>
                          <option value="UEFA A">UEFA A</option>
                          <option value="UEFA Pro">UEFA Pro</option>
                          <option value="FA Youth Module 1">FA Youth Module 1</option>
                          <option value="FA Youth Module 2">FA Youth Module 2</option>
                          <option value="FA Youth Module 3">FA Youth Module 3</option>
                          <option value="FA Goalkeeping Level 1">FA Goalkeeping Level 1</option>
                          <option value="FA Goalkeeping Level 2">FA Goalkeeping Level 2</option>
                          <option value="FA Futsal Level 1">FA Futsal Level 1</option>
                          <option value="FA Safeguarding">FA Safeguarding</option>
                          <option value="Emergency First Aid">Emergency First Aid</option>
                          <option value="First Aid at Work">First Aid at Work</option>
                          <option value="Paediatric First Aid">Paediatric First Aid</option>
                          <option value="FA Introduction to Coaching">FA Introduction to Coaching</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Date Obtained</label>
                        <input
                          type="date"
                          value={q.issued || ''}
                          onChange={(e) => updateQualification(index, 'issued', e.target.value)}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Expiry Date</label>
                        <input
                          type="date"
                          value={q.expires || ''}
                          onChange={(e) => updateQualification(index, 'expires', e.target.value)}
                          className="input text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeQualification(index)}
                      className="mt-6 p-1 text-navy-500 hover:text-alert-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {qualifications.length === 0 && (
                  <p className="text-navy-500 text-sm py-4 text-center">No qualifications recorded yet.</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-navy-800">
                <button onClick={addQualification} className="btn-secondary btn-sm">
                  <Plus className="w-4 h-4" /> Add Qualification
                </button>
                <button
                  onClick={handleSaveQualifications}
                  disabled={savingQualifications}
                  className="btn-primary"
                >
                  {savingQualifications ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Qualifications
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'knowledge-base' && (
            <KnowledgeBaseTab teamId={team?.id} />
          )}

          {activeTab === 'billing' && (
            <BillingTab teamId={team?.id} userEmail={user?.email} />
          )}

          {activeTab === 'parental' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6"
            >
              <h2 className="font-display text-xl font-semibold text-white mb-2">Parental Controls</h2>
              <p className="text-navy-400 text-sm mb-6">
                Control your child's access to The Gaffer AI assistant.
              </p>

              {loadingGafferStatus ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-pitch-400" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Gaffer status card */}
                  <div className={`p-4 rounded-lg border ${
                    !gafferDisabled
                      ? 'bg-pitch-500/10 border-pitch-500/30'
                      : 'bg-navy-800/50 border-navy-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          !gafferDisabled ? 'bg-pitch-500/20' : 'bg-navy-700'
                        }`}>
                          <Shield className={`w-5 h-5 ${!gafferDisabled ? 'text-pitch-400' : 'text-navy-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">The Gaffer AI</p>
                          <p className={`text-sm ${!gafferDisabled ? 'text-pitch-400' : 'text-navy-400'}`}>
                            {!gafferDisabled ? 'Enabled - Your child can chat with The Gaffer' : 'Disabled - AI chat is turned off'}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        !gafferDisabled
                          ? 'bg-pitch-500/20 text-pitch-400'
                          : 'bg-navy-700 text-navy-400'
                      }`}>
                        {!gafferDisabled ? 'ON' : 'OFF'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={handleToggleGaffer}
                    disabled={saving}
                    className={`w-full ${gafferDisabled ? 'btn-primary' : 'btn-ghost text-alert-400 hover:bg-alert-500/10'}`}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : gafferDisabled ? (
                      <>
                        <Shield className="w-4 h-4" />
                        Enable The Gaffer
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Disable The Gaffer
                      </>
                    )}
                  </button>

                  {/* Info */}
                  <div className="p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                    <h4 className="font-medium text-white mb-2">About The Gaffer</h4>
                    <p className="text-sm text-navy-400 mb-3">
                      The Gaffer is an AI coaching assistant that helps your child understand their development,
                      prepare for matches, and get personalized tips based on coach feedback.
                    </p>
                    <ul className="space-y-2 text-sm text-navy-400">
                      <li className="flex items-start gap-2">
                        <span className="text-pitch-400">•</span>
                        Answers questions about training and development
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-pitch-400">•</span>
                        Provides pre-match motivation and tips
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-pitch-400">•</span>
                        Explains coach observations in a positive way
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <QuickStartGuide isOpen={showQuickStart} onClose={() => setShowQuickStart(false)} />
    </div>
  )
}
