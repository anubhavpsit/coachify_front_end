import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import TopicQuestionsPage from './TopicQuestionsPage'

const headers = { Authorization: 'Bearer tok', Accept: 'application/json' }
const base = {
  id: 1,
  tenant_id: 0,
  grade: 7,
  difficulty: 'easy',
  question_type: 'mcq',
  question_html: '<p>What is 2 + 2?</p><img src=x onerror="window.__xss()">',
  solution_html: '<p>Add them.</p>',
  option_a: '3',
  option_b: '4',
  option_c: '5',
  option_d: '6',
  correct_answer: 'b',
  answer_key: null,
  needs_image: false,
  image_note: null,
}
const own = { ...base, id: 2, tenant_id: 4, question_type: 'short_answer', question_html: '<p>Define a prime number.</p>', option_a: null, option_b: null, option_c: null, option_d: null, correct_answer: null, answer_key: 'Only divisible by 1 and itself', needs_image: true, image_note: 'number line' }

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const ok = (d: unknown) => Promise.resolve({ data: { success: true, data: d } })
    if (url.endsWith('/admin/topics/9')) return ok({ id: 9, name: 'Numbers', subject: { id: 5, subject: 'Maths' }, grade: 7 })
    if (url.endsWith('/admin/topics/9/questions')) return ok([base, own])
    return ok([])
  })
}

const renderIt = () =>
  render(
    <MemoryRouter initialEntries={['/topics/9/questions']}>
      <Routes>
        <Route path="/topics/:topicId/questions" element={<TopicQuestionsPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role: 'coaching_admin', tenant_id: 4, permissions: [] }))
})

describe('TopicQuestionsPage', () => {
  it('renders question HTML sanitised (no script), base questions read-only', async () => {
    const xss = vi.fn()
    ;(window as unknown as { __xss: () => void }).__xss = xss
    const get = mockGets()
    renderIt()
    expect(await screen.findByText('What is 2 + 2?')).toBeTruthy()
    expect(document.querySelector('img[onerror]')).toBeNull()
    expect(xss).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/topics\/9\/questions$/), { params: undefined, headers })
    expect(screen.getByLabelText('Base question — read-only')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit question 2' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Questions — Numbers' })).toBeTruthy()
  })

  it('MCQ form needs all options and a correct one, then posts the legacy body', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderIt()
    await screen.findByText('What is 2 + 2?')
    await userEvent.click(screen.getByRole('button', { name: 'Add Question' }))
    const d = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: /Question type/ }), 'mcq')
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    expect(await within(d).findByText('Write the question.')).toBeTruthy()
    expect(within(d).getByText('Enter option A.')).toBeTruthy()
    expect(within(d).getByText('Mark the correct option.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()

    await userEvent.type(within(d).getByRole('textbox', { name: /Question$/ }), 'Capital of India?')
    for (const [l, v] of [['A', 'Mumbai'], ['B', 'Delhi'], ['C', 'Pune'], ['D', 'Delhi']])
      await userEvent.type(within(d).getByPlaceholderText(`Option ${l}`), v)
    await userEvent.click(within(d).getByRole('radio', { name: 'Option B is correct' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    expect(await within(d).findByText('Same as option B.')).toBeTruthy()
    await userEvent.clear(within(d).getByPlaceholderText('Option D'))
    await userEvent.type(within(d).getByPlaceholderText('Option D'), 'Chennai')
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toMatch(/\/admin\/topics\/9\/questions$/)
    expect(post.mock.calls[0][1]).toMatchObject({
      grade: '7',
      difficulty: null,
      question_type: 'mcq',
      option_a: 'Mumbai',
      option_b: 'Delhi',
      option_c: 'Pune',
      option_d: 'Chennai',
      correct_answer: 'b',
      answer_key: null,
      needs_image: false,
      image_note: null,
    })
    // jsdom drops keystrokes in contenteditable, so only check the question isn't empty.
    expect((post.mock.calls[0][1] as { question_html: string }).question_html).toMatch(/^<p>.+<\/p>$/)
  })

  it('written types need an answer key; edit shows image upload', async () => {
    mockGets()
    renderIt()
    await userEvent.click(await screen.findByRole('button', { name: 'Edit question 2' }))
    const d = await screen.findByRole('dialog')
    expect(within(d).getByLabelText('Upload image')).toBeTruthy()
    await userEvent.clear(within(d).getByRole('textbox', { name: /Answer key/ }))
    await userEvent.click(within(d).getByRole('button', { name: 'Update' }))
    expect(await within(d).findByText('Add the answer key.')).toBeTruthy()
  })

  it('delete asks first', async () => {
    mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    renderIt()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete question 2' }))
    const c = await screen.findByRole('alertdialog')
    expect(within(c).getByText(/Define a prime number/)).toBeTruthy()
    await userEvent.click(within(c).getByRole('button', { name: 'Yes, delete' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/topics\/9\/questions\/2$/), { headers }))
  })
})
