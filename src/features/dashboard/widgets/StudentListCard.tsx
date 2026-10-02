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
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-solid border-border py-4">
        <CardTitle className="flex items-center gap-2.5">
          <span className={cn('flex size-8 items-center justify-center rounded-full', iconClassName)}>
            <Icon className="size-4" aria-hidden="true" />
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
        <div className="flex flex-col gap-3 p-5" role="status" aria-label={`Loading ${title.toLowerCase()}`}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <div className="max-h-[350px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {students.map((s) => (
                  <m.tr
                    key={s.id}
                    layout
                    exit={{ opacity: 0, x: 24, transition: transitions.fast }}
                    className="border-0 border-b border-solid border-border transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {showStatus && s.status && (
                            <Badge variant={s.status === 'active' ? 'success' : 'secondary'} className="capitalize">
                              {s.status}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{s.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{className(s)}</TableCell>
                    <TableCell className="text-right">{action(s)}</TableCell>
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
