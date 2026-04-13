import { useState, useEffect } from 'react'
import { giftAidService, parentService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Heart, FileText, Download, Check, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ParentGiftAid() {
  const { user } = useAuth()
  const [declarations, setDeclarations] = useState([])
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingClub, setEditingClub] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [declRes, receiptRes] = await Promise.all([
        giftAidService.getMyDeclarations(),
        giftAidService.getMyReceipts(),
      ])
      setDeclarations(declRes.data || [])
      setReceipts(receiptRes.data || [])
    } catch (err) {
      toast.error('Failed to load Gift Aid data')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(clubId, existing) {
    setEditingClub(clubId)
    setForm({
      gift_aid_opted_in: existing?.gift_aid_opted_in || false,
      gift_aid_percentage: existing?.gift_aid_percentage || 10,
      full_name: existing?.full_name || user?.name || '',
      home_address: existing?.home_address || '',
      postcode: existing?.postcode || '',
      declaration_confirmed: false,
    })
  }

  async function handleSave(clubId) {
    setSaving(true)
    try {
      await giftAidService.saveDeclaration(clubId, form)
      toast.success('Gift Aid declaration saved')
      setEditingClub(null)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save declaration')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadReceipt(receiptId) {
    try {
      const res = await giftAidService.downloadReceipt(receiptId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gift-aid-receipt-${receiptId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Failed to download receipt')
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="h-8 w-40 bg-navy-800 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-navy-900 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const presetPercentages = [5, 10, 20]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-600/10 text-pink-400">
          <Heart className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Gift Aid</h1>
          <p className="text-navy-400 text-sm mt-0.5">Manage your Gift Aid declarations and view receipts</p>
        </div>
      </div>

      {/* Declarations */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your Declarations</h2>

        {declarations.length === 0 ? (
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 text-center">
            <Heart className="w-10 h-10 mx-auto mb-3 text-navy-600" />
            <p className="text-white font-medium mb-1">No Gift Aid declarations</p>
            <p className="text-navy-400 text-sm">
              If your club supports Gift Aid, you can opt in from your club's payment page or here.
            </p>
          </div>
        ) : (
          declarations.map(d => (
            <div key={d.id} className="bg-navy-900 border border-navy-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-medium">{d.club_name}</h3>
                  <p className="text-navy-400 text-xs mt-0.5">
                    {d.gift_aid_opted_in
                      ? `${parseFloat(d.gift_aid_percentage).toFixed(0)}% donation rate`
                      : 'Opted out'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {d.gift_aid_opted_in ? (
                    <span className="text-xs bg-pitch-600/20 text-pitch-400 px-2 py-0.5 rounded-full">Active</span>
                  ) : (
                    <span className="text-xs bg-navy-700 text-navy-400 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                  <button
                    onClick={() => startEdit(d.club_id, d)}
                    className="text-xs text-pitch-400 hover:text-pitch-300"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {editingClub === d.club_id && (
                <DeclarationForm
                  form={form}
                  setForm={setForm}
                  presetPercentages={presetPercentages}
                  clubName={d.club_name}
                  saving={saving}
                  onSave={() => handleSave(d.club_id)}
                  onCancel={() => setEditingClub(null)}
                />
              )}
            </div>
          ))
        )}
      </section>

      {/* Receipts */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Gift Aid Receipts</h2>

        {receipts.length === 0 ? (
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-navy-600" />
            <p className="text-white font-medium mb-1">No receipts yet</p>
            <p className="text-navy-400 text-sm">Gift Aid receipts will appear here after you make payments with Gift Aid.</p>
          </div>
        ) : (
          <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-navy-400 text-xs border-b border-navy-800">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Club</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-right px-4 py-3">Donation</th>
                    <th className="text-left px-4 py-3">Receipt</th>
                    <th className="text-left px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map(r => (
                    <tr key={r.id} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                      <td className="px-4 py-3 text-navy-300">
                        {new Date(r.payment_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-white">{r.club_name}</td>
                      <td className="px-4 py-3 text-navy-400">{r.payment_description}</td>
                      <td className="px-4 py-3 text-right text-pitch-400 font-medium">
                        £{(r.gift_aid_donation / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-navy-400 font-mono text-xs">{r.receipt_number}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDownloadReceipt(r.id)}
                          className="flex items-center gap-1 text-xs text-pitch-400 hover:text-pitch-300"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function DeclarationForm({ form, setForm, presetPercentages, clubName, saving, onSave, onCancel }) {
  return (
    <div className="mt-4 pt-4 border-t border-navy-800 space-y-4">
      {/* Opt in toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-white">Add Gift Aid donation to payments</label>
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, gift_aid_opted_in: !f.gift_aid_opted_in }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            form.gift_aid_opted_in ? 'bg-pitch-600' : 'bg-navy-700'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            form.gift_aid_opted_in ? 'translate-x-5' : ''
          }`} />
        </button>
      </div>

      {form.gift_aid_opted_in && (
        <>
          {/* Percentage selector */}
          <div>
            <label className="block text-xs text-navy-400 mb-2">Donation rate (% of base fee)</label>
            <div className="flex gap-2">
              {presetPercentages.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, gift_aid_percentage: p }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    Number(form.gift_aid_percentage) === p
                      ? 'bg-pitch-600 text-white'
                      : 'bg-navy-800 text-navy-400 hover:text-white'
                  }`}
                >
                  {p}%
                </button>
              ))}
              <input
                type="number"
                value={form.gift_aid_percentage}
                onChange={(e) => setForm(f => ({ ...f, gift_aid_percentage: parseFloat(e.target.value) || 0 }))}
                className="w-20 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm text-center focus:ring-2 focus:ring-pitch-600"
                min="1"
                max="100"
                placeholder="%"
              />
            </div>
            {form.gift_aid_percentage > 50 && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                That's a high donation rate — are you sure?
              </p>
            )}
          </div>

          {/* Personal details */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Full Name *</label>
              <input
                type="text" required value={form.full_name}
                onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Home Address *</label>
              <textarea
                required value={form.home_address}
                onChange={(e) => setForm(f => ({ ...f, home_address: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Postcode *</label>
              <input
                type="text" required value={form.postcode}
                onChange={(e) => setForm(f => ({ ...f, postcode: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600"
              />
            </div>
          </div>

          {/* Declaration */}
          <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
            <p className="text-xs text-navy-300 leading-relaxed mb-3">
              "I am a UK taxpayer and I want {clubName} to reclaim Gift Aid on my
              voluntary donations. I understand that if I pay less Income Tax and/or
              Capital Gains Tax than the amount of Gift Aid claimed on all my
              donations in the current tax year, it is my responsibility to pay any
              difference."
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.declaration_confirmed}
                onChange={(e) => setForm(f => ({ ...f, declaration_confirmed: e.target.checked }))}
                className="rounded border-navy-600 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
              />
              <span className="text-sm text-white">I confirm this declaration</span>
            </label>
          </div>
        </>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-navy-800 text-navy-400 hover:text-white rounded-lg text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || (form.gift_aid_opted_in && !form.declaration_confirmed)}
          className="flex items-center gap-1.5 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Declaration'}
        </button>
      </div>
    </div>
  )
}
