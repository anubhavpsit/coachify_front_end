import { useEffect } from 'react'

/**
 * Browser "leave site?" prompt while `active` (tab close / reload).
 * In-app route changes can't be blocked under <BrowserRouter> (needs a data router).
 */
export function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}
