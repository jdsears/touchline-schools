import { useState, useEffect } from 'react'
import { schoolBrandingService } from '../services/api'

function isLightColor(hex) {
  if (!hex) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

let cached = null

export function useSchoolBranding() {
  const [branding, setBranding] = useState(cached)

  useEffect(() => {
    if (cached) {
      applyCSS(cached)
      return
    }
    schoolBrandingService.getMyBranding().then(res => {
      const b = res.data?.branding
      if (b) {
        cached = b
        setBranding(b)
        applyCSS(b)
      }
    }).catch(() => {})
  }, [])

  return branding
}

function applyCSS(b) {
  const root = document.documentElement
  if (b.primaryColor) {
    root.style.setProperty('--school-primary', b.primaryColor)
    root.style.setProperty('--school-primary-text', isLightColor(b.primaryColor) ? '#0B1C2D' : '#F5F7FA')
  }
  if (b.secondaryColor) {
    root.style.setProperty('--school-secondary', b.secondaryColor)
    root.style.setProperty('--school-secondary-text', isLightColor(b.secondaryColor) ? '#0B1C2D' : '#F5F7FA')
  }
}
