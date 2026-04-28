import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

// Lightweight popover anchored to a trigger element. Click-outside + Esc dismiss.
// `align` controls horizontal alignment relative to the anchor: 'right' (default)
// pins the popover's right edge to the anchor's right edge; 'left' pins left.
// Renders in a portal so it escapes any overflow:hidden ancestors.
export default function Popover({ open, onClose, anchorRef, children, width = 280, align = 'right', offset = 8, zIndex = 30 }) {
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function onKey(e) { if (e.key === 'Escape') onClose() }
    function onPointer(e) {
      if (popoverRef.current?.contains(e.target)) return
      if (anchorRef?.current?.contains(e.target)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open, onClose, anchorRef])

  if (typeof document === 'undefined') return null

  // Compute position from the anchor each frame — handles scroll / resize cheaply
  // because we're already animating with framer-motion.
  const rect = anchorRef?.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + offset : 0
  const right = rect ? Math.max(8, window.innerWidth - rect.right) : 8
  const left = rect ? rect.left : 0

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top, width,
            ...(align === 'right' ? { right } : { left }),
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: 'var(--shadow-overlay, 0 24px 60px rgba(15,30,61,0.18), 0 4px 12px rgba(15,30,61,0.10))',
            zIndex,
            overflow: 'hidden',
          }}
          role="dialog"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
