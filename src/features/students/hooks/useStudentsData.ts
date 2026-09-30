import { useEffect, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { usePermission } from '@/permissions'
import { fetchClassOptions, fetchStudents, fetchSubjectOptions, fetchYearOptions, type Student } from '../services/studentsService'
import { sortByCreatedAtDesc } from '../lib/studentRows'

export type StatusFilter = 'active' | 'inactive' | 'all'

/** Lookups + the student list for the selected year/status (logic from the legacy page). */
export function useStudentsData() {
  const { role } = usePermission()
  const years = useAsync(() => fetchYearOptions().catch(() => []), [])
  const classes = useAsync(() => fetchClassOptions().catch((e) => (console.error('Error fetching classes:', e), [])), [])
  const subjects = useAsync(() => fetchSubjectOptions().catch((e) => (console.error('Error fetching subjects:', e), [])), [])

  // Default to the current academic year once years arrive (legacy did the same).
  const [yearId, setYearId] = useState<number | ''>('')
  const [yearsSeen, setYearsSeen] = useState<unknown>(undefined)
  if (years.data !== yearsSeen) {
    setYearsSeen(years.data)
    const cur = years.data?.find((y) => !!y.is_current)
    if (cur) setYearId(cur.id)
  }

  const [status, setStatus] = useState<StatusFilter>('active')
  const [nonce, setNonce] = useState(0)
  const ready = !!role && !years.loading
  const list = useAsync(
    () =>
      fetchStudents({ role: role!, yearId, status }).catch((e) => {
        console.error('Error fetching students:', e)
        throw e
      }),
    [role, yearId, status, nonce],
    { enabled: ready },
  )

  const [rows, setRows] = useState<Student[]>([])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror fetched rows for local edits
    if (list.data) setRows(sortByCreatedAtDesc(list.data))
  }, [list.data])

  return {
    role,
    years: years.data ?? [],
    classes: classes.data ?? [],
    subjects: subjects.data ?? [],
    yearId,
    setYearId,
    status,
    setStatus,
    rows,
    setRows: (update: (prev: Student[]) => Student[]) => setRows((prev) => sortByCreatedAtDesc(update(prev))),
    loading: !ready || list.loading,
    reload: () => setNonce((n) => n + 1),
  }
}
