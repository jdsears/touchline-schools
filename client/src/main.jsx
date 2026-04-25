import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { TeamProvider } from './context/TeamContext'
import { ThemeProvider } from './context/ThemeContext'
import CookieConsent from './components/common/CookieConsent'
import InstallPrompt from './components/common/InstallPrompt'
import IOSInstallInstructions from './components/common/IOSInstallInstructions'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/600.css'
import '@fontsource/source-serif-4/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope)

        // Check for SW updates when app regains focus (PWA has no refresh button)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update()
          }
        })
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light">
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <App />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#243b53',
                color: '#fff',
                border: '1px solid #334e68',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <CookieConsent />
          {/* Install prompts disabled until branding is fully updated
          <InstallPrompt />
          <IOSInstallInstructions />
          */}
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
    </ThemeProvider>
  </React.StrictMode>
)
