import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { pupilManagementService } from '../../services/api'
import {
  Users, Search, Plus, Filter, ChevronRight, ChevronLeft,
  Upload, X, GraduationCap, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function HoDPupils() {
  const [pupils, setPupils] = useState([])
  const [stats, setStats] = useState(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [houseFilter, setHouseFilter] = useState('')
  const [page, setPage] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', year_group: '', house: '' })
  const [adding, setAdding] = useState(false)
  const pageSize = 50

  useEffect(() => {
    pupilManagementService.getStats()
      .then(res => setStats(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadPupils()
  }, [search, yearFilter, houseFilter, page])

  async function loadPupils() {
    setLoading(true)
    try {
      const res = await pupilManagementService.list({
        search: search || undefined,
        year_group: yearFilter || undefined,
        house: houseFilter || undefined,
        limit: pageSize,
        offset: page * pageSize,
      })
      setPupils(res.data.pupils)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to load pupils:', err)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function handleAdd(e) {
    e.preventDefault()
    if (!addForm.first_name.trim()) {
      toast.error('First name is required')
      return
    }
    setAdding(true)
    try {
      await pupilManagementService.create({
        first_name: addForm.first_name.trim(),
        last_name: addForm.last_name.trim(),
        year_group: addForm.year_group ? parseInt(addForm.year_group) : null,
        house: addForm.house.trim() || null,
      })
      toast.success('Pupil added')
      setShowAdd(false)
      setAddForm({ first_name: '', last_name: '', year_group: '', house: '' })
      loadPupils()
    } catch (err) {
      toast.error('Failed to add pupil')
    } finally {
      setAdding(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Pupils</h1>
          <p className="text-secondary mt-1">
            {total > 0 ? `${total} pupils across the school` : 'Manage your school pupil roster'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/onboarding"
            className="flex items-center gap-2 px-3 py-2 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            CSV Import
          </Link>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Pupil
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && stats.by_year_group.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setYearFilter(''); setPage(0) }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              !yearFilter ? 'bg-pitch-600/20 text-pitch-400' : 'bg-subtle text-secondary hover:text-link'
            }`}
          >
            All ({stats.total})
          </button>
          {stats.by_year_group.map(yg => (
            <button
              key={yg.year_group}
              onClick={() => { setYearFilter(String(yg.year_group)); setPage(0) }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                yearFilter === String(yg.year_group) ? 'bg-pitch-600/20 text-pitch-400' : 'bg-subtle text-secondary hover:text-link'
              }`}
            >
              Year {yg.year_group} ({yg.count})
            </button>
          ))}
          {stats.by_house.length > 0 && (
            <>
              <div className="w-px bg-border-default mx-1" />
              {stats.by_house.map(h => (
                <button
                  key={h.house}
                  onClick={() => { setHouseFilter(houseFilter === h.house ? '' : h.house); setPage(0) }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    houseFilter === h.house ? 'bg-amber-400/20 text-amber-400' : 'bg-subtle text-secondary hover:text-link'
                  }`}
                >
                  {h.house} ({h.count})
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
        <input
          type="text"
          placeholder="Search by name..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
        />
      </div>

      {/* Pupil table */}
      {loading && pupils.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="spinner w-8 h-8" />
        </div>
      ) : pupils.length > 0 ? (
        <>
          <div className="bg-card rounded-xl border border-border-default overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-3">Year</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-3">House</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-3">Sports</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-3">Assessments</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pupils.map((pupil, i) => (
                  <tr key={pupil.id} className={`border-b border-border-subtle hover:bg-subtle ${i % 2 === 0 ? '' : 'bg-subtle/10'}`}>
                    <td className="px-5 py-3">
                      <Link to={`/teacher/hod/pupils/${pupil.id}`} className="text-sm font-medium text-primary hover:text-pitch-400 transition-colors">
                        {pupil.last_name}, {pupil.first_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {pupil.year_group ? (
                        <span className="text-sm text-secondary">Year {pupil.year_group}</span>
                      ) : (
                        <span className="text-xs text-tertiary">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pupil.house ? (
                        <span className="px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded text-xs">{pupil.house}</span>
                      ) : (
                        <span className="text-xs text-tertiary">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {pupil.curriculum_sports?.filter(Boolean).map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-subtle rounded text-xs text-secondary capitalize">{s}</span>
                        ))}
                        {(!pupil.curriculum_sports || pupil.curriculum_sports.filter(Boolean).length === 0) && (
                          <span className="text-xs text-tertiary">--</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-secondary">{pupil.assessment_count || 0}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/teacher/hod/pupils/${pupil.id}`}>
                        <ChevronRight className="w-4 h-4 text-tertiary" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-secondary">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 bg-subtle text-secondary rounded text-sm disabled:opacity-30 hover:text-link transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 bg-subtle text-secondary rounded text-sm disabled:opacity-30 hover:text-link transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            {search || yearFilter || houseFilter ? 'No pupils match your search' : 'No pupils yet'}
          </h3>
          <p className="text-secondary text-sm max-w-md mx-auto">
            {!search && !yearFilter && !houseFilter && 'Import pupils via CSV from the onboarding wizard, or add them one by one.'}
          </p>
        </div>
      )}

      {/* Add Pupil Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border-strong w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-primary">Add Pupil</h2>
              <button onClick={() => setShowAdd(false)} className="text-secondary hover:text-link">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">First Name *</label>
                  <input type="text" value={addForm.first_name} onChange={e => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    autoFocus />
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Last Name</label>
                  <input type="text" value={addForm.last_name} onChange={e => setAddForm({ ...addForm, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">Year Group</label>
                  <select value={addForm.year_group} onChange={e => setAddForm({ ...addForm, year_group: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500">
                    <option value="">--</option>
                    {[2,3,4,5,6,7,8,9,10,11,12,13].map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">House</label>
                  <input type="text" placeholder="e.g., Tudor" value={addForm.house} onChange={e => setAddForm({ ...addForm, house: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={adding}
                  className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {adding ? 'Adding...' : 'Add Pupil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
