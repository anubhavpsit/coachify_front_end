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
    <div className="flex flex-col gap-5">
      <PageHeader title="Library — Chapters" description="Chapters for the subjects your students take. Open one to see its topics, explanations and questions." className="mb-0" />

      {!noSubjects && (
        <Card className="flex-row flex-wrap items-center gap-3 p-3">
          <SubjectChips subjects={subjects.data ?? []} value={subject} onChange={setSubject} allLabel="All my subjects" />
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" className="h-9 pl-9" placeholder="Search chapters" aria-label="Search chapters" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </Card>
      )}

      {noSubjects ? (
        <Card>
          <EmptyState icon={GraduationCap} title="No subjects yet" description={NO_SUBJECTS} />
        </Card>
      ) : list.loading && !list.data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading chapters">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <Card>
          <EmptyState icon={BookMarked} title={q ? `No chapters match “${q}”.` : 'No chapters found for this subject.'} />
        </Card>
      ) : (
        <ul className={cn('m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3', list.loading && 'opacity-70')}>
          {chapters.map((c) => {
            const n = c.topics_count ?? 0
            return (
              <li key={c.id}>
                <Link
                  to={`/library/chapters/${c.id}`}
                  className="group flex h-full items-start gap-3 rounded-xl border border-solid border-border bg-card p-4 text-foreground no-underline transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <BookMarked className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="font-semibold">{c.name}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="soft">{c.subject?.subject ?? subjectName(c.subject_id) ?? '-'}</Badge>
                      {n} {n === 1 ? 'topic' : 'topics'}
                    </span>
                  </span>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
