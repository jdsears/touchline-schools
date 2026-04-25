import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubIntelligenceService } from '../../services/api'
import {
  Sparkles, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Users, Shield, DollarSign, Filter,
  Eye, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'financial', label: 'Financial' },
]

const TYPE_CONFIG = {
  attendance: { icon: Users, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Attendance' },
  compliance: { icon: Shield, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Compliance' },
  financial: { icon: DollarSign, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Financial' },
  performance: { icon: TrendingUp, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Performance' },
  general: { icon: Sparkles, color: 'bg-pitch-600/20 text-pitch-400 border-pitch-500/30', label: 'General' },
}

const PRIORITY_STYLES = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-500',
}

function ShimmerCard() {
  return (
    <div className="bg-card border border-border-default rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-subtle" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-subtle rounded" />
        </div>
        <div className="h-5 w-16 bg-subtle rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-subtle rounded mb-2" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-subtle rounded" />
        <div className="h-3 w-5/6 bg-subtle rounded" />
        <div className="h-3 w-2/3 bg-subtle rounded" />
      </div>
      <div className="flex items-center gap-3 mt-4">
        <div className="h-3 w-20 bg-subtle rounded" />
        <div className="h-7 w-28 bg-subtle rounded-lg" />
      </div>
    </div>
  )
}

export default function ClubInsights() {
  const { school, myRole } = useOutletContext()
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [actioningId, setActioningId] = useState(null)

  useEffect(() => {
    if (school?.id) loadInsights()
  }, [school?.id])

  async function loadInsights() {
    try {
      const res = await clubIntelligenceService.getInsights(school.id)
      setInsights(res.data?.insights || res.data || [])
    } catch (err) {
      toast.error('Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkActioned(insightId) {
    setActioningId(insightId)
    try {
      await clubIntelligenceService.markInsight(school.id, insightId, { status: 'actioned' })
      setInsights(prev =>
        prev.map(i => i.id === insightId ? { ...i, status: 'actioned', actioned_at: new Date().toISOString() } : i)
      )
      toast.success('Insight marked as actioned')
    } catch (err) {
      toast.error('Failed to update insight')
    } finally {
      setActioningId(null)
    }
  }

  async function handleDismiss(insightId) {
    setActioningId(insightId)
    try {
      await clubIntelligenceService.markInsight(school.id, insightId, { status: 'dismissed' })
      setInsights(prev =>
        prev.map(i => i.id === insightId ? { ...i, status: 'dismissed' } : i)
      )
      toast.success('Insight dismissed')
    } catch (err) {
      toast.error('Failed to dismiss insight')
    } finally {
      setActioningId(null)
    }
  }

  const filteredInsights = activeFilter === 'all'
    ? insights
    : insights.filter(i => i.type === activeFilter)

  const unseenCount = insights.filter(i => !i.seen_at && i.status !== 'dismissed').length

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-subtle animate-pulse" />
          <div className="h-7 w-40 bg-subtle rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-9 w-24 bg-subtle rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          <ShimmerCard />
          <ShimmerCard />
          <ShimmerCard />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-600/10 text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">AI Insights</h1>
            <p className="text-secondary text-sm mt-0.5">
              Intelligent observations about your school
              {unseenCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full">
                  <Eye className="w-3 h-3" />
                  {unseenCount} new
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-card border border-border-default rounded-xl p-1">
        {FILTER_TABS.map(tab => {
          const count = tab.id === 'all'
            ? insights.length
            : insights.filter(i => i.type === tab.id).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === tab.id
                  ? 'bg-pitch-600/20 text-pitch-400'
                  : 'text-secondary hover:text-primary hover:bg-subtle'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${
                  activeFilter === tab.id ? 'text-pitch-400/70' : 'text-tertiary'
                }`}>
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Insights list */}
      {filteredInsights.length === 0 ? (
        <div className="bg-card border border-border-default rounded-xl p-8 text-center">
          <Sparkles className="w-12 h-12 text-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-medium text-primary mb-1">No AI insights generated yet</h3>
          <p className="text-secondary text-sm max-w-md mx-auto">
            Insights are automatically created as your school data grows. Keep adding matches, tracking attendance, and managing your school to see AI-powered observations here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onMarkActioned={handleMarkActioned}
              onDismiss={handleDismiss}
              isActioning={actioningId === insight.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InsightCard({ insight, onMarkActioned, onDismiss, isActioning }) {
  const [expanded, setExpanded] = useState(!insight.seen_at && insight.status !== 'dismissed')

  const typeConfig = TYPE_CONFIG[insight.type] || TYPE_CONFIG.general
  const TypeIcon = typeConfig.icon
  const priorityBorder = PRIORITY_STYLES[insight.priority] || PRIORITY_STYLES.low
  const isNew = !insight.seen_at && insight.status !== 'dismissed' && insight.status !== 'actioned'
  const isActioned = insight.status === 'actioned'
  const isDismissed = insight.status === 'dismissed'

  return (
    <div className={`bg-card border border-border-default rounded-xl overflow-hidden border-l-4 ${priorityBorder} ${
      isNew ? 'ring-1 ring-purple-500/20' : ''
    } ${isDismissed ? 'opacity-60' : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-subtle transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.color.split(' ').slice(0, 1).join(' ')}`}>
            <TypeIcon className={`w-4.5 h-4.5 ${typeConfig.color.split(' ').slice(1, 2).join(' ')}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-medium truncate ${isActioned ? 'text-secondary line-through' : 'text-primary'}`}>
                {insight.title}
              </p>
              {isNew && (
                <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full shrink-0">
                  New
                </span>
              )}
              {isActioned && (
                <span className="text-xs bg-pitch-600/20 text-pitch-400 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Actioned
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              {insight.priority === 'high' && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> High priority
                </span>
              )}
              <span className="text-xs text-tertiary">
                <Clock className="w-3 h-3 inline mr-0.5" />
                {formatTimeAgo(insight.created_at)}
              </span>
            </div>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-secondary shrink-0 ml-2" />
          : <ChevronDown className="w-4 h-4 text-secondary shrink-0 ml-2" />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-4 pt-1 border-t border-border-default">
          <div className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">
            {insight.content}
          </div>

          {insight.team_name && (
            <p className="text-xs text-tertiary mt-3">
              <Users className="w-3 h-3 inline mr-1" />
              Related to: {insight.team_name}
            </p>
          )}

          {!isActioned && !isDismissed && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={(e) => { e.stopPropagation(); onMarkActioned(insight.id) }}
                disabled={isActioning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-primary rounded-lg text-xs font-medium transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isActioning ? 'Updating...' : 'Mark as actioned'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(insight.id) }}
                disabled={isActioning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default disabled:opacity-50 text-secondary hover:text-primary rounded-lg text-xs font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {isActioned && insight.actioned_at && (
            <p className="text-xs text-tertiary mt-3">
              Actioned {formatTimeAgo(insight.actioned_at)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
