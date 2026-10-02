import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { m } from 'motion/react'
import { ArrowRight, BookOpen, GraduationCap, Layers, MessageCircleQuestion, SearchX, Search as SearchIcon, UserRound } from 'lucide-react'
import { slideUp, stagger } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import UserAvatar from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { usePermission } from '@/permissions'
import Highlight from '../lib/Highlight'
import { searchAll, type SearchUser } from '../services/searchService'

function Section({ title, icon: Icon, count, to, children }: { title: string; icon: typeof UserRound; count: number; to: string; children: ReactNode }) {
  return (
    <m.section variants={slideUp} aria-label={title}>
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-solid border-border py-4">
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-4 text-primary" aria-hidden="true" />
            {title}
            <Badge variant="secondary" className="tabular-nums">
              {count}
            </Badge>
          </CardTitle>
          <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary no-underline hover:underline">
            Go to {title} <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </CardHeader>
        {children}
      </Card>
    </m.section>
  )
}

function PersonCell({ user, q }: { user: SearchUser; q: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <UserAvatar name={user.name} image={user.profile_image} className="size-8" />
      <span className="font-medium">
        <Highlight text={user.name} query={q} />
      </span>
    </div>
  )
}

function Chips({ items, q }: { items: { id: number; label: string }[]; q: string }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-5">
      {items.map((i) => (
        <li key={i.id} className="rounded-full border border-solid border-border bg-muted/50 px-3 py-1 text-sm">
          <Highlight text={i.label} query={q} />
        </li>
      ))}
    </ul>
  )
}

const dash = <span className="text-muted-foreground">-</span>

/**
 * Global search results. No route gate (Q9). In-page gate kept exactly: the
 * Subjects, Classes and Enquiries sections render only for role coaching_admin.
 */
export default function SearchResultsPage() {
  const [params] = useSearchParams()
  const query = (params.get('q') ?? '').trim()
  const { hasRole } = usePermission()
  const isAdmin = hasRole(ROLES.COACHING_ADMIN)
  const search = useAsync(
    () =>
      searchAll(query).catch((e) => {
        console.error('Error running search:', e)
        throw e
      }),
    [query],
    { enabled: !!query },
  )
  const r = query ? search.data : undefined
  const students = r?.students ?? []
  const teachers = r?.teachers ?? []
  const subjects = isAdmin ? (r?.subjects ?? []) : []
  const classes = isAdmin ? (r?.classes ?? []) : []
  const enquiries = isAdmin ? (r?.enquiries ?? []) : []
  const visible = students.length + teachers.length + subjects.length + classes.length + enquiries.length
  const error = search.error ? (search.error instanceof Error && search.error.message === 'You are not authenticated.' ? search.error.message : 'Unable to load search results.') : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Search Results"
        description={
          query ? (
            <>
              Showing results for <strong className="text-foreground">&ldquo;{query}&rdquo;</strong>
            </>
          ) : undefined
        }
        className="mb-0"
      />

      {!query ? (
        <Card>
          <EmptyState icon={SearchIcon} title="Search your coaching" description="Type a keyword in the search box above to find students, teachers, subjects, classes, or enquiries." />
        </Card>
      ) : search.loading ? (
        <div className="flex flex-col gap-4" role="status" aria-label="Loading results">
          <Skeleton className="h-40" />
          <Skeleton className="h-28" />
        </div>
      ) : error ? (
        <ErrorState title={error} onRetry={error === 'You are not authenticated.' ? undefined : search.reload} />
      ) : visible === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="No results found." description="Try a different spelling, or search by email or phone." />
        </Card>
      ) : (
        <m.div key={query} className="flex flex-col gap-4" variants={stagger(0.06)} initial="hidden" animate="visible">
          {students.length > 0 && (
            <Section title="Students" icon={GraduationCap} count={students.length} to={ROUTES.STUDENTS}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <PersonCell user={s} q={query} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Highlight text={s.email} query={query} />
                      </TableCell>
                      <TableCell>{s.student_profile?.class ?? dash}</TableCell>
                      <TableCell>{s.student_profile?.phone ?? dash}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}

          {teachers.length > 0 && (
            <Section title="Teachers" icon={UserRound} count={teachers.length} to={ROUTES.TEACHERS}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <PersonCell user={t} q={query} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Highlight text={t.email} query={query} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}

          {subjects.length > 0 && (
            <Section title="Subjects" icon={BookOpen} count={subjects.length} to={ROUTES.SUBJECTS}>
              <Chips items={subjects.map((s) => ({ id: s.id, label: s.subject }))} q={query} />
            </Section>
          )}

          {classes.length > 0 && (
            <Section title="Classes" icon={Layers} count={classes.length} to={ROUTES.CLASSES}>
              <Chips items={classes.map((c) => ({ id: c.id, label: c.name }))} q={query} />
            </Section>
          )}

          {enquiries.length > 0 && (
            <Section title="Enquiries" icon={MessageCircleQuestion} count={enquiries.length} to={ROUTES.ENQUIRIES}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enquiries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <Highlight text={e.name} query={query} />
                      </TableCell>
                      <TableCell>{e.contact_number || dash}</TableCell>
                      <TableCell>{e.email || dash}</TableCell>
                      <TableCell>
                        <Badge variant={e.enquiry_type === 'teacher' ? 'info' : 'soft'} className="capitalize">
                          {e.enquiry_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === 'active' ? 'success' : 'secondary'} className="capitalize">
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}
        </m.div>
      )}
    </div>
  )
}
