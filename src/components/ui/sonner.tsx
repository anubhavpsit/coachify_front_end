import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** App-wide toasts, themed from the design tokens. Follows html[data-theme]. */
function Toaster({ theme = 'light', ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      closeButton
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
