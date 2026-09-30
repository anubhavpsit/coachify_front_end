import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { getErrorMessage, getFieldErrors } from './apiClient'

/**
 * Put a Laravel 422 `errors` object onto matching form fields.
 * `fieldMap` translates API keys to form paths when they differ.
 * Returns a general message for anything that couldn't be attached to a
 * field (show it in a form-level alert or toast), or null if every error
 * landed on a field.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
  { fieldMap = {}, fallback }: { fieldMap?: Record<string, string>; fallback?: string } = {},
): string | null {
  const fields = getFieldErrors(err)
  const leftovers: string[] = []
  let focused = false
  for (const [apiKey, message] of Object.entries(fields)) {
    const path = fieldMap[apiKey] ?? apiKey
    if (knownFields.includes(path)) {
      setError(path as Path<T>, { type: 'server', message }, { shouldFocus: !focused })
      focused = true
    } else {
      leftovers.push(message)
    }
  }
  if (Object.keys(fields).length === 0) return getErrorMessage(err, fallback)
  return leftovers.length ? leftovers[0] : null
}
