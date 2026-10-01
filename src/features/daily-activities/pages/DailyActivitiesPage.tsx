import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { History, UserRound, Users } from 'lucide-react'
import AttachmentPreviewModal from '@/components/common/AttachmentPreviewModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import PageHeader from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { usePermission } from '@/permissions'
import ClassTab from '../components/ClassTab'
import DateBar from '../components/DateBar'
import HistoryTab from '../components/HistoryTab'
import StudentEntriesTab from '../components/StudentEntriesTab'
import { todayISO } from '../schemas/activityForm'
import { attachmentUrl, fetchClassesAndSubjects, fetchMyStudents, type ActivityAttachment } from '../services/dailyActivitiesService'

type Mode = 'student' | 'batch' | 'history'
const isMode = (v: string | null): v is Mode => v === 'student' || v === 'batch' || v === 'history'

/**
 * No route guard (Q9) — the backend allows teachers (own students) and
 * coaching admins. In-page gate kept: only coaching_admin may delete an
 * uploaded attachment.
 */
export default function DailyActivitiesPage() {
  const [params] = useSearchParams()
  const { hasRole } = usePermission()
  const canDeleteAttachments = hasRole(ROLES.COACHING_ADMIN)

  const [mode, setMode] = useState<Mode>(() => (isMode(params.get('mode')) ? (params.get('mode') as Mode) : 'student'))
  const initialHistoryDate = (() => {
    const q = params.get('date')
    return q && !Number.isNaN(Date.parse(q)) ? q : ''
  })()
  const [date, setDate] = useState(todayISO)
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [dirty, setDirty] = useState({ student: false, batch: false })
  const [preview, setPreview] = useState<ActivityAttachment | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const students = useAsync(() => fetchMyStudents().catch((e) => (console.error('Error loading students:', e), [])), [])
  const catalog = useAsync(() => fetchClassesAndSubjects().catch((e) => (console.error('Error loading classes/subjects:', e), { classes: [], subjects: [] })), [])

  useBeforeUnload(dirty.student || dirty.batch)
  const onStudentDirty = useCallback((d: boolean) => setDirty((s) => (s.student === d ? s : { ...s, student: d })), [])
  const onBatchDirty = useCallback((d: boolean) => setDirty((s) => (s.batch === d ? s : { ...s, batch: d })), [])

  // Changing the day reloads the per-student entries, so unsaved edits there would be lost.
  const requestDate = (next: string) => {
    if (next === date) return
    if (dirty.student) setPendingDate(next)
    else setDate(next)
  }

  const descriptions: Record<Mode, string> = {
    student: 'Log the lesson for one or more students. Saved entries for the chosen day appear here to edit.',
    batch: 'Log the same lesson for an entire class in one go.',
    history: 'Past entries: update homework status, add remarks and fix anything the admin sent back.',
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <PageHeader title="Daily Activities" description="Log what you taught so students and admins can follow along." className="tw:mb-0" />

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList aria-label="How to log">
          <TabsTrigger value="student">
            <UserRound aria-hidden="true" />
            <span className="tw:sm:hidden">Students</span>
            <span className="tw:hidden tw:sm:inline">Individual students</span>
          </TabsTrigger>
          <TabsTrigger value="batch">
            <Users aria-hidden="true" />
            <span className="tw:sm:hidden">Class</span>
            <span className="tw:hidden tw:sm:inline">Whole class</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <History aria-hidden="true" /> History
          </TabsTrigger>
        </TabsList>
        <p className="tw:m-0 tw:-mt-1 tw:text-sm tw:text-muted-foreground">{descriptions[mode]}</p>

        {mode !== 'history' && <DateBar value={date} onChange={requestDate} note={mode === 'batch' ? 'applies to every student in the class' : 'applies to all entries below'} />}

        {/* forceMount keeps unsaved work when switching tabs. */}
        <TabsPrimitive.Content value="student" forceMount hidden={mode !== 'student'} className="tw:outline-none">
          <StudentEntriesTab
            date={date}
            refreshKey={refreshKey}
            students={students.data ?? []}
            studentsLoading={students.loading}
            canDeleteAttachments={canDeleteAttachments}
            onPreview={setPreview}
            onDirtyChange={onStudentDirty}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="batch" forceMount hidden={mode !== 'batch'} className="tw:outline-none">
          <ClassTab
            date={date}
            classes={catalog.data?.classes ?? []}
            subjects={catalog.data?.subjects ?? []}
            loading={catalog.loading}
            onDirtyChange={onBatchDirty}
            onSaved={() => !dirty.student && setRefreshKey((k) => k + 1)}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="history" forceMount hidden={mode !== 'history'} className="tw:outline-none">
          <HistoryTab
            active={mode === 'history'}
            initialDate={initialHistoryDate}
            onPreview={setPreview}
            onEdit={(d) => {
              requestDate(d)
              setMode('student')
            }}
          />
        </TabsPrimitive.Content>
      </Tabs>

      <ConfirmDialog
        open={pendingDate !== null}
        onOpenChange={(o) => !o && setPendingDate(null)}
        title="Discard unsaved changes?"
        description="You have entries that aren't saved. Switching the day reloads that day's entries."
        confirmLabel="Discard and switch"
        destructive
        onConfirm={() => {
          setDate(pendingDate!)
          setPendingDate(null)
        }}
      />

      <AttachmentPreviewModal attachment={preview} url={preview ? attachmentUrl(preview) : null} onHide={() => setPreview(null)} />
    </div>
  )
}
