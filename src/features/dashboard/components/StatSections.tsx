import { m } from 'motion/react'
import {
  BookOpen,
  CalendarCheck,
  CircleArrowDown,
  CircleArrowUp,
  Clock,
  GraduationCap,
  HeartHandshake,
  IndianRupee,
  Presentation,
  Users,
} from 'lucide-react'
import { stagger } from '@/animations'
import StatCard, { StatCardSkeleton } from '@/components/common/StatCard'
import { formatCurrency } from '@/lib/formatters'
import { PERMISSIONS as P, usePermission } from '@/permissions'
import type { DashboardStats } from '../types'

const GRID = 'grid gap-3 grid-cols-2 sm:gap-4 xl:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]'

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <m.div className={GRID} variants={stagger(0.05)} initial="hidden" animate="visible">
      {children}
    </m.div>
  )
}

export function StatsSkeleton({ count }: { count: number }) {
  return (
    <div className={GRID} role="status" aria-label="Loading stats">
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** coaching_admin / staff: one card per `dashboard.stats.*` key (unchanged gates). */
export function AdminStats({ stats }: { stats: DashboardStats }) {
  const { can } = usePermission()
  return (
    <Grid>
      {can(P.DASHBOARD_STATS_STUDENTS) && <StatCard label="Total Students" value={stats.total_students} icon={GraduationCap} tone="pink" />}
      {can(P.DASHBOARD_STATS_TEACHERS) && <StatCard label="Total Teachers" value={stats.total_teachers} icon={Presentation} tone="violet" />}
      {can(P.DASHBOARD_STATS_ACTIVITIES) && <StatCard label="Total Activities" value={stats.total_activities} icon={BookOpen} tone="info" />}
      {can(P.DASHBOARD_STATS_EARNINGS) && (
        <StatCard label="Total Earnings" value={stats.total_earnings} icon={CircleArrowUp} tone="success" format={formatCurrency} />
      )}
      {can(P.DASHBOARD_STATS_EXPENSES) && (
        <StatCard label="Total Expenses" value={stats.total_expenses} icon={CircleArrowDown} tone="destructive" format={formatCurrency} />
      )}
    </Grid>
  )
}

export function TeacherStats({ stats }: { stats: DashboardStats }) {
  return (
    <Grid>
      <StatCard label="My Students" value={stats.total_students} icon={Users} tone="pink" />
      <StatCard label="Total Activities" value={stats.total_activities} icon={CalendarCheck} tone="violet" />
      <StatCard label="Home Not Done" value={stats.home_not_done_count} icon={Clock} tone="destructive" />
    </Grid>
  )
}

export function StudentStats({ stats }: { stats: DashboardStats }) {
  return (
    <Grid>
      <StatCard label="My Teachers" value={stats.total_teachers} icon={HeartHandshake} tone="pink" />
      <StatCard label="My Activities" value={stats.total_activities} icon={CalendarCheck} tone="violet" />
      <StatCard label="Home Not Done" value={stats.home_not_done_count} icon={Clock} tone="info" />
      <StatCard label="Fees Paid" value={stats.total_fees_paid} icon={IndianRupee} tone="success" format={formatCurrency} />
    </Grid>
  )
}
