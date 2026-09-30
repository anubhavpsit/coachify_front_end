import { useSyncExternalStore, type ReactNode } from 'react'
import { MotionProvider } from '@/animations'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

/** Current html[data-theme] (set by useTheme / the pre-paint script). */
function useDocumentTheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      return () => observer.disconnect()
    },
    () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'),
    () => 'light',
  )
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const theme = useDocumentTheme()
  return (
    <MotionProvider>
      <TooltipProvider>
        {children}
        <Toaster theme={theme} />
      </TooltipProvider>
    </MotionProvider>
  )
}
