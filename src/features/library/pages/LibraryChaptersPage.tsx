import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, ChevronRight, GraduationCap, Search } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { fetchLibraryChapters, fetchTeacherSubjects } from '../services/libraryService'
import SubjectChips from '../components/SubjectChips'
import { NO_SUBJECTS } from '../services/libraryService'

/** Teacher library (read-only). Route has no guard (Q9); the sidebar link is teacher-only. */
export default function LibraryChaptersPage() {
  const subjects = useAsync(() => fetchTeacherSubjects().catch((e) => (console.error('Error fetching subjects:', e), [])), [])
  const [subject, setSubject] = useState('')
  const list = useAsync(() => fetchLibraryChapters(subject || undefined).catch((e) => (console.error('Error fetching chapters:', e), [])), [subject])
  const [q, setQ] = useState('')
  const chapters = useMemo(() => {
    const s = q.trim().toLowerCase()
    const all = list.data ?? []
    return s ? all.filter((c) => c.name.toLowerCase().includes(s)) : all
  }, [list.data, q])
  const subjectName = (id: number) => subjects.data?.find((s) => s.id === id)?.subject

  const noSubjects = !subjects.loading && (subjects.data ?? []).length === 0

  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <PageHeader title="Library — Chapters" description="Chapters for the subjects your students take. Open one to see its topics, explanations and questions." className="tw:mb-0" />

      {!noSubjects && (
        <Card className="tw:flex-row tw:flex-wrap tw:items-center tw:gap-3 tw:p-3">
          <SubjectChips subjects={subjects.data ?? []} value={subject} onChange={setSubject} allLabel="All my subjects" />
          <div className="tw:relative tw:ml-auto tw:w-full tw:sm:w-64">
            <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
            <Input type="search" className="tw:h-9 tw:pl-9" placeholder="Search chapters" aria-label="Search chapters" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </Card>
      )}

      {noSubjects ? (
        <Card>
          <EmptyState icon={GraduationCap} title="No subjects yet" description={NO_SUBJECTS} />
        </Card>
      ) : list.loading && !list.data ? (
        <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-3" role="status" aria-label="Loading chapters">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="tw:h-24 tw:rounded-xl" />
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <Card>
          <EmptyState icon={BookMarked} title={q ? `No chapters match “${q}”.` : 'No chapters found for this subject.'} />
        </Card>
      ) : (
        <ul className={cn('tw:m-0 tw:grid tw:list-none tw:gap-3 tw:p-0 tw:sm:grid-cols-2 tw:lg:grid-cols-3', list.loading && 'tw:opacity-70')}>
          {chapters.map((c) => {
            const n = c.topics_count ?? 0
            return (
              <li key={c.id}>
                <Link
                  to={`/library/chapters/${c.id}`}
                  className="tw:group tw:flex tw:h-full tw:items-start tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4 tw:text-foreground tw:no-underline tw:transition-colors tw:hover:border-primary/40 tw:hover:bg-primary-soft/30"
                >
                  <span className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-primary-soft tw:text-primary">
                    <BookMarked className="tw:size-5" aria-hidden="true" />
                  </span>
                  <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1.5">
                    <span className="tw:font-semibold">{c.name}</span>
                    <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-xs tw:text-muted-foreground">
                      <Badge variant="soft">{c.subject?.subject ?? subjectName(c.subject_id) ?? '-'}</Badge>
                      {n} {n === 1 ? 'topic' : 'topics'}
                    </span>
                  </span>
                  <ChevronRight className="tw:mt-2 tw:size-4 tw:shrink-0 tw:text-muted-foreground tw:transition-transform tw:group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
