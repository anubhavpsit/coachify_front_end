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
  high: 'tw:border-l-destructive tw:bg-destructive-soft',
  medium: 'tw:border-l-warning tw:bg-warning-soft',
  info: 'tw:border-l-info tw:bg-info-soft',
}
const ICON_TONE: Record<OverviewAlert['severity'], string> = {
  high: 'tw:text-destructive',
  medium: 'tw:text-warning',
  info: 'tw:text-info',
}

/** "What needs attention today" — prioritised by the API (high → info). Same targets as before. */
export default function DashboardAlerts({ alerts, role }: { alerts: OverviewAlert[]; role: 'student' | 'teacher' }) {
  const navigate = useNavigate()
  if (alerts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tw:flex tw:items-center tw:gap-2">
          <Zap className="tw:size-4 tw:text-primary" aria-hidden="true" />
          Needs your attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        <m.div className="tw:grid tw:gap-2 tw:md:grid-cols-2 tw:xl:grid-cols-3" variants={stagger(0.05)} initial="hidden" animate="visible">
          {alerts.map((a) => {
            const Icon = ICONS[a.icon] ?? Info
            return (
              <m.button
                key={a.key}
                variants={slideUp}
                type="button"
                onClick={() => navigate(targetRoute(a.target, role))}
                className={cn(
                  'tw:m-0 tw:flex tw:h-full tw:w-full tw:cursor-pointer tw:gap-3 tw:rounded-lg tw:border-0 tw:border-l-4 tw:border-solid tw:p-3 tw:text-left tw:outline-none tw:transition-transform tw:duration-150 tw:hover:-translate-y-0.5 tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
                  TONE[a.severity],
                )}
              >
                <Icon className={cn('tw:mt-0.5 tw:size-5 tw:shrink-0', ICON_TONE[a.severity])} aria-hidden="true" />
                <span className="tw:flex tw:flex-col tw:gap-0.5">
                  <span className="tw:text-sm tw:font-semibold tw:text-foreground">{a.title}</span>
                  <span className="tw:text-xs tw:text-muted-foreground">{a.message}</span>
                </span>
              </m.button>
            )
          })}
        </m.div>
      </CardContent>
    </Card>
  )
}
