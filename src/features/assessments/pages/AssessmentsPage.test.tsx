import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import AssessmentsPage from './AssessmentsPage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const json = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }
const asm = {
  id: 7,
  title: 'Unit Test 1',
  subject_id: 5,
  class_id: 1,
  total_marks: 50,
  scheduled_date: '2026-10-10',
  status: 'scheduled',
  is_admin_approved: false,
  paper_questions_count: 2,
  subject: { id: 5, subject: 'Maths' },
  class: { id: 1, name: 'Class 9' },
  teacher: { id: 2, name: 'Meera' },
}
const detail = { ...asm, assignments: [{ id: 1, student_id: 3, scheduled_date: '2026-10-10', status: 'upcoming', student: { id: 3, name: 'Asha' } }] }
const paper = {
  assessment_id: 7,
  title: 'Unit Test 1',
  source: 'manual',
  total_marks: 50,
  status: 'pending',
  questions: [{ id: 91, marks: 25, question_html: '<p>What is 2+2?</p>', difficulty: 'easy' }],
}

function signIn(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 4, permissions }))
}

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const ok = (data: unknown, extra = {}) => Promise.resolve({ data: { success: true, data, ...extra } })
    if (url.endsWith('/assessments')) return ok([asm])
    if (url.endsWith('/assessments/7')) return ok(detail)
    if (url.endsWith('/assessments/7/files')) return ok([{ id: 60, type: 'question_paper', path: 'p', original_name: 'paper.pdf', is_admin_approved: true }])
    if (url.endsWith('/assessments/7/question-paper')) return ok(paper)
    if (url.includes('/question-paper/available')) return ok([])
    if (url.endsWith('/subjects/4')) return Promise.resolve({ data: { status: true, data: [{ id: 5, subject: 'Maths' }] } })
    if (url.endsWith('/classes/4')) return ok([{ id: 1, name: 'Class 9' }])
    if (url.endsWith('/students') || url.endsWith('/teachers/students')) return ok([{ id: 3, name: 'Asha', student_profile: { class: 1 } }, { id: 4, name: 'Ravi', student_profile: { class: 2 } }])
    if (url.endsWith('/tenant/auto-assessment')) return ok({ enabled: false })
    return ok([])
  })
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <AssessmentsPage />
    </MemoryRouter>,
  )
const row = async () => (await screen.findByText('Unit Test 1')).closest('tr')!
/** Opens the test's own screen and returns it. */
const openTest = async () => {
  await userEvent.click(within(await row()).getByRole('button', { name: 'Open Unit Test 1' }))
  return screen.findByRole('dialog')
}
const clickStep = async (name: string) => userEvent.click(within(await openTest()).getByRole('button', { name }))

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('AssessmentsPage — gates (unchanged)', () => {
  it('coaching admin: approval, auto toggle and question paper', async () => {
    signIn('coaching_admin')
    mockGets()
    renderPage()
    const r = await row()
    expect(within(r).getByRole('button', { name: 'Approve' })).toBeTruthy()
    expect(screen.getByRole('switch')).toBeTruthy()
    const d = within(await openTest())
    expect(d.getByRole('button', { name: 'Open paper' })).toBeTruthy()
    expect(d.getByRole('button', { name: 'Approve test' })).toBeTruthy()
  })

  it('teacher: question paper but no approval or auto toggle; own students list', async () => {
    signIn('teacher')
    const get = mockGets()
    renderPage()
    const r = await row()
    expect(within(r).queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/teachers\/students$/), auth)
    const d = within(await openTest())
    expect(d.getByRole('button', { name: 'Open paper' })).toBeTruthy()
    expect(d.queryByRole('button', { name: 'Approve test' })).toBeNull()
  })

  it('staff with assessments.manage: no approval, no question paper (role-based, Q6)', async () => {
    signIn('staff', ['assessments.manage'])
    mockGets()
    renderPage()
    const r = await row()
    expect(within(r).queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(within(await openTest()).queryByRole('button', { name: /paper/ })).toBeNull()
  })
})

