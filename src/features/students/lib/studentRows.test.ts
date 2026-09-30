import { describe, expect, it } from 'vitest'
import { studentDefaults } from '../schemas/studentForm'
import type { Student } from '../services/studentsService'
import { normalizeSubjectIds, subjectNamesFor } from './studentRows'

describe('normalizeSubjectIds / subjectNamesFor (dirty stored ids)', () => {
  const subjects = [
    { id: 1, subject: 'Mathematics' },
    { id: 3, subject: 'English' },
    { id: 5, subject: 'Computer' },
  ]
  const student = (ids: unknown) => ({ id: 1, name: 'S', email: 's@x', student_profile: { class: null, subjects: ids, phone: '' } }) as unknown as Student

  it('coerces strings, drops repeats, junk and unknown ids, keeps order', () => {
    expect(normalizeSubjectIds([5, '3', 1, '5', 3, 1, 'x', 0, null, 15])).toEqual([5, 3, 1, 15])
    expect(normalizeSubjectIds(null)).toEqual([])
  })

  it('shows each subject once, including records saved with string ids', () => {
    expect(subjectNamesFor(student([5, 3, 1, 5, 3, 1, 15]), subjects)).toEqual(['Computer', 'English', 'Mathematics'])
    expect(subjectNamesFor(student(['5']), subjects)).toEqual(['Computer'])
  })

  it('edit form starts from the clean list', () => {
    expect(studentDefaults(student(['5', 5, '1'])).subjects).toEqual([5, 1])
  })
})
