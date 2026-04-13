import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubPaymentService } from '../../services/api'
import {
  TrendingUp, Download, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubFinance() {
  const { club, myRole } = useOutletContext()
  const [summary, setSummary] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => {
    if (club?.id) loadData()
  }, [club?.id])

  useEffect(() => {
    if (club?.id) loadTransactions()
  }, [club?.id, page])

  async function loadData() {
    try {
      const [summaryRes, forecastRes] = await Promise.all([
        clubPaymentService.getFinanceSummary(club.id),
        clubPaymentService.getForecast(club.id),
      ])
      setSummary(summaryRes.data)
      setForecast(forecastRes.data)
    } catch (err) {
      toast.error('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  async function loadTransactions() {
    try {
      const res = await clubPaymentService.getTransactions(club.id, {
        limit: PAGE_SIZE, offset: page * PAGE_SIZE,
      })
      setTransactions(res.data.transactions)
      setTotalTransactions(res.data.total)
    } catch (err) {
      toast.error('Failed to load transactions')
    }
  }

  async function handleExport() {
    try {
      const res = await clubPaymentService.exportTransactions(club.id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${club.name.replace(/[^a-z0-9]/gi, '_')}_transactions.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch (err) {
      toast.error('Failed to export')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance</h1>
          <p className="text-navy-400 text-sm mt-1">Revenue, transactions and financial reporting</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pitch-600/10 text-pitch-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">£{(summary.total_revenue / 100).toFixed(0)}</p>
                <p className="text-xs text-navy-400">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600/10 text-blue-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">£{(summary.this_month.revenue / 100).toFixed(0)}</p>
                <p className="text-xs text-navy-400">This Month ({summary.this_month.transactions} txns)</p>
              </div>
            </div>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pitch-600/10 text-pitch-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.active_subscriptions}</p>
                <p className="text-xs text-navy-400">Active Subscriptions</p>
              </div>
            </div>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary.overdue_subscriptions > 0 ? 'bg-amber-600/10 text-amber-400' : 'bg-navy-800 text-navy-400'}`}>
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.overdue_subscriptions}</p>
                <p className="text-xs text-navy-400">Overdue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast */}
      {forecast && forecast.monthly_projected > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3">Revenue Forecast</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-navy-400">Monthly Projected</p>
              <p className="text-xl font-bold text-pitch-400">£{(forecast.monthly_projected / 100).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-navy-400">Annual Projected</p>
              <p className="text-xl font-bold text-white">£{(forecast.annual_projected / 100).toFixed(0)}</p>
            </div>
          </div>
          {forecast.plan_breakdown.length > 0 && (
            <div className="mt-4 space-y-2">
              {forecast.plan_breakdown.map((pb, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-navy-400">{pb.subscribers} subscribers × £{(pb.amount / 100).toFixed(2)}/{pb.interval}</span>
                  <span className="text-navy-200">£{(pb.monthly_projected / 100).toFixed(0)}/mo</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly breakdown */}
      {summary?.monthly_breakdown?.length > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3">Monthly Breakdown</h3>
          <div className="space-y-2">
            {summary.monthly_breakdown.map((month, i) => {
              const prev = summary.monthly_breakdown[i + 1]
              const change = prev ? ((month.revenue - prev.revenue) / (prev.revenue || 1)) * 100 : 0
              return (
                <div key={month.month} className="flex items-center justify-between py-2 border-b border-navy-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-navy-300 w-20">{month.month}</span>
                    <span className="text-xs text-navy-500">{month.transaction_count} txns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">£{(month.revenue / 100).toFixed(0)}</span>
                    {prev && (
                      <span className={`flex items-center text-xs ${change >= 0 ? 'text-pitch-400' : 'text-alert-400'}`}>
                        {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(change).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-800">
          <h3 className="font-semibold text-white">Transactions</h3>
          <p className="text-xs text-navy-400 mt-0.5">{totalTransactions} total</p>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-navy-400 text-sm">No transactions yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-navy-400 border-b border-navy-800">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Player</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <tr key={txn.id} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                      <td className="px-4 py-2.5 text-navy-300">
                        {new Date(txn.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-2.5 text-white">{txn.player_name || '-'}</td>
                      <td className="px-4 py-2.5 text-navy-300">{txn.plan_name || '-'}</td>
                      <td className="px-4 py-2.5 text-white">£{(txn.amount / 100).toFixed(2)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          txn.status === 'succeeded' ? 'bg-pitch-600/20 text-pitch-400' :
                          txn.status === 'pending' ? 'bg-amber-600/20 text-amber-400' :
                          'bg-alert-600/20 text-alert-400'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalTransactions > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-navy-800">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-sm text-navy-400 hover:text-white disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-xs text-navy-400">
                  Page {page + 1} of {Math.ceil(totalTransactions / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalTransactions}
                  className="px-3 py-1 text-sm text-navy-400 hover:text-white disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