describe('AssessmentsPage — forms', () => {
  it('create: validates and posts the legacy body', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { ...asm, id: 8, title: 'Weekly quiz' } } })
    renderPage()
    await row()
    await userEvent.click(screen.getByRole('button', { name: 'Create Assessment' }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(within(d).getByRole('button', { name: 'Create' }))
    expect(await within(d).findByText('Title is required.')).toBeTruthy()
    expect(within(d).getByText('Select a subject.')).toBeTruthy()
    expect(within(d).getByText('Enter the total marks.')).toBeTruthy()
    await userEvent.type(within(d).getByRole('textbox', { name: /Title/ }), 'Weekly quiz')
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: /Subject/ }), 'Maths')
    await userEvent.click(within(d).getByRole('button', { name: '20' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.stringMatching(/\/assessments$/),
        { title: 'Weekly quiz', description: null, subject_id: 5, class_id: null, total_marks: 20, scheduled_date: null },
        json,
      ),
    )
  })

  it('assign: class filter; already assigned students are shown but never re-sent', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await clickStep('Add students')
    const d = await screen.findByRole('dialog')
    expect(await within(d).findByText(/^Assigned · /)).toBeTruthy()
    expect(within(d).queryByText('Ravi')).toBeNull() // other class
    await userEvent.click(within(d).getByRole('button', { name: 'Assign' }))
    expect(await within(d).findByText('Select at least one new student.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('assign: adding a student sends only that student, with the chosen date', async () => {
    signIn('coaching_admin')
    const get = mockGets()
    const base = get.getMockImplementation()!
    get.mockImplementation((url: string, ...rest: unknown[]) =>
      url.endsWith('/students')
        ? Promise.resolve({ data: { success: true, data: [{ id: 3, name: 'Asha', student_profile: { class: 1 } }, { id: 5, name: 'Priya', student_profile: { class: 1 } }] } })
        : (base as (u: string, ...r: unknown[]) => ReturnType<typeof axios.get>)(url, ...rest),
    )
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await clickStep('Add students')
    const d = await screen.findByRole('dialog')
    await within(d).findByText(/^Assigned · /)
    const asha = within(d).getAllByRole('checkbox').find((c) => c.closest('label')?.textContent?.includes('Asha'))!
    expect((asha as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(await within(d).findByText('Priya'))
    const date = within(d).getByLabelText(/Test date/)
    await userEvent.clear(date)
    await userEvent.type(date, '2030-01-15')
    await userEvent.click(within(d).getByRole('button', { name: 'Assign 1' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/assign$/), { assignments: [{ student_id: 5, scheduled_date: '2030-01-15' }] }, auth))
  })

  it('results: marks over the total are blocked; saving asks first', async () => {
    signIn('teacher')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await clickStep('Enter results')
    const d = await screen.findByRole('dialog')
    const marks = await within(d).findByRole('spinbutton', { name: 'Marks for Asha' })
    await userEvent.type(marks, '60')
    expect(within(d).getByText("Can't be more than 50.")).toBeTruthy()
    await userEvent.click(within(d).getByRole('button', { name: /^Save/ }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await userEvent.clear(marks)
    await userEvent.type(marks, '42')
    await userEvent.click(within(d).getByRole('button', { name: 'Save (1 result)' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText(/told their result is out/)).toBeTruthy()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Yes, save' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/results$/), { results: [{ student_id: 3, marks_obtained: 42, total_marks: 50, teacher_notes: undefined }] }, json),
    )
  })
})

describe('AssessmentsPage — waiting for admin', () => {
  it('tells a teacher students cannot see a test that is not approved yet', async () => {
    signIn('teacher')
    mockGets()
    renderPage()
    const r = within(await row())
    expect(r.getByText('Waiting for admin')).toBeTruthy()
    expect(r.getByText("Students can't see this test yet.")).toBeTruthy()
    expect(r.queryByRole('button', { name: 'Approve' })).toBeNull()
  })

  it('shows no waiting message once approved', async () => {
    signIn('teacher')
    vi.spyOn(axios, 'get').mockImplementation((url: string) => Promise.resolve({ data: { success: true, data: url.endsWith('/assessments') ? [{ ...asm, is_admin_approved: true }] : [] } }))
    renderPage()
    const r = within(await row())
    expect(r.getByText('Approved')).toBeTruthy()
    expect(r.queryByText("Students can't see this test yet.")).toBeNull()
  })
})

describe('AssessmentsPage — create with students, one screen per test', () => {
  it('create: picks students in the same form and needs a date for them', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { ...asm, id: 8, title: 'Weekly quiz' } } })
    renderPage()
    await row()
    await userEvent.click(screen.getByRole('button', { name: 'Create Assessment' }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByRole('textbox', { name: /Title/ }), 'Weekly quiz')
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: /Subject/ }), 'Maths')
    await userEvent.click(within(d).getByRole('button', { name: '20' }))
    await userEvent.click(await within(d).findByText('Asha'))
    await userEvent.click(within(d).getByRole('button', { name: 'Create' }))
    expect(await within(d).findByText('Pick the test date to assign students.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
    await userEvent.type(within(d).getByLabelText(/Test date/), '2030-01-15')
    await userEvent.click(within(d).getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.stringMatching(/\/assessments$/),
        { title: 'Weekly quiz', description: null, subject_id: 5, class_id: null, total_marks: 20, scheduled_date: '2030-01-15', student_ids: [3] },
        json,
      ),
    )
    // …and the new test's own screen opens, showing what's next.
    expect(await screen.findByRole('heading', { name: 'Weekly quiz' })).toBeTruthy()
  })

  it('create: a class limits the students offered, and an earlier tick is not sent', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { ...asm, id: 8 } } })
    renderPage()
    await row()
    await userEvent.click(screen.getByRole('button', { name: 'Create Assessment' }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByRole('textbox', { name: /Title/ }), 'Quiz')
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: /Subject/ }), 'Maths')
    await userEvent.click(within(d).getByRole('button', { name: '20' }))
    await userEvent.click(await within(d).findByText('Ravi'))
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: /Class/ }), 'Class 9')
    expect(within(d).queryByText('Ravi')).toBeNull()
    await userEvent.click(within(d).getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).not.toHaveProperty('student_ids')
  })

  it('the row keeps one Open button, and the screen comes back after an action closes', async () => {
    signIn('teacher')
    mockGets()
    renderPage()
    const r = within(await row())
    expect(r.queryByRole('button', { name: /Assign students to/ })).toBeNull()
    expect(r.queryByRole('button', { name: /Files for/ })).toBeNull()
    await clickStep('Files')
    const files = await screen.findByRole('dialog')
    expect(within(files).queryByRole('button', { name: 'Edit details' })).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByRole('button', { name: 'Edit details' })).toBeTruthy()
  })
})

