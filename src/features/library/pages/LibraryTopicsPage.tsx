import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, GraduationCap, ListChecks, Search } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import SubjectChips from '../components/SubjectChips'
import { fetchLibraryChapters, fetchLibraryTopics, fetchTeacherSubjects, NO_SUBJECTS } from '../services/libraryService'

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

/** Teacher library (read-only). Topics need a subject (legacy picked the first one). */
export default function LibraryTopicsPage() {
  const subjects = useAsync(() => fetchTeacherSubjects().catch((e) => (console.error('Error fetching subjects:', e), [])), [])
  const [picked, setPicked] = useState<string | null>(null)
  const subject = picked ?? (subjects.data?.[0] ? String(subjects.data[0].id) : '')
  const [chapter, setChapter] = useState('')
  const [grade, setGrade] = useState('')
  const [q, setQ] = useState('')

  const chapters = useAsync(() => fetchLibraryChapters(subject).catch((e) => (console.error('Error fetching chapters:', e), [])), [subject], { enabled: !!subject })
  const list = useAsync(
    () => fetchLibraryTopics({ subject_id: subject, chapter_id: chapter, grade }).catch((e) => (console.error('Error fetching topics:', e), [])),
    [subject, chapter, grade],
    { enabled: !!subject },
  )
  const topics = useMemo(() => {
    const s = q.trim().toLowerCase()
    const all = list.data ?? []
    return s ? all.filter((t) => t.name.toLowerCase().includes(s)) : all
  }, [list.data, q])

  const noSubjects = !subjects.loading && (subjects.data ?? []).length === 0

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Library — Topics" description="Explanations and practice questions for each topic you teach." className="mb-0" />

      {noSubjects ? (
        <Card>
          <EmptyState icon={GraduationCap} title="No subjects yet" description={NO_SUBJECTS} />
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-3">
            {subjects.loading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <SubjectChips
                subjects={subjects.data ?? []}
                value={subject}
                onChange={(v) => {
                  setPicked(v)
                  setChapter('') // chapters belong to a subject (legacy reset)
                }}
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-52 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input type="search" className="h-9 pl-9" placeholder="Search topics" aria-label="Search topics" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <NativeSelect size="sm" aria-label="Chapter" className="w-full sm:w-48" value={chapter} disabled={!subject} onChange={(e) => setChapter(e.target.value)}>
                <option value="">All chapters</option>
                <option value="none">No chapter</option>
                {(chapters.data ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect size="sm" aria-label="Grade" className="w-full sm:w-36" value={grade} disabled={!subject} onChange={(e) => setGrade(e.target.value)}>
                <option value="">All grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={String(g)}>
                    Grade {g}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </Card>

          {(list.loading && !list.data) || subjects.loading ? (
            <div className="flex flex-col gap-2" role="status" aria-label="Loading topics">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : topics.length === 0 ? (
            <Card>
              <EmptyState icon={ListChecks} title={q ? `No topics match “${q}”.` : 'No topics found for this filter.'} />
            </Card>
          ) : (
            <ul className={cn('m-0 flex list-none flex-col gap-2 p-0', list.loading && 'opacity-70')}>
              {topics.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/library/topics/${t.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-solid border-border bg-card px-4 py-3 text-foreground no-underline transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-medium">{t.name}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {t.chapter?.name ?? 'No chapter'}
                        <Badge variant="secondary">{t.grade ? `Grade ${t.grade}` : 'All grades'}</Badge>
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
