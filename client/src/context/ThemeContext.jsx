import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const STORAGE_KEY = 'touchline-theme'

function getSystemPreference() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved) {
  document.documentElement.setAttribute('data-theme', resolved)
}

export function ThemeProvider({ children, defaultTheme = 'light' }) {
  const [preference, setPreference] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || defaultTheme }
    catch { return defaultTheme }
  })

  const resolved = preference === 'system' ? getSystemPreference() : preference

  useEffect(() => {
    applyTheme(resolved)
    try { localStorage.setItem(STORAGE_KEY, preference) } catch {}
  }, [preference, resolved])

  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(getSystemPreference())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
