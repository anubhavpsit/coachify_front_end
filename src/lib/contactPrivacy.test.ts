import { describe, expect, it } from 'vitest'
import { restrictsContacts, seesContactsOf } from './contactPrivacy'

describe('contactPrivacy', () => {
  it('teachers and students only see their own contact details', () => {
    expect(seesContactsOf({ id: 5, role: 'teacher' }, 9)).toBe(false)
    expect(seesContactsOf({ id: 5, role: 'student' }, 9)).toBe(false)
    expect(seesContactsOf({ id: 5, role: 'student' }, '5')).toBe(true)
    expect(restrictsContacts({ id: 5, role: 'teacher' })).toBe(true)
  })
  it('admins and staff see everyone', () => {
    expect(seesContactsOf({ id: 1, role: 'coaching_admin' }, 9)).toBe(true)
    expect(seesContactsOf({ id: 1, role: 'staff' }, 9)).toBe(true)
    expect(restrictsContacts(null)).toBe(false)
  })
})