describe('AssessmentsPage — the simpler results screen', () => {
  it('shows name, marks and Absent; the rest stays closed until asked for', async () => {
    signIn('teacher')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await clickStep('Enter results')
    const d = await screen.findByRole('dialog')
    const marks = await within(d).findByRole('spinbutton', { name: 'Marks for Asha' })
    expect(within(d).getByText('/ 50')).toBeTruthy()
    expect(within(d).queryByRole('spinbutton', { name: 'Total marks for Asha' })).toBeNull()
    expect(within(d).queryByRole('textbox', { name: 'Notes for Asha' })).toBeNull()
    expect(within(d).queryByRole('checkbox', { name: 'Select Asha' })).toBeNull()
    expect(within(d).queryByRole('button', { name: 'Cancel students' })).toBeNull()

    await userEvent.type(marks, '42')
    await userEvent.click(within(d).getByRole('button', { name: 'Note or answer sheet for Asha' }))
    await userEvent.type(within(d).getByRole('textbox', { name: 'Notes for Asha' }), 'Well done')
    expect(within(d).getByText('Note or answer sheet added')).toBeTruthy()
    await userEvent.click(within(d).getByRole('button', { name: 'Save (1 result)' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, save' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/results$/), { results: [{ student_id: 3, marks_obtained: 42, total_marks: 50, teacher_notes: 'Well done' }] }, json),
    )
  })

  it('Reopen only appears for absent or cancelled students', async () => {
    signIn('teacher')
    const get = mockGets()
    const base = get.getMockImplementation()!
    get.mockImplementation((url: string, ...rest: unknown[]) =>
      url.endsWith('/assessments/7')
        ? Promise.resolve({
            data: {
              success: true,
              data: {
                ...detail,
                assignments: [
                  { id: 1, student_id: 3, scheduled_date: '2026-10-10', status: 'upcoming', stage: 'awaiting_results', student: { id: 3, name: 'Asha' } },
                  { id: 2, student_id: 4, scheduled_date: '2026-10-10', status: 'missed', stage: 'absent', student: { id: 4, name: 'Ravi' } },
                ],
              },
            },
          })
        : (base as (u: string, ...r: unknown[]) => ReturnType<typeof axios.get>)(url, ...rest),
    )
    renderPage()
    await clickStep('Enter results')
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('button', { name: 'Reschedule or cancel students' }))
    await userEvent.click(within(d).getByRole('checkbox', { name: 'Select Asha' }))
    expect(within(d).queryByRole('button', { name: 'Reopen' })).toBeNull()
    await userEvent.click(within(d).getByRole('checkbox', { name: 'Select Ravi' }))
    expect(within(d).getByRole('button', { name: 'Reopen' })).toBeTruthy()
  })
})

describe('AssessmentsPage — one approval', () => {
  it('a paper is marked ready, not approved, and a file has no approval of its own', async () => {
    signIn('coaching_admin')
    mockGets()
    renderPage()
    await clickStep('Open paper')
    const p = await screen.findByRole('dialog')
    expect(await within(p).findByRole('button', { name: 'Mark paper ready' })).toBeTruthy()
    expect(within(p).getByText('Draft')).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Files' }))
    const f = await screen.findByRole('dialog')
    await within(f).findByText('paper.pdf')
    expect(within(f).getByRole('button', { name: 'Hide' })).toBeTruthy()
    expect(within(f).queryByText('Approved')).toBeNull()
    expect(within(f).queryByRole('button', { name: 'Approve' })).toBeNull()
  })
})

describe('AssessmentsPage — link from the dashboard', () => {
  it('?approval=pending opens on the tests waiting for approval', async () => {
    signIn('coaching_admin')
    vi.spyOn(axios, 'get').mockImplementation((url: string) =>
      Promise.resolve({
        data: {
          success: true,
          data: url.endsWith('/assessments')
            ? [
                { ...asm, progress: { total: 1, upcoming: 0, today: 0, awaiting_results: 1, result_out: 0, absent: 0, cancelled: 0, next_date: null, oldest_pending_date: '2026-10-01', stage: 'needs_results' } },
                { ...asm, id: 8, title: 'Already approved', is_admin_approved: true },
              ]
            : [],
        },
      }),
    )
    render(
      <MemoryRouter initialEntries={['/assessments?approval=pending']}>
        <AssessmentsPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Unit Test 1')).toBeTruthy()
    expect(screen.queryByText('Already approved')).toBeNull()
    expect((screen.getByLabelText('Approval') as HTMLSelectElement).value).toBe('pending')
  })
})

describe('AssessmentsPage — edit and delete', () => {
  const withProgress = (over: Record<string, number>) => ({ ...asm, progress: { total: 0, upcoming: 0, today: 0, awaiting_results: 0, result_out: 0, absent: 0, cancelled: 0, next_date: null, oldest_pending_date: null, stage: 'upcoming', ...over } })
  const mockList = (item: unknown) => {
    const base = mockGets()
    const original = base.getMockImplementation()!
    base.mockImplementation(((url: string, ...rest: never[]) => (url.endsWith('/assessments') ? Promise.resolve({ data: { success: true, data: [item] } }) : (original as (...a: unknown[]) => unknown)(url, ...rest))) as never)
  }

  it('edits with the saved values filled in and locks what is under way', async () => {
    signIn('teacher')
    mockList(withProgress({ total: 2, upcoming: 2 }))
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true, data: { ...asm, title: 'Renamed' } } })
    renderPage()
    await clickStep('Edit details')
    const d = await screen.findByRole('dialog')
    const title = within(d).getByLabelText(/Title/) as HTMLInputElement
    expect(title.value).toBe('Unit Test 1')
    expect((within(d).getByLabelText(/Test date/) as HTMLInputElement).disabled).toBe(true)
    expect((within(d).getByLabelText(/Subject/) as HTMLSelectElement).disabled).toBe(true) // has a paper
    expect((within(d).getByLabelText(/Total marks/) as HTMLInputElement).disabled).toBe(false)
    await userEvent.clear(title)
    await userEvent.type(title, 'Renamed')
    await userEvent.click(within(d).getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        expect.stringMatching(/\/assessments\/7$/),
        { title: 'Renamed', description: null, subject_id: 5, class_id: 1, total_marks: 50, scheduled_date: '2026-10-10' },
        json,
      ),
    )
  })

  it('locks total marks once results are saved', async () => {
    signIn('teacher')
    mockList(withProgress({ total: 1, result_out: 1 }))
    renderPage()
    await clickStep('Edit details')
    const d = await screen.findByRole('dialog')
    expect((within(d).getByLabelText(/Total marks/) as HTMLInputElement).disabled).toBe(true)
  })

  it('delete asks first', async () => {
    signIn('coaching_admin')
    mockList(withProgress({ total: 1, upcoming: 1 }))
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    renderPage()
    await clickStep('Delete')
    const c = await screen.findByRole('alertdialog')
    expect(del).not.toHaveBeenCalled()
    await userEvent.click(within(c).getByRole('button', { name: 'Yes, delete' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7$/), json))
  })

  it('a test with saved results explains why it cannot be deleted', async () => {
    signIn('coaching_admin')
    mockList(withProgress({ total: 1, result_out: 1 }))
    const del = vi.spyOn(axios, 'delete')
    renderPage()
    await clickStep('Delete')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(del).not.toHaveBeenCalled()
  })

  it('staff without assessments.manage get neither action', async () => {
    signIn('staff', ['assessments.view'])
    mockGets()
    renderPage()
    const d = within(await openTest())
    expect(d.queryByRole('button', { name: 'Edit details' })).toBeNull()
    expect(d.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(d.queryByRole('button', { name: 'Add students' })).toBeNull()
  })
})

