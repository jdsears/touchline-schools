import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { giftAidService } from '../../services/api'
import {
  Heart, Download, Users, PoundSterling, FileText,
  ChevronDown, Search, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubGiftAid() {
  const { club, myRole } = useOutletContext()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [taxYear, setTaxYear] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (club?.id) loadDashboard()
  }, [club?.id, taxYear])

  async function loadDashboard() {
    setLoading(true)
    try {
      const res = await giftAidService.getDashboard(club.id, taxYear || undefined)
      setData(res.data)
      if (!taxYear && res.data.tax_year) setTaxYear(res.data.tax_year)
    } catch (err) {
      toast.error('Failed to load Gift Aid data')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportHMRC() {
    try {
      const res = await giftAidService.exportHMRC(club.id, taxYear)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `touchline-giftaid-hmrc-${club.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${taxYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('HMRC export downloaded')
    } catch (err) {
      toast.error('Failed to export')
    }
  }

  async function handleExportAudit() {
    try {
      const res = await giftAidService.exportAudit(club.id, taxYear)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `touchline-giftaid-audit-${club.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${taxYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Audit trail downloaded')
    } catch (err) {
      toast.error('Failed to export')
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-navy-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-navy-900 border border-navy-800 rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const summary = data?.summary || {}
  const records = data?.records || []
  const declarations = data?.declarations || []
  const availableTaxYears = data?.available_tax_years || []

  const filteredRecords = searchTerm
    ? records.filter(r =>
        r.parent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-600/10 text-pink-400">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gift Aid</h1>
            <p className="text-navy-400 text-sm mt-0.5">Track donations and HMRC claims</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
            className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600"
          >
            {availableTaxYears.length === 0 && <option value={taxYear}>{taxYear}</option>}
            {availableTaxYears.map(ty => (
              <option key={ty} value={ty}>{ty}</option>
            ))}
          </select>
          <button onClick={loadDashboard} className="p-2 bg-navy-800 border border-navy-700 rounded-lg text-navy-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-navy-400 text-xs mb-2">
            <PoundSterling className="w-3.5 h-3.5" />
            Total Donations
          </div>
          <p className="text-2xl font-bold text-white">
            £{(summary.total_donations / 100).toFixed(2)}
          </p>
          <p className="text-xs text-navy-500 mt-1">Tax year {taxYear}</p>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-navy-400 text-xs mb-2">
            <PoundSterling className="w-3.5 h-3.5" />
            Est. HMRC Reclaim
          </div>
          <p className="text-2xl font-bold text-pitch-400">
            £{(summary.total_hmrc_reclaim / 100).toFixed(2)}
          </p>
          <p className="text-xs text-navy-500 mt-1">Donations x 25%</p>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-navy-400 text-xs mb-2">
            <Users className="w-3.5 h-3.5" />
            Contributing Parents
          </div>
          <p className="text-2xl font-bold text-white">{summary.contributing_parents}</p>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-navy-400 text-xs mb-2">
            <FileText className="w-3.5 h-3.5" />
            Gift Aid Payments
          </div>
          <p className="text-2xl font-bold text-white">{summary.payment_count}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-900 border border-navy-800 rounded-xl p-1">
        {[
          { id: 'overview', label: 'Contributions' },
          { id: 'declarations', label: 'Active Declarations' },
          { id: 'export', label: 'Export' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-pitch-600/20 text-pitch-400' : 'text-navy-400 hover:text-white hover:bg-navy-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contributions Table */}
      {activeTab === 'overview' && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-navy-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by parent name or receipt number..."
                className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-10 pr-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600"
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-navy-400">
              <Heart className="w-10 h-10 mx-auto mb-3 text-navy-600" />
              <p className="font-medium text-white mb-1">No Gift Aid payments yet</p>
              <p className="text-sm">Gift Aid records will appear here once parents make payments with Gift Aid enabled.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-navy-400 text-xs border-b border-navy-800">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Parent</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Base Fee</th>
                    <th className="text-right px-4 py-3">GA%</th>
                    <th className="text-right px-4 py-3">Donation</th>
                    <th className="text-right px-4 py-3">HMRC</th>
                    <th className="text-left px-4 py-3">Receipt</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                      <td className="px-4 py-3 text-navy-300">
                        {new Date(r.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-white">{r.parent_name}</td>
                      <td className="px-4 py-3 text-navy-400 capitalize">{r.payment_type}</td>
                      <td className="px-4 py-3 text-right text-navy-300">£{(r.base_amount / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-navy-300">{parseFloat(r.gift_aid_percentage).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right text-pitch-400 font-medium">£{(r.gift_aid_donation / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">£{(r.hmrc_reclaim_amount / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-navy-400 font-mono text-xs">{r.receipt_number}</td>
                      <td className="px-4 py-3">
                        {r.is_refunded ? (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Refunded</span>
                        ) : (
                          <span className="text-xs bg-pitch-600/20 text-pitch-400 px-2 py-0.5 rounded-full">Paid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Declarations */}
      {activeTab === 'declarations' && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
          {declarations.length === 0 ? (
            <div className="p-8 text-center text-navy-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-navy-600" />
              <p className="font-medium text-white mb-1">No active declarations</p>
              <p className="text-sm">Parents can opt in to Gift Aid during payment or in their account settings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-navy-400 text-xs border-b border-navy-800">
                    <th className="text-left px-4 py-3">Parent</th>
                    <th className="text-right px-4 py-3">GA %</th>
                    <th className="text-left px-4 py-3">Declared</th>
                    <th className="text-left px-4 py-3">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((d, i) => (
                    <tr key={i} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                      <td className="px-4 py-3 text-white">{d.full_name || d.user_name}</td>
                      <td className="px-4 py-3 text-right text-pitch-400 font-medium">{parseFloat(d.gift_aid_percentage).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-navy-300">
                        {d.declaration_confirmed_at
                          ? new Date(d.declaration_confirmed_at).toLocaleDateString('en-GB')
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3 text-navy-400 text-xs">
                        {d.postcode || (
                          <span className="text-amber-400">Address incomplete</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Export */}
      {activeTab === 'export' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">HMRC Charities Online CSV</h3>
            <p className="text-navy-400 text-sm">
              Aggregated donations per donor for the selected tax year, formatted for HMRC Charities Online upload.
            </p>
            <button
              onClick={handleExportHMRC}
              className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download HMRC Export
            </button>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Full Audit Trail CSV</h3>
            <p className="text-navy-400 text-sm">
              One row per payment with full details for your club's records and audit requirements.
            </p>
            <button
              onClick={handleExportAudit}
              className="flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Audit Trail
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
