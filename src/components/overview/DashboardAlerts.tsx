import { useNavigate } from 'react-router-dom'
import Icon from '../common/Icon.tsx'
import { targetRoute, type OverviewAlert } from './overviewApi'

const ICONS: Record<string, string> = {
  assessment: 'mdi:clipboard-text-clock-outline',
  attendance: 'mdi:calendar-alert',
  homework: 'mdi:notebook-edit-outline',
  result: 'mdi:chart-line-variant',
  content: 'mdi:lightbulb-on-outline',
  paper: 'mdi:file-document-check-outline',
  grading: 'mdi:clipboard-edit-outline',
  activity: 'mdi:playlist-edit',
  students: 'mdi:account-alert-outline',
}

const TONE: Record<OverviewAlert['severity'], { border: string; bg: string; icon: string }> = {
  high: { border: '#DC2626', bg: 'bg-danger-50', icon: 'text-danger-600' },
  medium: { border: '#D97706', bg: 'bg-warning-50', icon: 'text-warning-600' },
  info: { border: '#2563EB', bg: 'bg-info-50', icon: 'text-info-600' },
}

/** "What needs attention today" — prioritised by the API (high → info). */
export default function DashboardAlerts({ alerts, role }: { alerts: OverviewAlert[]; role: 'student' | 'teacher' }) {
  const navigate = useNavigate()
  if (alerts.length === 0) return null

  return (
    <div className="card mb-24">
      <div className="card-header d-flex align-items-center gap-2">
        <Icon icon="mdi:lightning-bolt-outline" className="text-xl text-primary-600" />
        <h6 className="fw-bold text-lg mb-0">Needs your attention</h6>
      </div>
      <div className="card-body p-12">
        <div className="row g-2">
          {alerts.map(a => {
            const tone = TONE[a.severity]
            return (
              <div className="col-xl-4 col-md-6" key={a.key}>
                <button
                  type="button"
                  onClick={() => navigate(targetRoute(a.target, role))}
                  className={`w-100 h-100 text-start border-0 radius-8 p-12 d-flex gap-2 ${tone.bg}`}
                  style={{ borderLeft: `4px solid ${tone.border}` }}
                >
                  <Icon icon={ICONS[a.icon] ?? 'mdi:information-outline'} className={`text-xl flex-shrink-0 ${tone.icon}`} />
                  <span>
                    <span className="d-block fw-semibold text-sm text-primary-light">{a.title}</span>
                    <span className="d-block text-xs text-secondary-light mt-2">{a.message}</span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
