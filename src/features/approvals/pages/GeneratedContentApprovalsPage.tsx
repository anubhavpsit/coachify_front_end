import { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { Bot, Check, Clock, RefreshCw, Search, ShieldAlert, Undo2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import SegmentedControl from '@/components/common/SegmentedControl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { usePermission } from '@/permissions'
import { formatDate, formatDateTime } from '@/utils/date'
import RemarksDialog from '../components/RemarksDialog'
import { QUICK_FILTERS, quickFilterDates, type QuickFilter } from '../lib/review'
import { fetchGeneratedContent, fetchStudentsForContent, setContentApproval, type GeneratedContent } from '../services/generatedContentService'

const SECTIONS = [
  { key: 'explanation_html', label: 'Explanation' },
  { key: 'homework_html', label: 'Homework' },
  { key: 'sample_questions_html', label: 'Sample questions' },
  { key: 'sample_questions_with_solutions_html', label: 'With solutions' },
] as const

const SUGGESTIONS = ['The explanation is off-topic.', 'Homework is too long for this grade.', 'Sample questions have errors.', 'Solutions are missing steps.']

function ContentTabs({ item }: { item: GeneratedContent }) {
  const present = SECTIONS.filter((s) => !!item[s.key])
  const [tab, setTab] = useState<string>(present[0]?.key ?? '')
  if (!present.length) return <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No content was generated.</p>
  return (
    <Tabs value={tab} onValueChange={setTab} className="tw:gap-2">
      <TabsList aria-label="Generated content">
        {present.map((s) => (
          <TabsTrigger key={s.key} value={s.key}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {present.map((s) => (
        <TabsContent key={s.key} value={s.key}>
          {/* AI output — always sanitised (as before). */}
          <div
            className="tw:max-h-72 tw:overflow-y-auto tw:rounded-lg tw:border tw:border-solid tw:border-border tw:bg-muted/30 tw:p-3 tw:text-sm tw:leading-relaxed tw:[&_ol]:list-decimal tw:[&_ol]:pl-5 tw:[&_p]:my-1 tw:[&_ul]:list-disc tw:[&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item[s.key] || '') }}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

/**
 * Route gate: generated_content.approve (unchanged). In-page gate kept exactly (Q2):
 * only role coaching_admin sees the page and triggers the fetches.
 */
export default function GeneratedContentApprovalsPage() {
  const { hasRole } = usePermission()
  const isAdmin = hasRole(ROLES.COACHING_ADMIN)
  const [status, setStatus] = useState<'pending' | 'approved'>('pending')
  const [quick, setQuick] = useState<QuickFilter>('today')
  const [customDate, setCustomDate] = useState('')
  const [studentId, setStudentId] = useState('')
  const [q, setQ] = useState('')
  const students = useAsync(() => fetchStudentsForContent().catch(() => []), [], { enabled: isAdmin })
  const list = useAsync(
    () =>
      fetchGeneratedContent(status === 'approved', quickFilterDates(quick, customDate), studentId || undefined).catch((e) => {
        console.error('Failed to load generated content', e)
        throw e
      }),
    [status, quick, customDate, studentId],
    { enabled: isAdmin },
  )
  const [busyId, setBusyId] = useState<number | null>(null)
  const [approving, setApproving] = useState<GeneratedContent | null>(null)
  const [pendingFor, setPendingFor] = useState<GeneratedContent | null>(null)

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    const all = list.data ?? []
    if (!s) return all
    return all.filter((i) => [i.daily_activity?.student?.name, i.daily_activity?.teacher?.name, i.daily_activity?.subject?.subject, i.daily_activity?.topic].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)))
  }, [list.data, q])

  if (!isAdmin) {
    return (
      <div className="tw:flex tw:flex-col tw:gap-6">
        <PageHeader title="AI Content Approvals" className="tw:mb-0" />
        <Card>
          <EmptyState icon={ShieldAlert} title="You are not authorized to view this page." />
        </Card>
      </div>
    )
  }

  const approve = async () => {
    const item = approving!
    setBusyId(item.id)
    try {
      const msg = await setContentApproval(item.id, true)
      toast.success(msg || 'Content approved.')
      list.reload()
    } catch (err) {
      console.error('Failed to update generated content approval', err)
      toast.error('Unable to update approval. Please try again.')
      throw err
    } finally {
      setBusyId(null)
    }
  }

  const markPending = async (remarks: string) => {
    const item = pendingFor!
    const msg = await setContentApproval(item.id, false, remarks)
    toast.success(msg || 'Marked as pending.')
    list.reload()
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <PageHeader title="AI Content Approvals" description="Review AI-generated explanations, homework and sample questions before they reach teachers and students." className="tw:mb-0" />

      <Alert>
        <Clock aria-hidden="true" />
        <AlertDescription>Approving releases all of the content to the teacher immediately; sample-question solutions unlock for students 48 hours after approval.</AlertDescription>
      </Alert>

      <div className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4">
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
          <SegmentedControl
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'pending', label: 'Pending review' },
              { value: 'approved', label: 'Approved' },
            ]}
          />
          <div role="group" aria-label="Date range" className="tw:flex tw:flex-wrap tw:items-center tw:gap-1">
            {QUICK_FILTERS.map((f) => (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={quick === f.value ? 'soft' : 'ghost'}
                aria-pressed={quick === f.value}
                onClick={() => {
                  setQuick(f.value)
                  setCustomDate('')
                }}
              >
                {f.label}
              </Button>
            ))}
            <Input
              type="date"
              aria-label="Pick a date"
              className={cn('tw:h-8 tw:w-40', quick === 'custom' && 'tw:border-primary')}
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value)
                setQuick(e.target.value ? 'custom' : 'all')
              }}
            />
          </div>
          <Button type="button" size="icon-sm" variant="outline" className="tw:ml-auto" onClick={list.reload} disabled={list.loading} aria-label="Refresh">
            <RefreshCw className={cn(list.loading && 'tw:animate-spin tw:motion-reduce:animate-none')} aria-hidden="true" />
          </Button>
        </div>
        <div className="tw:grid tw:gap-3 tw:sm:grid-cols-[1fr_16rem]">
          <div className="tw:relative">
            <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
            <Input type="search" className="tw:pl-9" placeholder="Search student, teacher, subject or topic" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <NativeSelect aria-label="Student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">All students</option>
            {(students.data ?? []).map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {list.loading && !list.data ? (
        <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading generated content">
          <Skeleton className="tw:h-56 tw:rounded-xl" />
          <Skeleton className="tw:h-56 tw:rounded-xl" />
        </div>
      ) : list.error ? (
        <ErrorState title="Unable to load generated content. Please try again later." onRetry={list.reload} />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={Bot} title={q ? 'Nothing matches your search.' : status === 'pending' ? 'Nothing waiting for review.' : 'No generated content found for the selected filters.'} />
        </Card>
      ) : (
        <ul className={cn('tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0', list.loading && 'tw:opacity-70')}>
          {shown.map((item) => {
            const a = item.daily_activity
            return (
              <li key={item.id}>
                <article aria-label={`${a?.student?.name ?? 'Student'} · ${a?.subject?.subject ?? ''}`} className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4">
                  <header className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-1.5">
                    <span className="tw:text-sm tw:font-semibold tw:text-foreground">{a?.student?.name ?? '-'}</span>
                    {a?.subject && <Badge variant="soft">{a.subject.subject}</Badge>}
                    {a?.topic && <span className="tw:text-sm tw:text-foreground">{a.topic}</span>}
                    {a?.teacher?.name && (
                      <span className="tw:inline-flex tw:items-center tw:gap-1 tw:text-xs tw:text-muted-foreground">
                        <UserRound className="tw:size-3.5" aria-hidden="true" /> {a.teacher.name}
                      </span>
                    )}
                    <span className="tw:ml-auto tw:flex tw:items-center tw:gap-2">
                      {a?.activity_date && <span className="tw:text-xs tw:text-muted-foreground">{formatDate(a.activity_date)}</span>}
                      <Badge variant={item.is_admin_approved ? 'success' : 'warning'}>{item.is_admin_approved ? 'Approved' : 'Pending review'}</Badge>
                    </span>
                  </header>

                  {item.admin_feedback && (
                    <p className="tw:m-0 tw:rounded-md tw:border-l-4 tw:border-solid tw:border-y-0 tw:border-r-0 tw:border-warning tw:bg-warning-soft tw:px-3 tw:py-1.5 tw:text-sm">
                      <span className="tw:font-semibold">Feedback:</span>{' '}
                      {item.admin_feedback}
                    </p>
                  )}

                  <ContentTabs item={item} />

                  <footer className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-2 tw:border-t tw:border-solid tw:border-border tw:pt-3">
                    {item.is_admin_approved ? (
                      <>
                        <span className="tw:mr-auto tw:text-xs tw:text-muted-foreground">Approved {formatDateTime(item.approved_at)}</span>
                        <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => setPendingFor(item)}>
                          <Undo2 aria-hidden="true" /> Mark pending
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="success" loading={busyId === item.id} disabled={busyId === item.id} onClick={() => setApproving(item)}>
                        <Check aria-hidden="true" /> Approve content
                      </Button>
                    )}
                  </footer>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!approving}
        onOpenChange={(o) => !o && setApproving(null)}
        title="Approve this content?"
        description={
          <>
            The explanation, homework and sample questions for <strong>{approving?.daily_activity?.student?.name ?? 'this student'}</strong> go to the teacher now; students see the solutions 48 hours
            later.
          </>
        }
        confirmLabel="Yes, approve"
        cancelLabel="No"
        onConfirm={approve}
      />
      <RemarksDialog
        open={!!pendingFor}
        onClose={() => setPendingFor(null)}
        title="Mark as pending"
        description="Hide this content again and tell the teacher what needs to be regenerated."
        submitLabel="Mark pending"
        initial={pendingFor?.admin_feedback ?? ''}
        suggestions={SUGGESTIONS}
        onSubmit={markPending}
      />
    </div>
  )
}
