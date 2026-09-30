import { z } from 'zod'
import { email, gender, optionalPassword, optionalPastDate, password, requiredText } from '@/lib/validation'

/**
 * Fields shared by Staff / Teacher / Student forms. Mirrors the Laravel rules
 * (name required|max:255, email required|unique, gender in:male,female,other,
 * dob nullable|date) with password min 8 (decision D4; backend moving to min:8).
 */
export const personFields = (mode: 'create' | 'edit') => ({
  name: requiredText('Name', 255),
  email: email(),
  password: mode === 'create' ? password() : optionalPassword(),
  dob: optionalPastDate(),
  gender: gender(),
})

export type PersonBase = {
  name: string
  email: string
  password: string
  dob: string
  gender: string
}

export const PERSON_FIELDS = ['name', 'email', 'password', 'dob', 'gender'] as const

export const todayInputValue = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const personSchema = (mode: 'create' | 'edit') => z.object(personFields(mode))
