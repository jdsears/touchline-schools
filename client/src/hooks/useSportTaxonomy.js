import { useState, useEffect } from 'react'
import { videoService } from '../services/api'

const cache = {}

export function useSportTaxonomy(sport) {
  const key = sport || 'football'
  const [taxonomy, setTaxonomy] = useState(cache[key] || null)

  useEffect(() => {
    if (cache[key]) {
      setTaxonomy(cache[key])
      return
    }
    videoService.getSportTaxonomy(key).then(res => {
      cache[key] = res.data
      setTaxonomy(res.data)
    }).catch(() => {
      // Silently fail — component falls back to defaults
    })
  }, [key])

  return taxonomy
}
