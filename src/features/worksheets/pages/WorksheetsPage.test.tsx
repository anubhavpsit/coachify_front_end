import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import WorksheetsPage from './WorksheetsPage'

const summary = {
  id: 12,
  title: 'Friction practice',
  subject: { id: 5, subject: 'Science' },
  class: { id: 1, name: 'Class 8' },
  grade: 8,
  topics: [{ id: 30, name: 'Friction' }],
  questions_count: 2,
  layout: 'standard',
  show_marks: false,
  created_by: { id: 2, name: 'Meera' },
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-21T10:00:00Z',
}
const question = (id: number, html: string, extra = {}) => ({ id, topic_id: 30, question_type: 'mcq', question_html: html, option_a: 'Heat', option_b: 'Light', difficulty: 'easy', correct_answer: 'a', marks: 1, ...extra })
const detail = { ...summary, instructions: 'Answer all.', subject_id: 5, class_id: 1, topic_ids: [30], total_marks: 2, max_questions: 100, min_questions: 50, questions: [question(91, '<p>First question?</p>'), question(92, '<p>Second question?</p>')] }

function signIn(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 4, permissions }))
}

function mockGets(list = [summary]) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })
    if (url.endsWith('/worksheets')) return ok(list)
    if (url.endsWith('/worksheets/topics')) return ok([{ id: 30, name: 'Friction', chapter: 'Force', grade: null, questions_count: 14 }, { id: 31, name: 'Pressure', chapter: null, grade: null, questions_count: 0 }])
    if (url.endsWith('/worksheets/12')) return ok(detail)
    if (url.endsWith('/worksheets/12/available')) return ok([question(93, '<p>Bank question?</p>')])
    if (url.endsWith('/worksheets/12/print')) return Promise.resolve({ data: new Blob(['%PDF']) })
    if (url.endsWith('/subjects/4')) return Promise.resolve({ data: { status: true, data: [{ id: 5, subject: 'Science' }] } })
    if (url.endsWith('/classes/4')) return ok([{ id: 1, name: 'Class 8' }])
    return ok([])
  })
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <WorksheetsPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('WorksheetsPage', () => {
  it('lists worksheets; admins see who created each', async () => {
    signIn('coaching_admin')
    mockGets()
    renderPage()
    const row = (await screen.findByText('Friction practice')).closest('tr')!
    expect(within(row).getByText('Science')).toBeTruthy()
    expect(within(row).getByText('Class 8')).toBeTruthy()
    expect(within(row).getByText('Meera')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: /Created by/ })).toBeTruthy()
  })

  it('teachers do not get the Created by column', async () => {
    signIn('teacher')
    mockGets()
    renderPage()
    await screen.findByText('Friction practice')
    expect(screen.queryByRole('columnheader', { name: /Created by/ })).toBeNull()
  })

  it('creates a worksheet with auto-picked questions, then opens the editor', async () => {
    signIn('teacher')
    const get = mockGets([])
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, message: null, data: detail } })
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: /New worksheet/ }))[0])
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByLabelText(/^Title/), 'Friction practice')
    await userEvent.selectOptions(within(d).getByLabelText(/^Subject/), '5')
    await userEvent.selectOptions(within(d).getByLabelText(/^Class/), '1')
    // topics load for the subject + class level (Class 8 → grade 8), with counts
    expect(await within(d).findByText('14 questions')).toBeTruthy()
    expect(get.mock.calls.some(([u, cfg]) => String(u).endsWith('/worksheets/topics') && (cfg as { params: Record<string, unknown> }).params.grade === 8)).toBe(true)
    await userEvent.click(within(d).getByRole('checkbox', { name: /Friction/ }))
    await userEvent.click(within(d).getByRole('checkbox', { name: 'MCQ' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Create worksheet' }))

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toMatchObject({
      title: 'Friction practice', subject_id: 5, class_id: 1, topic_ids: [30], layout: 'standard', show_marks: false,
      auto: { count: 50, difficulty: 'mix', types: ['mcq'] },
    })
    // editor opens on the new worksheet
    expect(await screen.findByText('First question?')).toBeTruthy()
  })

  it('a worksheet needs at least 50 questions', async () => {
    signIn('teacher')
    mockGets([])
    const post = vi.spyOn(axios, 'post')
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: /New worksheet/ }))[0])
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByLabelText(/^Title/), 'X')
    await userEvent.selectOptions(within(d).getByLabelText(/^Subject/), '5')
    await userEvent.click(await within(d).findByRole('checkbox', { name: /Friction/ }))
    const count = within(d).getByLabelText(/^Number of questions/)
    await userEvent.clear(count)
    await userEvent.type(count, '20')
    await userEvent.click(within(d).getByRole('button', { name: 'Create worksheet' }))
    expect(await within(d).findByText('At least 50 questions.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('editor: Replace all asks for a fresh set of questions', async () => {
    signIn('teacher')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, message: null, data: detail } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Edit questions of Friction practice' }))
    const d = await screen.findByRole('dialog')
    await within(d).findByText('First question?')
    expect(within(d).getByText(/worksheets should have at least 50/)).toBeTruthy()
    await userEvent.click(within(d).getByRole('button', { name: /Replace all with new questions/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, replace' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toMatch(/\/worksheets\/12\/auto-pick$/)
    expect(post.mock.calls[0][1]).toMatchObject({ count: 50, replace: true })
  })

  it('topics are required', async () => {
    signIn('teacher')
    mockGets([])
    const post = vi.spyOn(axios, 'post')
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: /New worksheet/ }))[0])
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByLabelText(/^Title/), 'X')
    await userEvent.selectOptions(within(d).getByLabelText(/^Subject/), '5')
    await within(d).findByText('14 questions')
    await userEvent.click(within(d).getByRole('button', { name: 'Create worksheet' }))
    expect(await within(d).findByText('Pick at least one topic.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('editor: reorder, remove and add from the bank, then save the new order', async () => {
    signIn('teacher')
    mockGets()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true, data: detail } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Edit questions of Friction practice' }))
    const d = await screen.findByRole('dialog')
    await within(d).findByText('First question?')

    await userEvent.click(within(d).getByRole('button', { name: 'Move question 2 up' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Add from the bank' }))
    await userEvent.click(await within(d).findByRole('checkbox', { name: /Bank question/ }))
    await userEvent.click(within(d).getByRole('button', { name: /^Add \(1\)/ }))
    await userEvent.click(within(d).getByRole('button', { name: 'Remove question 2' })) // removes "First question?"
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls[0][0]).toMatch(/\/worksheets\/12\/questions$/)
    expect((put.mock.calls[0][1] as { questions: { question_id: number }[] }).questions.map((q) => q.question_id)).toEqual([92, 93])
  })

  it('print: answer key for Set B opens a PDF with those options', async () => {
    signIn('coaching_admin')
    const get = mockGets()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Print Friction practice' }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(within(d).getByRole('radio', { name: /Answer key/ }))
    await userEvent.click(within(d).getByRole('radio', { name: /Set B/ }))
    await userEvent.click(within(d).getByRole('button', { name: /Open PDF/ }))

    await waitFor(() => expect(open).toHaveBeenCalled())
    const call = get.mock.calls.find(([u]) => String(u).endsWith('/worksheets/12/print'))!
    expect((call[1] as { params: Record<string, string> }).params).toEqual({ copy: 'answers', set: 'B', explanations: '1' })
  })
})
