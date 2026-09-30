import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AUTH_CHANGED_EVENT } from '@/lib/auth'
import PermissionGate from './PermissionGate'
import RequirePermission from './RequirePermission'

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 1, permissions }))
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderGuarded(anyOf: string[], orRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/fees']}>
      <Routes>
        <Route path="/dashboard" element={<p>dashboard</p>} />
        <Route
          path="/fees"
          element={
            <RequirePermission anyOf={anyOf} orRoles={orRoles}>
              <p>secret</p>
            </RequirePermission>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequirePermission (same rule as before)', () => {
  it('redirects without the permission', () => {
    login('staff')
    renderGuarded(['fees.view', 'fees.manage'])
    expect(screen.queryByText('secret')).toBeNull()
    expect(screen.getByText('dashboard')).toBeTruthy()
  })
  it('allows with any listed permission', () => {
    login('staff', ['fees.manage'])
    renderGuarded(['fees.view', 'fees.manage'])
    expect(screen.getByText('secret')).toBeTruthy()
  })
  it('allows admins and super admins', () => {
    for (const role of ['coaching_admin', 'super_admin']) {
      login(role)
      renderGuarded(['fees.view'])
      expect(screen.getByText('secret')).toBeTruthy()
      cleanup()
    }
  })
  it('allows orRoles', () => {
    login('teacher')
    renderGuarded(['students.view'], ['teacher'])
    expect(screen.getByText('secret')).toBeTruthy()
  })
  it('redirects signed-out users', () => {
    renderGuarded(['fees.view'])
    expect(screen.getByText('dashboard')).toBeTruthy()
  })
  it('re-evaluates when /auth/me revokes a permission', () => {
    login('staff', ['fees.view'])
    renderGuarded(['fees.view'])
    expect(screen.getByText('secret')).toBeTruthy()
    act(() => {
      login('staff', [])
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    })
    expect(screen.queryByText('secret')).toBeNull()
    expect(screen.getByText('dashboard')).toBeTruthy()
  })
})

describe('PermissionGate', () => {
  it('never renders restricted children, not even for one frame', () => {
    login('staff')
    const { container } = render(
      <PermissionGate anyOf={['staff.manage']} fallback={<span>no</span>}>
        <button>delete</button>
      </PermissionGate>,
    )
    expect(container.innerHTML).toBe('<span>no</span>')
  })
  it('role-only gate does not get the admin bypass', () => {
    login('super_admin')
    render(
      <PermissionGate orRoles={['coaching_admin']}>
        <span>admin-only</span>
      </PermissionGate>,
    )
    expect(screen.queryByText('admin-only')).toBeNull()
  })
})
