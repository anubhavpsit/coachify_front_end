import { useCallback, useState } from 'react'
import axios from 'axios'

export type NotifyState = 'idle' | 'sending' | 'sent' | 'error'

const FALLBACK = 'Failed to send the reminder.'

/**
 * Per-row "notify" state + message, as used by the dashboard reminder buttons.
 * `send(key, request)` runs the request; the response `message` (or the API
 * error message) is kept for display under the row.
 */
export function useNotifyStates<K extends string | number>() {
  const [states, setStates] = useState<Partial<Record<K, NotifyState>>>({})
  const [messages, setMessages] = useState<Partial<Record<K, string>>>({})

  const send = useCallback(async (key: K, request: () => Promise<{ message?: string }>) => {
    setStates((s) => ({ ...s, [key]: 'sending' }))
    setMessages((s) => ({ ...s, [key]: '' }))
    try {
      const body = await request()
      setStates((s) => ({ ...s, [key]: 'sent' }))
      setMessages((s) => ({ ...s, [key]: body?.message ?? '' }))
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message ? (err.response.data.message as string) : FALLBACK
      setStates((s) => ({ ...s, [key]: 'error' }))
      setMessages((s) => ({ ...s, [key]: message }))
    }
  }, [])

  return {
    stateOf: (key: K): NotifyState => states[key] ?? 'idle',
    messageOf: (key: K): string => messages[key] ?? '',
    send,
  }
}
