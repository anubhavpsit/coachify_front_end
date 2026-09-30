import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { moduleLabel, type DashboardUser, type LogFilters } from './activityLogService'

const FIELD = 'tw:m-0 tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-medium tw:text-foreground'

interface Props {
  filters: LogFilters
  modules: string[]
  users: DashboardUser[]
  onChange: (changes: Partial<LogFilters>) => void
  onReset: () => void
}

export default function ActivityLogFilters({ filters, modules, users, onChange, onReset }: Props) {
  return (
    <div className="tw:grid tw:grid-cols-1 tw:items-end tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-3 tw:2xl:grid-cols-6">
      <label className={FIELD}>
        Module
        <NativeSelect value={filters.module} onChange={(e) => onChange({ module: e.target.value })} aria-label="Filter by module">
          <option value="all">All modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {moduleLabel(m)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className={FIELD}>
        Role
        <NativeSelect value={filters.role} onChange={(e) => onChange({ role: e.target.value as LogFilters['role'] })} aria-label="Filter by role">
          <option value="all">All roles</option>
          <option value="coaching_admin">Admins</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
          <option value="staff">Staff</option>
        </NativeSelect>
      </label>
      <label className={FIELD}>
        User
        <NativeSelect value={filters.userId} onChange={(e) => onChange({ userId: e.target.value })} aria-label="Filter by user">
          <option value="all">All users</option>
          {users.map((user) => (
            <option key={`${user.role}-${user.id ?? 'admin'}`} value={user.id}>
              {user.name} ({user.role})
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className={FIELD}>
        From
        <Input type="date" value={filters.startDate} max={filters.endDate} onChange={(e) => onChange({ startDate: e.target.value })} />
      </label>
      <label className={FIELD}>
        To
        <Input type="date" value={filters.endDate} min={filters.startDate} onChange={(e) => onChange({ endDate: e.target.value })} />
      </label>
      <Button variant="secondary" onClick={onReset}>
        <RotateCcw aria-hidden="true" />
        Reset Filters
      </Button>
    </div>
  )
}