describe('AssessmentsPage — confirmations', () => {
  it('approving an assessment asks first', async () => {
    signIn('coaching_admin')
    mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { success: true, data: { ...asm, is_admin_approved: true } } })
    renderPage()
    await userEvent.click(within(await row()).getByRole('button', { name: 'Approve' }))
    const c = await screen.findByRole('alertdialog')
    expect(patch).not.toHaveBeenCalled()
    await userEvent.click(within(c).getByRole('button', { name: 'Yes, approve' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/approval$/), { approved: true }, json))
  })

  it('auto-generate toggle asks first', async () => {
    signIn('coaching_admin')
    mockGets()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true, data: { enabled: true } } })
    renderPage()
    await row()
    await userEvent.click(screen.getByRole('switch'))
    const c = await screen.findByRole('alertdialog')
    await userEvent.click(within(c).getByRole('button', { name: 'No' }))
    expect(put).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, turn on' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith(expect.stringMatching(/\/tenant\/auto-assessment$/), { enabled: true }, json))
  })

  it('removing a file asks first (admin only)', async () => {
    signIn('coaching_admin')
    mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    renderPage()
    await clickStep('Files')
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('button', { name: 'Remove paper.pdf' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, remove' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/files\/60$/), auth))
  })

  it('removing a question from the paper asks first', async () => {
    signIn('teacher')
    mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    renderPage()
    await clickStep('Open paper')
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('button', { name: 'Remove question 1' }))
    const c = await screen.findByRole('alertdialog')
    expect(within(c).getByText(/stays in the question bank/)).toBeTruthy()
    await userEvent.click(within(c).getByRole('button', { name: 'Yes, remove' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/question-paper\/questions\/91$/), json))
  })
})

