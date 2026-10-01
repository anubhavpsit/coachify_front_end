import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import ChapterDetailPage from './ChapterDetailPage'

const headers = { Authorization: 'Bearer tok', Accept: 'application/json' }
const own = {
  id: 3,
  tenant_id: 4,
  subject_id: 5,
  name: 'Mental Maths',
  subject: { id: 5, subject: 'Maths' },
  topics: [
    { id: 20, tenant_id: 4, subject_id: 5, chapter_id: 3, grade: 7, name: 'Quick sums', explanation_html: null },
    { id: 21, tenant_id: 9, subject_id: 5, chapter_id: 3, grade: null, name: 'Other coaching topic', explanation_html: null },
  ],
}
const base = { ...own, id: 1, tenant_id: 0, name: 'Algebra', topics: [{ id: 22, tenant_id: 0, subject_id: 5, chapter_id: 1, grade: null, name: 'Linear equations', explanation_html: null }] }
const subjectTopics = [
  { id: 20, tenant_id: 4, subject_id: 5, chapter_id: 3, grade: 7, name: 'Quick sums', explanation_html: null },
  { id: 30, tenant_id: 4, subject_id: 5, chapter_id: null, grade: null, name: 'Percentages', explanation_html: null },
  { id: 31, tenant_id: 4, subject_id: 5, chapter_id: 8, grade: null, name: 'Ratios', explanation_html: null, chapter: { id: 8, name: 'Arithmetic' } },
  { id: 32, tenant_id: 0, subject_id: 5, chapter_id: null, grade: null, name: 'Base topic', explanation_html: null },
]

function mockGets(chapter = own) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const data = (d: unknown) => Promise.resolve({ data: { success: true, data: d } })
    if (url.endsWith('/subjects/4')) return data([{ id: 5, subject: 'Maths' }])
    if (/\/admin\/chapters\/\d+$/.test(url)) return data(chapter)
    if (url.endsWith('/admin/chapters')) return data([{ id: 3, tenant_id: 4, subject_id: 5, name: 'Mental Maths' }])
    if (url.endsWith('/admin/topics')) return data(subjectTopics)
    return data([])
  })
}

const renderAt = (id: number) =>
  render(
    <MemoryRouter initialEntries={[`/chapters/${id}`]}>
      <Routes>
        <Route path="/chapters/:chapterId" element={<ChapterDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role: 'coaching_admin', tenant_id: 4, permissions: [] }))
})

describe('ChapterDetailPage', () => {
  it("loads the chapter and hides another coaching's topics", async () => {
    const get = mockGets()
    renderAt(3)
    expect(await screen.findByRole('heading', { name: 'Mental Maths' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/chapters\/3$/), { headers })
    expect(screen.getByText('Quick sums')).toBeTruthy()
    expect(screen.queryByText('Other coaching topic')).toBeNull()
  })

  it('offers only own topics not already here, flags moves, and posts topic_ids', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderAt(3)
    const panel = (await screen.findByText('Add existing topics')).closest('[data-slot=card]') as HTMLElement
    await within(panel).findByText('Percentages')
    expect(within(panel).queryByText('Quick sums')).toBeNull() // already in this chapter
    expect(within(panel).queryByText('Base topic')).toBeNull() // base topics can't be attached
    expect(within(panel).getByText(/in Arithmetic/)).toBeTruthy()
    await userEvent.click(within(panel).getByRole('checkbox', { name: /Select all/ }))
    expect(within(panel).getByText('1 selected topic is in another chapter and will move here.')).toBeTruthy()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add 2 topics' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/chapters\/3\/topics$/), { topic_ids: [30, 31] }, { headers }))
  })

  it('removes a topic after confirming', async () => {
    mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    renderAt(3)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Quick sums from this chapter' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/chapters\/3\/topics\/20$/), { headers }))
  })

  it('creates a new topic straight into this chapter', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderAt(3)
    await userEvent.click((await screen.findAllByRole('button', { name: 'New topic' }))[0])
    const dialog = await screen.findByRole('dialog')
    expect((within(dialog).getByRole('combobox', { name: /Subject/ }) as HTMLSelectElement).disabled).toBe(true)
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Topic name/ }), 'Squares')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/topics$/), { subject_id: '5', chapter_id: '3', grade: null, name: 'Squares', explanation_html: '' }, { headers }),
    )
  })

  it('base chapter is read-only', async () => {
    mockGets(base)
    renderAt(1)
    expect(await screen.findByText(/This is a base chapter/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Edit chapter/ })).toBeNull()
    expect(screen.queryByText('Add existing topics')).toBeNull()
    expect(screen.queryByRole('button', { name: /Remove Linear equations/ })).toBeNull()
  })
})
