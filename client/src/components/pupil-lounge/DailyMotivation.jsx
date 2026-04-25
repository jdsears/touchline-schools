import { useState, useEffect } from 'react'
import { usePupilProfile } from '../../hooks/usePupilProfile'
import api from '../../services/api'

export default function DailyMotivation() {
  const { pupil, loading: profileLoading } = usePupilProfile()
  const [quote, setQuote] = useState(null)

  useEffect(() => {
    if (!pupil?.id || !pupil?.year_group) return

    api.get(`/pupils/me/quote`)
      .then(r => setQuote(r.data))
      .catch(() => {})
  }, [pupil?.id, pupil?.year_group])

  if (profileLoading || !quote) return null

  return (
    <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-navy-900/50 border border-navy-800/50">
      <p className="text-sm text-white/80 italic leading-relaxed">
        "{quote.text}"
      </p>
      <p className="text-[10px] text-navy-500 mt-1.5 text-right">
        {quote.attribution}
      </p>
    </div>
  )
}
