import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { transitions } from '@/animations'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { StudentSummary } from '../services/widgetsService'

interface Props {
  title: string
  icon: LucideIcon
  iconClassName: string
  countLabel: string
  badgeVariant: 'warning' | 'destructive'
  loading: boolean
  students: StudentSummary[]
  showStatus?: boolean
  className: (s: StudentSummary) => string
  action: (s: StudentSummary) => ReactNode
}

/** Shared table layout for the Ghost / Unassigned student widgets. Rows collapse out when removed. */
export default function StudentListCard({ title, icon: Icon, iconClassName, countLabel, badgeVariant, loading, students, showStatus, className, action }: Props) {
  return (
    <Card className="tw:gap-0 tw:py-0">
      <CardHeader className="tw:border-b tw:border-solid tw:border-border tw:py-4">
        <CardTitle className="tw:flex tw:items-center tw:gap-2.5">
          <span className={cn('tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-full', iconClassName)}>
            <Icon className="tw:size-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
        {!loading && (
          <CardAction>
            <Badge variant={badgeVariant}>{countLabel}</Badge>
          </CardAction>
        )}
      </CardHeader>
      {loading ? (
        <div className="tw:flex tw:flex-col tw:gap-3 tw:p-5" role="status" aria-label={`Loading ${title.toLowerCase()}`}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="tw:h-10" />
          ))}
        </div>
      ) : (
        <div className="tw:max-h-[350px] tw:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="tw:text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {students.map((s) => (
                  <m.tr
                    key={s.id}
                    layout
                    exit={{ opacity: 0, x: 24, transition: transitions.fast }}
                    className="tw:border-0 tw:border-b tw:border-solid tw:border-border tw:transition-colors tw:hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="tw:flex tw:flex-col">
                        <div className="tw:flex tw:items-center tw:gap-2">
                          <span className="tw:font-medium">{s.name}</span>
                          {showStatus && s.status && (
                            <Badge variant={s.status === 'active' ? 'success' : 'secondary'} className="tw:capitalize">
                              {s.status}
                            </Badge>
                          )}
                        </div>
                        <span className="tw:text-xs tw:text-muted-foreground">{s.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tw:text-muted-foreground">{className(s)}</TableCell>
                    <TableCell className="tw:text-right">{action(s)}</TableCell>
                  </m.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
