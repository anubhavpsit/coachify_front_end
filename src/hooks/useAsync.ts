import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  /** Re-run the loader (e.g. a Retry button). */
  reload: () => void
}

/**
 * Runs `load` on mount and whenever `deps` change (and `enabled` is true).
 * Stale responses are ignored. Keep the request itself in a service module.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[], { enabled = true } = {}): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<unknown>(null)
  const [nonce, setNonce] = useState(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (!enabled) return
    let active = true
    Promise.resolve()
      .then(() => {
        if (!active) return
        setLoading(true)
        setError(null)
        return loadRef.current()
      })
      .then((result) => {
        if (active && result !== undefined) setData(result)
      })
      .catch((err) => {
        if (active) setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, loading, error, reload }
}
