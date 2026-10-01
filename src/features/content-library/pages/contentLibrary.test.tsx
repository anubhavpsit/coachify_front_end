import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios, { AxiosError, AxiosHeaders } from 'axios'
import ChaptersPage from './ChaptersPage'
import TopicsPage from './TopicsPage'

const headers = { Authorization: 'Bearer tok', Accept: 'application/json' }
const subjects = [
  { id: 5, subject: 'Maths' },
  { id: 6, subject: 'Science' },
]
const chapters = [
  { id: 1, tenant_id: 0, subject_id: 5, name: 'Algebra', topics_count: 3 },
  { id: 2, tenant_id: 4, subject_id: 5, name: 'Mental Maths', topics_count: 1 },
]
const topics = [
  { id: 10, tenant_id: 0, subject_id: 5, chapter_id: 1, grade: null, name: 'Linear equations', explanation_html: '<p>Solve for <b>x</b></p>', chapter: { id: 1, name: 'Algebra' } },
  { id: 11, tenant_id: 4, subject_id: 5, chapter_id: 2, grade: 7, name: 'Quick sums', explanation_html: null, chapter: { id: 2, name: 'Mental Maths' } },
]

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const data = (d: unknown) => Promise.resolve({ data: { success: true, data: d } })
    if (url.endsWith('/subjects/4')) return data(subjects)
    if (url.endsWith('/admin/chapters')) return data(chapters)
    if (url.endsWith('/admin/topics')) return data(topics)
    return data([])
  })
}

const taken = () =>
  new AxiosError('422', 'ERR', undefined, undefined, {
    status: 422,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message: 'The name has already been taken.', errors: { name: ['The name has already been taken.'] } },
  })

const renderIt = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role: 'coaching_admin', tenant_id: 4, permissions: [] }))
})

describe('ChaptersPage', () => {
  it('lists chapters; base ones are read-only', async () => {
    const get = mockGets()
    renderIt(<ChaptersPage />)
    const base = (await screen.findByRole('link', { name: 'Algebra' })).closest('tr')!
    expect(within(base).getByLabelText('Base chapter — read-only')).toBeTruthy()
    const own = screen.getByRole('link', { name: 'Mental Maths' }).closest('tr')!
    expect(within(own).getByRole('button', { name: 'Edit Mental Maths' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/chapters$/), { params: undefined, headers })
  })

  it('validates, posts the legacy body, and explains a duplicate name', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post').mockRejectedValueOnce(taken()).mockResolvedValueOnce({ data: { success: true, data: { id: 9 } } })
    renderIt(<ChaptersPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add Chapter' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('Select a subject.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: /Subject/ }), 'Maths')
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Chapter name/ }), 'Mental Maths')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('Your coaching already has a chapter with this name in this subject.')).toBeTruthy()
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/chapters$/), { subject_id: '5', name: 'Mental Maths' }, { headers })
    await userEvent.clear(within(dialog).getByRole('textbox', { name: /Chapter name/ }))
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Chapter name/ }), 'Geometry')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('TopicsPage', () => {
  it('shows an explanation preview and read-only base topics', async () => {
    mockGets()
    renderIt(<TopicsPage />)
    expect(await screen.findByText('Solve for x')).toBeTruthy()
    const base = screen.getByText('Linear equations').closest('tr')!
    expect(within(base).getByLabelText('Base topic — read-only')).toBeTruthy()
    expect(within(screen.getByText('Quick sums').closest('tr')!).getByRole('button', { name: 'Delete Quick sums' })).toBeTruthy()
  })

  it('starts a new topic from the filters and posts the legacy body', async () => {
    const get = mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderIt(<TopicsPage />)
    await screen.findByText('Quick sums')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Subject' }), 'Maths')
    await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/topics$/), { params: { subject_id: '5' }, headers }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grade' }), 'Grade 7')
    await userEvent.click(screen.getByRole('button', { name: 'Add Topic' }))
    const dialog = await screen.findByRole('dialog')
    expect((within(dialog).getByRole('combobox', { name: /Subject/ }) as HTMLSelectElement).value).toBe('5')
    expect((within(dialog).getByRole('combobox', { name: /Grade/ }) as HTMLSelectElement).value).toBe('7')
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Topic name/ }), 'Percentages')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/topics$/), { subject_id: '5', chapter_id: null, grade: '7', name: 'Percentages', explanation_html: '' }, { headers }),
    )
  })

  it('changing the subject clears the chapter', async () => {
    mockGets()
    renderIt(<TopicsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Quick sums' }))
    const dialog = await screen.findByRole('dialog')
    const chapter = within(dialog).getByRole('combobox', { name: /Chapter/ }) as HTMLSelectElement
    await waitFor(() => expect(chapter.value).toBe('2'))
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: /Subject/ }), 'Science')
    expect(chapter.value).toBe('')
  })
})
