import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attachmentProblem, batchDefaults, batchSchema, blankEntry, dateProblem, entriesSchema, toActivityPayload, toBatchPayload, type EntryValues } from './activityForm'

const entry = (over: Partial<EntryValues> = {}): EntryValues => ({ ...blankEntry(), student_id: 3, subject_id: 5, notes: 'Fractions', ...over })
const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) => (r.success ? [] : r.error!.issues.map((i) => `${i.path.join('.')}: ${i.message}`))

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-01T10:00:00') }))
afterEach(() => vi.useRealTimers())

describe('entriesSchema', () => {
  it('needs a student, a subject and a topic or notes', () => {
    expect(issues(entriesSchema.safeParse({ entries: [entry({ student_id: '', subject_id: '', notes: '' })] }))).toEqual([
      'entries.0.student_id: Select a student.',
      'entries.0.subject_id: Select a subject.',
      'entries.0.notes: Add a topic or a short note about what you taught.',
    ])
    expect(entriesSchema.safeParse({ entries: [entry({ notes: '', topic: { id: 1, name: 'T', chapter_id: null } })] }).success).toBe(true)
    expect(entriesSchema.safeParse({ entries: [entry({ notes: '   ' })] }).success).toBe(false)
  })

  it('flags a second entry for the same student and subject', () => {
    expect(issues(entriesSchema.safeParse({ entries: [entry(), entry(), entry({ subject_id: 6 })] }))).toEqual(['entries.1.subject_id: Entry 1 already covers this student and subject for this day.'])
  })

  it('caps notes and homework at 2000 characters', () => {
    expect(issues(entriesSchema.safeParse({ entries: [entry({ homework: 'x'.repeat(2001) })] }))).toEqual(['entries.0.homework: Homework must be 2000 characters or fewer.'])
  })
})

describe('payloads keep the legacy shape', () => {
  it('per-student item', () => {
    const e = entry({ id: 9, chapter: { id: 2, name: 'C' }, topic: { id: 4, name: 'T', chapter_id: 2 }, homework: '', chapter_number: null })
    expect(toActivityPayload(e, '2026-09-30')).toEqual({
      id: 9,
      student_id: 3,
      subject_id: 5,
      chapter_number: null,
      chapter_id: 2,
      topic_id: 4,
      notes: 'Fractions',
      homework: null,
      homework_status: 'not_done',
      activity_date: '2026-09-30',
    })
  })

  it('batch body', () => {
    expect(toBatchPayload({ ...batchDefaults(), class_id: '1', subject_id: '5', notes: 'N' }, '2026-10-01')).toEqual({
      class_id: '1',
      subject_id: '5',
      chapter_number: null,
      chapter_id: null,
      topic_id: null,
      notes: 'N',
      homework: null,
      activity_date: '2026-10-01',
    })
  })
})

describe('batchSchema', () => {
  it('requires class, subject and content, and checks files', () => {
    expect(issues(batchSchema.safeParse(batchDefaults()))).toEqual(['class_id: Select a class.', 'subject_id: Select a subject.', 'notes: Add a topic or a short note about what you taught.'])
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })
    expect(issues(batchSchema.safeParse({ ...batchDefaults(), class_id: '1', subject_id: '5', notes: 'N', files: [gif] }))).toEqual(['files: a.gif: only JPG, PNG, WebP or PDF files can be attached.'])
  })
})

describe('file and date checks', () => {
  it('mirrors mimes:jpeg,jpg,png,webp,pdf|max:10240', () => {
    expect(attachmentProblem(new File(['x'], 'page.PDF'))).toBeNull()
    expect(attachmentProblem(new File(['x'], 'photo.heic'))).toMatch(/only JPG, PNG, WebP or PDF/)
    const big = new File(['x'], 'scan.jpg')
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })
    expect(attachmentProblem(big)).toBe('scan.jpg is larger than 10 MB.')
    expect(attachmentProblem(new File([], 'empty.png'))).toBe('empty.png is empty.')
  })

  it('refuses empty and future dates', () => {
    expect(dateProblem('')).toBe('Pick the date of the lesson.')
    expect(dateProblem('2026-10-02')).toBe('The date cannot be in the future.')
    expect(dateProblem('2026-10-01')).toBeNull()
    expect(dateProblem('2025-01-15')).toBeNull()
  })
})
