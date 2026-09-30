import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import SearchResultsPage from './SearchResultsPage'

const data = {
  students: [{ id: 1, name: 'Asha Rao', email: 'asha@x', tenant_id: 4, student_profile: { class: '10', phone: '98' } }],
  teachers: [],
  subjects: [{ id: 2, subject: 'Physics' }],
  classes: [{ id: 3, name: 'Class 10-A' }],
  enquiries: [{ id: 4, name: 'Ashok', contact_number: null, email: null, enquiry_type: 'student', status: 'active' }],
}

function signIn(role: string) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 4, permissions: [] }))
}
const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <SearchResultsPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('SearchResultsPage', () => {
  it('sends the legacy request and shows admin-only sections to coaching_admin', async () => {
    signIn('coaching_admin')
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data } })
    renderAt('/search?q=%20ash%20')
    expect(await screen.findByRole('region', { name: 'Students' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/search$/), { headers: { Authorization: 'Bearer tok', Accept: 'application/json' }, params: { q: 'ash' } })
    for (const s of ['Subjects', 'Classes', 'Enquiries']) expect(screen.getByRole('region', { name: s })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Go to Enquiries/ }).getAttribute('href')).toBe('/enquiries')
  })

  it('hides subjects, classes and enquiries from other roles', async () => {
    signIn('teacher')
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data } })
    renderAt('/search?q=ash')
    expect(await screen.findByRole('region', { name: 'Students' })).toBeTruthy()
    for (const s of ['Subjects', 'Classes', 'Enquiries']) expect(screen.queryByRole('region', { name: s })).toBeNull()
    expect(screen.queryByText('Physics')).toBeNull()
  })

  it('says "No results found." when only hidden sections matched', async () => {
    signIn('teacher')
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { ...data, students: [] } } })
    renderAt('/search?q=phy')
    expect(await screen.findByText('No results found.')).toBeTruthy()
  })

  it('makes no request without a query', () => {
    signIn('teacher')
    const get = vi.spyOn(axios, 'get')
    renderAt('/search')
    expect(screen.getByText(/Type a keyword in the search box above/)).toBeTruthy()
    expect(get).not.toHaveBeenCalled()
  })

  it('shows the legacy error message', async () => {
    signIn('teacher')
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/search?q=x')
    expect(await screen.findByText('Unable to load search results.')).toBeTruthy()
  })
})