describe('AssessmentsPage — tracking', () => {
  const progress = (stage: string, extra = {}) => ({ total: 2, upcoming: 0, today: 0, awaiting_results: 0, result_out: 0, absent: 0, cancelled: 0, next_date: null, oldest_pending_date: null, stage, ...extra })
  const list = [
    { ...asm, progress: progress('needs_results', { awaiting_results: 2, oldest_pending_date: '2026-10-14' }) },
    { ...asm, id: 8, title: 'Weekly Quiz', progress: progress('upcoming', { upcoming: 2, next_date: '2026-10-30' }) },
    { ...asm, id: 9, title: 'Old Test', progress: progress('done', { result_out: 2 }) },
  ]
  const trackDetail = {
    ...detail,
    assignments: [
      { id: 1, student_id: 3, scheduled_date: '2026-10-14', status: 'upcoming', stage: 'awaiting_results', student: { id: 3, name: 'Asha' } },
      { id: 2, student_id: 4, scheduled_date: '2026-10-14', status: 'upcoming', stage: 'awaiting_results', student: { id: 4, name: 'Ravi' } },
    ],
  }
  function mockTracking() {
    return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
      const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })
      if (url.endsWith('/assessments')) return ok(list)
      if (url.endsWith('/assessments/7')) return ok(trackDetail)
      if (url.endsWith('/subjects/4')) return Promise.resolve({ data: { status: true, data: [{ id: 5, subject: 'Maths' }] } })
      if (url.endsWith('/classes/4')) return ok([{ id: 1, name: 'Class 9' }])
      if (url.endsWith('/tenant/auto-assessment')) return ok({ enabled: false })
      return ok([])
    })
  }

  it('opens on "Needs results" with counts; other tabs filter the list', async () => {
    signIn('teacher')
    mockTracking()
    renderPage()
    const tab = await screen.findByRole('tab', { name: 'Needs results (1)' })
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(await screen.findByText('Unit Test 1')).toBeTruthy()
    expect(screen.queryByText('Weekly Quiz')).toBeNull()
    expect(screen.getByText('Pending since 14/10/2026')).toBeTruthy()
    await userEvent.click(screen.getByRole('tab', { name: 'Upcoming (1)' }))
    expect(await screen.findByText('Weekly Quiz')).toBeTruthy()
    expect(screen.queryByText('Unit Test 1')).toBeNull()
    await userEvent.click(screen.getByRole('tab', { name: 'All (3)' }))
    expect(await screen.findByText('Old Test')).toBeTruthy()
  })

  it('Enter results: marks for one, Absent for the other, sent together', async () => {
    signIn('teacher')
    mockTracking()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Enter results/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(await within(d).findByRole('spinbutton', { name: 'Marks for Asha' }), '40')
    await userEvent.click(within(d).getByRole('switch', { name: 'Ravi was absent' }))
    expect((within(d).getByRole('spinbutton', { name: 'Marks for Ravi' }) as HTMLInputElement).disabled).toBe(true)
    await userEvent.click(within(d).getByRole('button', { name: 'Save (1 result · 1 absent)' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, save' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ results: [{ student_id: 3, marks_obtained: 40, total_marks: 50, teacher_notes: undefined }, { student_id: 4, absent: true }] })
  })

  it('bulk: reschedule the selected students', async () => {
    signIn('teacher')
    mockTracking()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, message: 'Rescheduled 1 student.', data: { progress: progress('upcoming') } } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Enter results/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('button', { name: 'Reschedule or cancel students' }))
    await userEvent.click(within(d).getByRole('checkbox', { name: 'Select Ravi' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Reschedule' }))
    const confirm = await screen.findByRole('alertdialog')
    const date = within(confirm).getByLabelText('New date')
    await userEvent.clear(date)
    await userEvent.type(date, '2030-01-15')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Yes, reschedule' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toMatch(/\/assessments\/7\/assignments\/bulk$/)
    expect(post.mock.calls[0][1]).toEqual({ student_ids: [4], action: 'reschedule', scheduled_date: '2030-01-15' })
  })

  it('saved marks do not lock the bulk actions, and are not sent again', async () => {
    signIn('teacher')
    const get = mockTracking()
    const base = get.getMockImplementation()!
    const saved = {
      ...trackDetail,
      assignments: [
        { id: 1, student_id: 3, scheduled_date: '2026-10-14', status: 'completed', stage: 'result_out', student: { id: 3, name: 'Asha' }, result: { marks_obtained: 40, total_marks: 50, percentage: 80, teacher_notes: null } },
        trackDetail.assignments[1],
      ],
    }
    get.mockImplementation((url: string, ...rest: unknown[]) =>
      url.endsWith('/assessments/7') ? Promise.resolve({ data: { success: true, data: saved } }) : (base as (u: string, ...r: unknown[]) => ReturnType<typeof axios.get>)(url, ...rest),
    )
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Enter results/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('button', { name: 'Reschedule or cancel students' }))
    await userEvent.click(within(d).getByRole('checkbox', { name: 'Select Ravi' }))
    expect((within(d).getByRole('button', { name: 'Reschedule' }) as HTMLButtonElement).disabled).toBe(false)
    expect(within(d).getByRole('button', { name: 'Save results' })).toBeTruthy()

    // Typing marks locks them until saved; only the new row goes out.
    await userEvent.type(within(d).getByRole('spinbutton', { name: 'Marks for Ravi' }), '30')
    expect((within(d).getByRole('button', { name: 'Reschedule' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(within(d).getByRole('button', { name: 'Save (1 result)' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, save' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ results: [{ student_id: 4, marks_obtained: 30, total_marks: 50, teacher_notes: undefined }] })
  })

  it('the Date column shows when students actually sit it', async () => {
    signIn('teacher')
    const get = mockTracking()
    const base = get.getMockImplementation()!
    get.mockImplementation((url: string, ...rest: unknown[]) =>
      url.endsWith('/assessments')
        ? Promise.resolve({ data: { success: true, data: [{ ...asm, id: 12, title: 'No own date', scheduled_date: null, progress: progress('upcoming', { upcoming: 1, next_date: '2030-03-05' }) }] } })
        : (base as (u: string, ...r: unknown[]) => ReturnType<typeof axios.get>)(url, ...rest),
    )
    renderPage()
    await screen.findByText('No own date')
    expect(screen.getByText('05/03/2030')).toBeTruthy()
    expect(screen.queryByText('Not set')).toBeNull()
  })

  it('a notification link (?assessment=7&results=1) opens the results straight away', async () => {
    signIn('teacher')
    mockTracking()
    Element.prototype.scrollIntoView = vi.fn() // jsdom has no scrolling; the page scrolls to the focused row
    render(
      <MemoryRouter initialEntries={['/assessments?assessment=7&results=1']}>
        <AssessmentsPage />
      </MemoryRouter>,
    )
    const d = await screen.findByRole('dialog')
    expect(within(d).getByText('Results — Unit Test 1')).toBeTruthy()
    expect(await within(d).findByRole('spinbutton', { name: 'Marks for Asha' })).toBeTruthy()
  })
})

describe('AssessmentsPage — calendar', () => {
  it('shows each test day; picking a day lists its tests and opens that test', async () => {
    const today = new Date()
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const todayIso = iso(today)
    signIn('teacher')
    vi.spyOn(axios, 'get').mockImplementation((url: string) => {
      const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })
      if (url.endsWith('/assessments'))
        return ok([
          { ...asm, progress: { total: 2, upcoming: 0, today: 2, awaiting_results: 0, result_out: 0, absent: 0, cancelled: 0, next_date: todayIso, oldest_pending_date: null, stage: 'today', dates: [{ date: todayIso, total: 2, open: 2 }] } },
        ])
      if (url.endsWith('/assessments/7')) return ok({ ...detail, assignments: [] })
      if (url.endsWith('/subjects/4')) return Promise.resolve({ data: { status: true, data: [] } })
      return ok([])
    })
    render(
      <MemoryRouter>
        <AssessmentsPage />
      </MemoryRouter>,
    )
    await screen.findByText('Unit Test 1')
    await userEvent.click(screen.getByRole('tab', { name: 'Calendar' }))
    const grid = screen.getByRole('grid')
    const cell = within(grid).getByRole('gridcell', { name: new RegExp(`1 test$`) })
    expect(cell.getAttribute('aria-selected')).toBe('true') // today is selected by default
    const entry = await screen.findByRole('button', { name: /Unit Test 1.*0\/2 done/ })
    await userEvent.click(entry)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Enter results' }))
    expect(await screen.findByText('Results — Unit Test 1')).toBeTruthy()
  })
})

