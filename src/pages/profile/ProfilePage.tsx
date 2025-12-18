import { useEffect, useState } from 'react'
import axios from 'axios'
import Icon from '../../components/common/Icon.tsx'
import Avatar from '../../components/common/Avatar.tsx'
import { ROLES } from '../../constants/roles.ts'

type StudentProfile = {
  class?: string | null
  subjects?: number[] | string[] | null
  phone?: string | null
  dob?: string | null
  address?: string | null
}

type RelatedUser = {
  id: number
  name: string
  email: string
  profile_img?: string | null
  profile_image?: string | null
}

type UserProfile = {
  id: number
  name: string
  email: string
  role: string
  dob?: string | null
  attendance_percentage?: number
  not_marked_days?: number
  profile_img?: string | null
  profile_image?: string | null
  studentProfile?: StudentProfile | null
  students?: RelatedUser[]
  teachers?: RelatedUser[]
}

type AssessmentHistoryItem = {
  id: number
  attempted_at?: string | null
  result?: {
    percentage?: number | string
  } | null
}

type StudentPerformanceSummary = {
  totalAssessments: number
  completedAssessments: number
  averagePercentage: number | null
  lastPercentage: number | null
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [performance, setPerformance] =
    useState<StudentPerformanceSummary | null>(null)
  const [loadingPerformance, setLoadingPerformance] = useState(false)
  const [performanceError, setPerformanceError] = useState<string | null>(
    null,
  )

  useEffect(() => {
    const loadProfileAndPerformance = async () => {
      try {
        setProfileError(null)
        setPerformanceError(null)

        const token = sessionStorage.getItem('authToken')
        const authUserRaw = sessionStorage.getItem('authUser')

        if (!token || !authUserRaw) {
          setProfileError('You are not authenticated.')
          return
        }

        const authUser = JSON.parse(authUserRaw) as {
          id?: number
          role?: string
        }

        if (!authUser?.id) {
          setProfileError('User information is missing.')
          return
        }

        setLoadingProfile(true)

        const profileResponse = await axios.get<{
          success: boolean
          data: UserProfile
        }>(`${API_BASE_URL}/users/${authUser.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (profileResponse.data.success && profileResponse.data.data) {
          const userData = profileResponse.data.data
          setProfile(userData)

          const isStudent =
            authUser.role === ROLES.STUDENT ||
            userData.role === ROLES.STUDENT

          if (isStudent) {
            setLoadingPerformance(true)
            try {
              const historyResponse = await axios.get<{
                success: boolean
                data: AssessmentHistoryItem[]
              }>(`${API_BASE_URL}/student/assessments/history`, {
                headers: { Authorization: `Bearer ${token}` },
              })

              if (
                historyResponse.data.success &&
                Array.isArray(historyResponse.data.data)
              ) {
                const history = historyResponse.data.data

                const completed = history.filter((item) => {
                  const percentage = item.result?.percentage
                  return (
                    percentage !== undefined &&
                    percentage !== null &&
                    !Number.isNaN(Number(percentage))
                  )
                })

                const totalCompleted = completed.length

                const averagePercentage =
                  totalCompleted > 0
                    ? Number(
                        (
                          completed.reduce((sum, item) => {
                            const value = Number(item.result?.percentage ?? 0)
                            return sum + (Number.isNaN(value) ? 0 : value)
                          }, 0) / totalCompleted
                        ).toFixed(2),
                      )
                    : null

                let lastPercentage: number | null = null
                if (completed.length > 0) {
                  const sorted = [...completed].sort((a, b) => {
                    const dateA = a.attempted_at
                      ? new Date(a.attempted_at).getTime()
                      : 0
                    const dateB = b.attempted_at
                      ? new Date(b.attempted_at).getTime()
                      : 0
                    return dateB - dateA
                  })
                  const latest = sorted[0]
                  const value = Number(latest.result?.percentage ?? 0)
                  lastPercentage = Number.isNaN(value)
                    ? null
                    : Number(value.toFixed(2))
                }

                setPerformance({
                  totalAssessments: history.length,
                  completedAssessments: totalCompleted,
                  averagePercentage,
                  lastPercentage,
                })
              }
            } catch (error) {
              console.error('Error loading student performance:', error)
              setPerformanceError('Unable to load performance data.')
            } finally {
              setLoadingPerformance(false)
            }
          }
        } else {
          setProfileError('Unable to load profile.')
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        setProfileError('Unable to load profile.')
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfileAndPerformance()
  }, [])

  const formatRole = (role: string) => role.replace('_', ' ')

  const renderAttendanceCard = () => {
    if (!profile) return null

    const percentage =
      typeof profile.attendance_percentage === 'number'
        ? profile.attendance_percentage.toFixed(2)
        : '0.00'

    return (
      <div className="card h-100">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
          <span className="text-md fw-medium text-secondary-light">
            Attendance
          </span>
          <Icon icon="ic:baseline-check-circle" className="text-success-600" />
        </div>
        <div className="card-body p-24">
          <h4 className="fw-semibold mb-8">{percentage}%</h4>
          <p className="text-secondary-light mb-4 text-sm">
            Overall attendance since joining.
          </p>
          {typeof profile.not_marked_days === 'number' && (
            <p className="text-xs text-muted mb-0">
              {profile.not_marked_days} day(s) yet to be marked.
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderStudentPerformanceCard = () => {
    if (!profile) return null

    if (profile.role !== ROLES.STUDENT) {
      return null
    }

    return (
      <div className="card h-100">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
          <span className="text-md fw-medium text-secondary-light">
            Performance
          </span>
          <Icon icon="ri:bar-chart-grouped-fill" className="text-primary-600" />
        </div>
        <div className="card-body p-24">
          {loadingPerformance ? (
            <div className="text-center py-3">
              <span className="spinner-border spinner-border-sm" />
              <span className="ms-2">Loading performance...</span>
            </div>
          ) : !performance ? (
            <p className="text-muted text-sm mb-0">
              No assessment history available yet.
            </p>
          ) : (
            <div className="row g-3">
              <div className="col-6">
                <div className="border radius-8 p-12">
                  <span className="text-xs text-secondary-light d-block mb-4">
                    Average Score
                  </span>
                  <span className="fw-semibold">
                    {performance.averagePercentage !== null
                      ? `${performance.averagePercentage.toFixed(2)}%`
                      : '-'}
                  </span>
                </div>
              </div>
              <div className="col-6">
                <div className="border radius-8 p-12">
                  <span className="text-xs text-secondary-light d-block mb-4">
                    Last Score
                  </span>
                  <span className="fw-semibold">
                    {performance.lastPercentage !== null
                      ? `${performance.lastPercentage.toFixed(2)}%`
                      : '-'}
                  </span>
                </div>
              </div>
              <div className="col-6">
                <div className="border radius-8 p-12">
                  <span className="text-xs text-secondary-light d-block mb-4">
                    Completed Assessments
                  </span>
                  <span className="fw-semibold">
                    {performance.completedAssessments}
                  </span>
                </div>
              </div>
              <div className="col-6">
                <div className="border radius-8 p-12">
                  <span className="text-xs text-secondary-light d-block mb-4">
                    Total Assessments
                  </span>
                  <span className="fw-semibold">
                    {performance.totalAssessments}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loadingProfile && !profile) {
    return (
      <div>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
          <h6 className="fw-semibold mb-0">My Profile</h6>
        </div>
        <p>Loading profile...</p>
      </div>
    )
  }

  if (profileError && !profile) {
    return (
      <div>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
          <h6 className="fw-semibold mb-0">My Profile</h6>
        </div>
        <p className="text-danger-600 text-sm mb-0">{profileError}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">My Profile</h6>
        <ul className="d-flex align-items-center gap-2">
          <li className="fw-medium">
            <span className="d-flex align-items-center gap-1 text-secondary-light">
              <Icon
                icon="solar:home-smile-angle-outline"
                className="icon text-lg"
              />
              Dashboard
            </span>
          </li>
          <li>-</li>
          <li className="fw-medium">Profile</li>
        </ul>
      </div>

      {profile && (
        <div className="row gy-4">
          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-body p-24 d-flex flex-column align-items-center text-center">
                <Avatar
                  user={profile}
                  size={80}
                  className="mb-16"
                />
                <h5 className="fw-semibold mb-4">{profile.name}</h5>
                <span className="badge bg-primary-100 text-primary-600 text-xs mb-12 text-uppercase">
                  {formatRole(profile.role)}
                </span>

                <div className="w-100 mt-8">
                  <div className="d-flex justify-content-between align-items-center mb-8">
                    <span className="text-secondary-light text-sm">Email</span>
                    <span className="text-sm fw-medium text-break">
                      {profile.email}
                    </span>
                  </div>
                  {profile.dob && (
                    <div className="d-flex justify-content-between align-items-center mb-8">
                      <span className="text-secondary-light text-sm">Date of Birth</span>
                      <span className="text-sm fw-medium">
                        {profile.dob}
                      </span>
                    </div>
                  )}
                  {profile.studentProfile?.class && (
                    <div className="d-flex justify-content-between align-items-center mb-8">
                      <span className="text-secondary-light text-sm">Class</span>
                      <span className="text-sm fw-medium">
                        {profile.studentProfile.class}
                      </span>
                    </div>
                  )}
                  {profile.studentProfile?.phone && (
                    <div className="d-flex justify-content-between align-items-center mb-8">
                      <span className="text-secondary-light text-sm">Phone</span>
                      <span className="text-sm fw-medium">
                        {profile.studentProfile.phone}
                      </span>
                    </div>
                  )}
                  {profile.studentProfile?.address && (
                    <div className="d-flex justify-content-between align-items-start">
                      <span className="text-secondary-light text-sm">Address</span>
                      <span className="text-sm fw-medium text-end text-break ms-2">
                        {profile.studentProfile.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="row gy-4">
              <div className="col-md-6">{renderAttendanceCard()}</div>
              <div className="col-md-6">{renderStudentPerformanceCard()}</div>
            </div>
          </div>
        </div>
      )}

      {loadingProfile && profile && (
        <p className="text-secondary-light text-sm mt-3">
          Refreshing profile...
        </p>
      )}

      {profileError && profile && (
        <p className="text-danger-600 text-sm mt-3">{profileError}</p>
      )}

      {performanceError && (
        <p className="text-danger-600 text-sm mt-3">{performanceError}</p>
      )}
    </div>
  )
}

