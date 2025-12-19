import { useEffect, useState } from 'react'
import { Modal, Button } from 'react-bootstrap'
import axios from 'axios'
import Avatar from './common/Avatar'

interface StudentProfile {
  class?: string
  subjects?: (string | number)[]
  phone?: string
}

interface UserProfile {
  id: number
  name: string
  email: string
  role: string
  dob?: string | null
  profile_img?: string | null
  profile_image?: string | null
  tenant_id: number
  student_profile?: StudentProfile | null
}

interface UserProfileModalProps {
  userId: number | null
  show: boolean
  onHide: () => void
  canEditImage: boolean
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function UserProfileModal({
  userId,
  show,
  onHide,
  canEditImage,
}: UserProfileModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (!show || !userId) return

    const fetchProfile = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('authToken')
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setUser(response.data.data)
        }
      } catch (err) {
        console.error('Error fetching user profile', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [show, userId])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !userId) return

    setUploading(true)
    try {
      const token = localStorage.getItem('authToken')
      const formData = new FormData()
      formData.append('profile_image', file)

      const response = await axios.post(
        `${API_BASE_URL}/users/${userId}/profile-image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      )

      if (response.data.success) {
        setUser(response.data.data)
        setFile(null)
      }
    } catch (err) {
      console.error('Error uploading profile image', err)
      alert('Failed to upload profile image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>User Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading || !user ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <>
            <div className="d-flex align-items-center gap-3 mb-3">
              <Avatar
                user={{
                  name: user.name,
                  profile_image: user.profile_image ?? undefined,
                }}
                size={64}
              />
              <div>
                <h6 className="mb-1">{user.name}</h6>
                <div className="text-sm text-secondary-light">{user.email}</div>
                <div className="text-sm text-secondary-light">
                  Role: {user.role}
                </div>
                {user.dob && (
                  <div className="text-sm text-secondary-light">
                    DOB: {user.dob}
                  </div>
                )}
              </div>
            </div>

            {user.role === 'student' && user.student_profile && (
              <div className="mb-3">
                <h6 className="fw-semibold mb-2">Student Details</h6>
                <div className="text-sm">Class: {user.student_profile.class}</div>
                <div className="text-sm">
                  Phone: {user.student_profile.phone || '-'}
                </div>
              </div>
            )}

            {canEditImage && (
              <form onSubmit={handleUpload} className="mt-3">
                <h6 className="fw-semibold mb-2">Update Profile Image</h6>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control mb-2"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0])
                    }
                  }}
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={uploading || !file}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </form>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  )
}
