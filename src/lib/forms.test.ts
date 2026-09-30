import { describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { applyServerErrors } from './forms'
import { email, password } from './validation'

function err(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('x', 'ERR', config, {}, { status, data, statusText: '', headers: {}, config })
}

describe('applyServerErrors', () => {
  it('maps known fields, focuses the first, returns leftovers', () => {
    const setError = vi.fn()
    const general = applyServerErrors(err(422, { errors: { email: ['Taken.'], tenant_id: ['Bad tenant.'] } }), setError, ['email', 'password'])
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Taken.' }, { shouldFocus: true })
    expect(general).toBe('Bad tenant.')
  })
  it('returns a general message for non-422 errors', () => {
    expect(applyServerErrors(err(500, { message: 'Boom' }), vi.fn(), [])).toBe('Boom')
  })
})

describe('validation rules', () => {
  it('email trims and validates', () => {
    expect(email().parse('  a@b.co ')).toBe('a@b.co')
    expect(email().safeParse('nope').success).toBe(false)
    expect(email().safeParse('   ').error?.issues[0].message).toBe('Email is required.')
  })
  it('password needs 8+ characters (D4) and is not trimmed', () => {
    expect(password().safeParse('1234567').success).toBe(false)
    expect(password().safeParse('12345678').success).toBe(true)
    expect(password().parse(' pass word ')).toBe(' pass word ')
  })
})

import { looksLikeIndianMobile, optionalPhone } from './validation'
describe('phone rules', () => {
  it('matches the backend regex', () => {
    expect(optionalPhone().safeParse('').success).toBe(true)
    expect(optionalPhone().safeParse('+91 98765-43210').success).toBe(true)
    expect(optionalPhone().safeParse('12ab').success).toBe(false)
    expect(optionalPhone().safeParse('123').success).toBe(false)
  })
  it('Indian mobile hint', () => {
    expect(looksLikeIndianMobile('9876543210')).toBe(true)
    expect(looksLikeIndianMobile('+91 98765 43210')).toBe(true)
    expect(looksLikeIndianMobile('011 2345 6789')).toBe(false)
  })
})
