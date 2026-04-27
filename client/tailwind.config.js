/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // v1.5 canonical tokens (resolve to CSS variables)
        'brand-primary': 'var(--brand-primary)',
        'brand-primary-hover': 'var(--brand-primary-hover)',
        'brand-primary-tint': 'var(--brand-primary-tint)',
        'brand-accent': 'var(--brand-accent)',
        'brand-accent-hover': 'var(--brand-accent-hover)',
        'brand-accent-tint': 'var(--brand-accent-tint)',
        'surface-page': 'var(--surface-page)',
        'surface-card': 'var(--surface-card)',
        'surface-sunken': 'var(--surface-sunken)',
        'surface-raised': 'var(--surface-raised)',
        'status-success': 'var(--status-success)',
        'status-success-tint': 'var(--status-success-tint)',
        'status-warning': 'var(--status-warning)',
        'status-warning-tint': 'var(--status-warning-tint)',
        'status-error': 'var(--status-error)',
        'status-error-tint': 'var(--status-error-tint)',
        'status-info': 'var(--status-info)',
        'status-info-tint': 'var(--status-info-tint)',

        // Legacy semantic tokens (backward compat with v1.10 components)
        page: 'var(--surface-page)',
        card: 'var(--surface-card)',
        subtle: 'var(--surface-sunken)',
        elevated: 'var(--surface-raised)',
        'input-bg': 'var(--surface-card)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        'on-dark': 'var(--text-on-dark)',
        link: 'var(--brand-primary)',
        'link-hover': 'var(--brand-primary-hover)',
        'border-strong': 'var(--border-strong)',
        'border-default': 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        'border-focus': 'var(--brand-primary)',
        'brand-navy': 'var(--brand-primary)',
        'brand-navy-hover': 'var(--brand-primary-hover)',
        'brand-gold': 'var(--brand-accent)',
        'brand-gold-deep': 'var(--brand-accent-hover)',
        success: 'var(--status-success)',
        'success-bg': 'var(--status-success-tint)',
        warning: 'var(--status-warning)',
        'warning-bg': 'var(--status-warning-tint)',
        error: 'var(--status-error)',
        'error-bg': 'var(--status-error-tint)',
        info: 'var(--status-info)',
        'info-bg': 'var(--status-info-tint)',

        // Touchline Brand - Deep navy backgrounds (kept for existing component compat)
        navy: {
          50: '#F5F7FA',   // Text primary
          100: '#E1E5EB',
          200: '#C4CBD6',
          300: '#A3ADBF',
          400: '#7A8CA4',  // Text secondary
          500: '#5A6B82',
          600: '#3D4F66',
          700: '#12263A',  // Background secondary
          800: '#0E1F30',
          900: '#0B1C2D',  // Background primary
          950: '#070F18',
        },
        // Pitch Green - Guidance, confirmation, intelligence
        pitch: {
          50: '#E8FBF0',
          100: '#C5F5DB',
          200: '#8EEBBE',
          300: '#5CE0A0',
          400: '#2ED573',  // Brand primary
          500: '#26B562',
          600: '#1E9550',
          700: '#17753F',
          800: '#10562E',
          900: '#0A3A1F',
          950: '#051E10',
        },
        // Amber - Attention, emphasis (use sparingly)
        amber: {
          50: '#FEF7E8',
          100: '#FDECCC',
          200: '#FBD899',
          300: '#F9C366',
          400: '#F5A623',  // Brand accent
          500: '#D9901E',
          600: '#B37619',
          700: '#8C5C14',
          800: '#66430F',
          900: '#402A09',
          950: '#1F1505',
        },
        // Energy - Legacy support (maps to amber)
        energy: {
          50: '#FEF7E8',
          100: '#FDECCC',
          200: '#FBD899',
          300: '#F9C366',
          400: '#F5A623',
          500: '#D9901E',
          600: '#B37619',
          700: '#8C5C14',
          800: '#66430F',
          900: '#402A09',
        },
        // Alert - Red card
        alert: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Warning - Yellow card
        caution: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Source Serif 4', 'Crimson Pro', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'pitch-pattern': "url('/pitch-pattern.svg')",
        'grass-texture': "linear-gradient(135deg, #166534 0%, #15803d 50%, #14532d 100%)",
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)',
        'token-sm': 'var(--shadow-sm)',
        'token-md': 'var(--shadow-md)',
        'token-lg': 'var(--shadow-lg)',
      },
      borderRadius: {
        'token-sm': 'var(--radius-sm)',
        'token-md': 'var(--radius-md)',
        'token-lg': 'var(--radius-lg)',
        'token-xl': 'var(--radius-xl)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'sheet-up': 'sheetUp 0.25s ease-out',
        'page-in': 'pageIn 0.15s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        sheetUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pageIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
