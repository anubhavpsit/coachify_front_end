import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { api, getErrorMessage, getFieldErrors } from './apiClient'

function axiosErr(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('x', 'ERR', config, {}, { status, data, statusText: '', headers: {}, config })
}

describe('apiClient', () => {
  it('adds the bearer token like the pages did', async () => {
    localStorage.setItem('authToken', 'tok')
    let seen: AxiosHeaders | undefined
    await api.get('/x', {
      adapter: async (config) => {
        seen = config.headers as AxiosHeaders
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      },
    })
    expect(seen?.get('Authorization')).toBe('Bearer tok')
    localStorage.clear()
  })
  it('maps Laravel 422 errors to fields', () => {
    const err = axiosErr(422, { message: 'The given data was invalid.', errors: { email: ['Taken.'], 'activities.0.subject_id': ['Required.'] } })
    expect(getFieldErrors(err)).toEqual({ email: 'Taken.', 'activities.0.subject_id': 'Required.' })
    expect(getErrorMessage(err)).toBe('Taken.')
  })
  it('falls back sensibly', () => {
    expect(getFieldErrors(axiosErr(500, {}))).toEqual({})
    expect(getErrorMessage(axiosErr(500, { message: 'Boom' }))).toBe('Boom')
    expect(getErrorMessage(new Error('x'), 'fallback')).toBe('fallback')
  })
})
