import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Avatar from '../../components/common/Avatar'
import { ROLES } from '../../constants/roles'

interface StudentProfile {
  class?: string
  phone?: string
}

interface UserResult {
  id: number
  name: string
  email: string
  tenant_id: number
  profile_image?: string | null
  student_profile?: StudentProfile | null
}

interface SubjectResult {
  id: number
  subject: string
}

interface ClassResult {
  id: number
  name: string
}

interface EnquiryResult {
  id: number
  name: string
  contact_number: string | null
  email: string | null
  enquiry_type: string
  status: string
}

interface SearchData {
  students: UserResult[]
  teachers: UserResult[]
  subjects: SubjectResult[]
  classes: ClassResult[]
  enquiries: EnquiryResult[]
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim()

  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchData>({
    students: [],
    teachers: [],
    subjects: [],
    classes: [],
    enquiries: [],
  })

  useEffect(() => {
    const authUser = JSON.parse(localStorage.getItem('authUser') || '{}')
    setUserRole(authUser.role || '')
  }, [])

  useEffect(() => {
    if (!query) {
      setResults({
        students: [],
        teachers: [],
        subjects: [],
        classes: [],
        enquiries: [],
      })
      return
    }

    const token = localStorage.getItem('authToken')
    if (!token) {
      setError('You are not authenticated.')
      return
    }

    const runSearch = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await axios.get<{
          success: boolean
          data: SearchData
        }>(`${API_BASE_URL}/search`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          params: { q: query },
        })

        if (response.data.success) {
          setResults(response.data.data)
        } else {
          setError('Unable to load search results.')
        }
      } catch (err) {
        console.error('Error running search:', err)
        setError('Unable to load search results.')
      } finally {
        setLoading(false)
      }
    }

    runSearch()
  }, [query])

  const hasAnyResults =
    results.students.length > 0 ||
    results.teachers.length > 0 ||
    results.subjects.length > 0 ||
    results.classes.length > 0 ||
    results.enquiries.length > 0

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Search Results</h6>
      </div>

      {query ? (
        <p className="mb-16 text-secondary-light">
          Showing results for <strong>"{query}"</strong>
        </p>
      ) : (
        <p className="mb-16 text-secondary-light">
          Type a keyword in the search box above to find students, teachers,
          subjects, classes, or enquiries.
        </p>
      )}

      {loading && <p>Loading results...</p>}
      {error && <p className="text-danger-600 text-sm mb-16">{error}</p>}

      {!loading && !error && query && !hasAnyResults && (
        <p className="text-secondary-light">No results found.</p>
      )}

      {/* Students */}
      {results.students.length > 0 && (
        <section className="mb-32">
          <div className="d-flex align-items-center justify-content-between mb-12">
            <h6 className="fw-semibold mb-0">Students</h6>
            <Link to="/students" className="text-sm text-primary-600">
              Go to Students
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {results.students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Avatar
                          user={{
                            name: student.name,
                            profile_image: student.profile_image ?? undefined,
                          }}
                          size={32}
                        />
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td>{student.email}</td>
                    <td>{student.student_profile?.class ?? '-'}</td>
                    <td>{student.student_profile?.phone ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Teachers */}
      {results.teachers.length > 0 && (
        <section className="mb-32">
          <div className="d-flex align-items-center justify-content-between mb-12">
            <h6 className="fw-semibold mb-0">Teachers</h6>
            <Link to="/teachers" className="text-sm text-primary-600">
              Go to Teachers
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {results.teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Avatar
                          user={{
                            name: teacher.name,
                            profile_image: teacher.profile_image ?? undefined,
                          }}
                          size={32}
                        />
                        <span>{teacher.name}</span>
                      </div>
                    </td>
                    <td>{teacher.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Subjects (coaching admin only) */}
      {userRole === ROLES.COACHING_ADMIN && results.subjects.length > 0 && (
        <section className="mb-32">
          <div className="d-flex align-items-center justify-content-between mb-12">
            <h6 className="fw-semibold mb-0">Subjects</h6>
            <Link to="/subjects" className="text-sm text-primary-600">
              Go to Subjects
            </Link>
          </div>
          <ul className="list-unstyled mb-0">
            {results.subjects.map((subject) => (
              <li key={subject.id} className="py-4 border-bottom">
                {subject.subject}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Classes (coaching admin only) */}
      {userRole === ROLES.COACHING_ADMIN && results.classes.length > 0 && (
        <section className="mb-32">
          <div className="d-flex align-items-center justify-content-between mb-12">
            <h6 className="fw-semibold mb-0">Classes</h6>
            <Link to="/classes" className="text-sm text-primary-600">
              Go to Classes
            </Link>
          </div>
          <ul className="list-unstyled mb-0">
            {results.classes.map((coachingClass) => (
              <li key={coachingClass.id} className="py-4 border-bottom">
                {coachingClass.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Enquiries (coaching admin only) */}
      {userRole === ROLES.COACHING_ADMIN && results.enquiries.length > 0 && (
        <section className="mb-32">
          <div className="d-flex align-items-center justify-content-between mb-12">
            <h6 className="fw-semibold mb-0">Enquiries</h6>
            <Link to="/enquiries" className="text-sm text-primary-600">
              Go to Enquiries
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td>{enquiry.name}</td>
                    <td>{enquiry.contact_number || '-'}</td>
                    <td>{enquiry.email || '-'}</td>
                    <td className="text-capitalize">{enquiry.enquiry_type}</td>
                    <td className="text-capitalize">{enquiry.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
