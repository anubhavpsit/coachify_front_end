import { useEffect, useState } from 'react'
import axios from 'axios'

type Enquiry = {
  id: number
  enquiry_type: 'student' | 'teacher' | string
  name: string
  contact_number: string
  status: 'active' | 'inactive' | string
  last_communication_at?: string | null
  created_at: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

type FollowUpResponse = {
  success: boolean
  data: Enquiry[]
  meta?: {
    follow_up_frequency_days?: number
  }
}

function formatDate(value?: string | null): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export default function EnquiriesFollowUpCard() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frequencyDays, setFrequencyDays] = useState<number | null>(null)

  useEffect(() => {
    const loadEnquiries = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          setError('You are not authenticated.')
          setLoading(false)
          return
        }

        const response = await axios.get<FollowUpResponse>(
          `${API_BASE_URL}/enquiries/follow-up`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        )

        if (response.data.success) {
          setEnquiries(response.data.data || [])
          if (response.data.meta?.follow_up_frequency_days) {
            setFrequencyDays(response.data.meta.follow_up_frequency_days)
          }
        } else {
          setError('Unable to load enquiries.')
        }
      } catch (err) {
        console.error('Error loading enquiries for follow up:', err)
        setError('Unable to load enquiries.')
      } finally {
        setLoading(false)
      }
    }

    loadEnquiries()
  }, [])

  const dueEnquiries = enquiries

  return (
    <div className="col-xxl-4 col-md-6">
      <div className="card">
        <div className="card-header">
          <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
            <h6 className="mb-2 fw-bold text-lg mb-0">
              Enquiries to Communicate Today
            </h6>
            {frequencyDays && (
              <span className="text-xs text-secondary-light">
                Every {frequencyDays} days
              </span>
            )}
          </div>
        </div>
        <div
          className="card-body"
          style={{
            maxHeight: '300px',
            overflowY: dueEnquiries.length > 4 ? 'auto' : 'visible',
          }}
        >
          {loading && <p>Loading...</p>}
          {error && !loading && (
            <p className="text-danger-600 text-sm mb-0">{error}</p>
          )}
          {!loading && !error && dueEnquiries.length === 0 && (
            <p className="text-muted mb-0">
              No enquiries require communication today.
            </p>
          )}
          {!loading && !error &&
            dueEnquiries.map((enquiry) => (
              <div
                key={enquiry.id}
                className="d-flex align-items-center justify-content-between gap-3 mb-3"
              >
                <div className="d-flex flex-column">
                  <h6 className="text-md mb-0 fw-medium">{enquiry.name}</h6>
                  <span className="text-sm text-secondary-light">
                    {enquiry.enquiry_type === 'teacher'
                      ? 'Teacher Enquiry'
                      : 'Student Enquiry'}
                  </span>
                  <span className="text-xs text-secondary-light">
                    {enquiry.contact_number}
                  </span>
                </div>
                <div className="text-end">
                  <span className="d-block text-xs text-secondary-light">
                    Last communication
                  </span>
                  <span className="fw-semibold text-sm">
                    {formatDate(enquiry.last_communication_at)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
