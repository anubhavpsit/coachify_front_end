import { useEffect, useState } from 'react'
import axios from 'axios'
import Icon from '../../components/common/Icon.tsx'
import { ROLES } from '../../constants/roles'
import BirthdayCard from '../../components/BirthdayCard';
import TodayBirthdayCard from '../../components/TodayBirthdayCard';
import LowAttendanceCard from '../../components/LowAttendanceCard';

type DashboardStats = {
  role: string
  total_students?: number
  total_teachers?: number
  total_expenses?: number
  total_earnings?: number
  total_activities?: number
  total_classes?: number
  total_subjects?: number
  home_not_done_count?: number
  total_fees_paid?: number
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topStudents, setTopStudents] = useState<
    {
      student_id: number
      student_name: string | null
      average_percentage: number
      last_percentage: number
      last_graded_at: string
    }[]
  >([])
  const [loadingTopStudents, setLoadingTopStudents] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = sessionStorage.getItem('authToken')
        if (!token) {
          setError('You are not authenticated.')
          setLoading(false)
          return
        }

        const response = await axios.get<{
          success: boolean
          data: DashboardStats
        }>(`${API_BASE_URL}/dashboard/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setStats(response.data.data)
        } else {
          setError('Unable to load dashboard stats.')
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        setError('Unable to load dashboard stats.')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    const fetchTopStudents = async () => {
      setLoadingTopStudents(true)
      try {
        const token = sessionStorage.getItem('authToken')
        if (!token) {
          setLoadingTopStudents(false)
          return
        }

        const response = await axios.get<{
          success: boolean
          data: {
            student_id: number
            student_name: string | null
            average_percentage: number
            last_percentage: number
            last_graded_at: string
          }[]
        }>(`${API_BASE_URL}/dashboard/assessments/top-students`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.data.success) {
          setTopStudents(response.data.data || [])
        }
      } catch (error) {
        console.error('Error loading top students:', error)
      } finally {
        setLoadingTopStudents(false)
      }
    }

    fetchTopStudents()
  }, [])

  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('authUser') || '{}')
    } catch {
      return {}
    }
  })()

  const role = user.role ?? stats?.role

  const formatNumber = (value: number | undefined) =>
    typeof value === 'number' ? value.toLocaleString() : '0'

  const formatCurrency = (value: number | undefined) =>
    typeof value === 'number'
      ? `₹${value.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`
      : '₹0'

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Dashboard</h6>
        <ul className="d-flex align-items-center gap-2">
          <li className="fw-medium">
            <span className="d-flex align-items-center gap-1 text-secondary-light">
              <Icon
                icon="solar:home-smile-angle-outline"
                className="icon text-lg"
              />
              Overview
            </span>
          </li>
        </ul>
      </div>

      {loading && <p>Loading stats...</p>}
      {error && !loading && (
        <p className="text-danger-600 text-sm mb-16">{error}</p>
      )}

      {!loading && !error && stats && (
        <div className="row gy-4 mb-24">
          {role === ROLES.COACHING_ADMIN && (
            <>
              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-1">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-pink text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-group-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Total Students
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.total_students)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-2">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-purple text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-user-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Total Teachers
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.total_teachers)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-3">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-info-main text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-book-open-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Total Activities
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.total_activities)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-primary-50 text-primary-600 text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-bar-chart-grouped-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Total Earnings
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatCurrency(stats.total_earnings)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-danger-50 text-danger-600 text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-cash-line"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Total Expenses
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatCurrency(stats.total_expenses)}
                    </h5>
                  </div>
                </div>
              </div>


              <TodayBirthdayCard />

              <div className="row g-3 mt-2">
              <BirthdayCard />
              <LowAttendanceCard />
              </div>
              

              <div className="row g-3 mt-2">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
                      <span className="text-md fw-medium text-secondary-light">
                        Top Performing Students
                      </span>
                    </div>
                    <div className="card-body">
                      {loadingTopStudents ? (
                        <div className="text-center py-4">
                          <span className="spinner-border spinner-border-sm"></span>
                          <span className="ms-2">Loading top students...</span>
                        </div>
                      ) : topStudents.length === 0 ? (
                        <p className="text-muted mb-0">
                          No assessment results available yet.
                        </p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table bordered-table mb-0">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Student</th>
                                <th>Average %</th>
                                <th>Last %</th>
                                <th>Last Assessed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topStudents.map((s, index) => (
                                <tr key={s.student_id}>
                                  <td>{index + 1}</td>
                                  <td>{s.student_name ?? 'Unknown'}</td>
                                  <td>{s.average_percentage.toFixed(2)}%</td>
                                  <td>{s.last_percentage.toFixed(2)}%</td>
                                  <td>{s.last_graded_at}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}

          {role === ROLES.TEACHER && (
            <>
              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-1">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-pink text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-group-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          My Students
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.total_students)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-2">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-purple text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-calendar-check-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Total Activities
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.total_activities)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-danger-50 text-danger-600 text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-time-line"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Home Not Done
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.home_not_done_count)}
                    </h5>
                  </div>
                </div>
              </div>

              <TodayBirthdayCard />
            </>
          )}

          {role === ROLES.STUDENT && (
            <>
              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-1">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-pink text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-user-heart-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          My Teachers
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.total_teachers)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-2">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-purple text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-calendar-check-fill"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          My Activities
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.total_activities)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-3">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-base text-info-main text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-time-line"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Home Not Done
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatNumber(stats.home_not_done_count)}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="col-xxl-3 col-md-6">
                <div className="card p-20 radius-12 h-100">
                  <div className="d-flex align-items-center justify-content-between mb-12">
                    <div className="d-flex align-items-center gap-2">
                      <span className="mb-0 w-48-px h-48-px bg-primary-50 text-primary-600 text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                        <i className="ri-currency-line"></i>
                      </span>
                      <div>
                        <span className="mb-0 fw-medium text-secondary-light text-lg">
                          Fees Paid
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
                    <h5 className="fw-semibold mb-0">
                      {formatCurrency(stats.total_fees_paid)}
                    </h5>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
