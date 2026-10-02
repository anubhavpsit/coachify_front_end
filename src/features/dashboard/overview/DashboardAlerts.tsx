import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  CalendarX,
  ChartLine,
  ClipboardList,
  FileCheck2,
  Info,
  Lightbulb,
  ListChecks,
  NotebookPen,
  UserRoundSearch,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { m } from 'motion/react'
import { slideUp, stagger } from '@/animations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { targetRoute, type OverviewAlert } from './overviewApi'

const ICONS: Record<string, LucideIcon> = {
  assessment: CalendarClock,
  attendance: CalendarX,
  homework: NotebookPen,
  result: ChartLine,
  content: Lightbulb,
  paper: FileCheck2,
  grading: ClipboardList,
  activity: ListChecks,
  students: UserRoundSearch,
}

const TONE: Record<OverviewAlert['severity'], string> = {
  high: 'border-l-destructive bg-destructive-soft',
  medium: 'border-l-warning bg-warning-soft',
  info: 'border-l-info bg-info-soft',
}
const ICON_TONE: Record<OverviewAlert['severity'], string> = {
  high: 'text-destructive',
  medium: 'text-warning',
  info: 'text-info',
}

/** "What needs attention today" — prioritised by the API (high → info). Same targets as before. */
export default function DashboardAlerts({ alerts, role }: { alerts: OverviewAlert[]; role: 'student' | 'teacher' }) {
  const navigate = useNavigate()
  if (alerts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-primary" aria-hidden="true" />
          Needs your attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        <m.div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" variants={stagger(0.05)} initial="hidden" animate="visible">
          {alerts.map((a) => {
            const Icon = ICONS[a.icon] ?? Info
            return (
              <m.button
                key={a.key}
                variants={slideUp}
                type="button"
                onClick={() => navigate(targetRoute(a.target, role))}
                className={cn(
                  'm-0 flex h-full w-full cursor-pointer gap-3 rounded-lg border-0 border-l-4 border-solid p-3 text-left outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  TONE[a.severity],
                )}
              >
                <Icon className={cn('mt-0.5 size-5 shrink-0', ICON_TONE[a.severity])} aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{a.title}</span>
                  <span className="text-xs text-muted-foreground">{a.message}</span>
                </span>
              </m.button>
            )
          })}
        </m.div>
      </CardContent>
    </Card>
  )
}
