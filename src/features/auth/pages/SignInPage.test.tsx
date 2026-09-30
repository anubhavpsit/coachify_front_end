import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios, { AxiosError, AxiosHeaders } from 'axios'
import SignInPage from './SignInPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function httpError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('x', 'ERR', config, {}, { status, data, statusText: '', headers: {}, config })
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('tenant_id', '7')
})

describe('SignInPage', () => {
  it('validates on submit without calling the API', async () => {
    const post = vi.spyOn(axios, 'post')
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('Email is required.')).toBeTruthy()
    expect(screen.getByText('Password is required.')).toBeTruthy()
    expect(screen.getByLabelText(/Email/)).toHaveProperty('ariaInvalid', 'true')
    expect(post).not.toHaveBeenCalled()
  })

  it('keeps the 8-character minimum', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/Email/), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/^Password/), '1234567')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeTruthy()
  })

  it('sends the same payload and stores the same keys', async () => {
    const user = { id: 3, name: 'T', email: 'a@b.co', role: 'teacher', tenant_id: 7, created_at: '', updated_at: '' }
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { user, token: 'tok' } })
    renderPage()
    await userEvent.type(screen.getByLabelText(/Email/), '  a@b.co  ')
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('dashboard')).toBeTruthy()
    expect(post).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      { email: 'a@b.co', password: 'secret123', tenant_id: 7 },
      { headers: { 'Content-Type': 'application/json' } },
    )
    expect(localStorage.getItem('authToken')).toBe('tok')
    expect(JSON.parse(localStorage.getItem('authUser')!)).toEqual(user)
    expect(localStorage.getItem('tenant_id')).toBe('7')
  })

  it('maps a 422 onto the field and shows 401 as a form error', async () => {
    const post = vi.spyOn(axios, 'post').mockRejectedValueOnce(httpError(422, { errors: { email: ['These credentials do not match our records.'] } }))
    renderPage()
    await userEvent.type(screen.getByLabelText(/Email/), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('These credentials do not match our records.')).toBeTruthy()

    post.mockRejectedValueOnce(httpError(401, {}))
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Invalid email or password.'))
  })

  it('reports a missing tenant exactly as before', async () => {
    localStorage.removeItem('tenant_id')
    const post = vi.spyOn(axios, 'post')
    renderPage()
    await userEvent.type(screen.getByLabelText(/Email/), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('Tenant information is missing.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('redirects when already signed in', async () => {
    localStorage.setItem('authToken', 'x')
    renderPage()
    expect(await screen.findByText('dashboard')).toBeTruthy()
  })
})
