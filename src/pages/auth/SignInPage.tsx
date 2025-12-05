import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Icon from '../../components/common/Icon.tsx'

type LoginUser = {
  id: number
  name: string
  email: string
  role: string
  created_at: string
  updated_at: string
  tenant_id: number
}

type LoginResponse = {
  user: LoginUser
  token: string
}

type TenantResponse = {
  tenant: {
    id: number
    [key: string]: unknown
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function SignInPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [isTenantResolved, setIsTenantResolved] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedTenantId = window.sessionStorage.getItem('tenant_id')
    if (storedTenantId) {
      const parsed = Number.parseInt(storedTenantId, 10)
      if (!Number.isNaN(parsed)) {
        setTenantId(parsed)
      }
      setIsTenantResolved(true)
      return
    }

    const { hostname } = window.location
    const parts = hostname.split('.')

    if (parts.length < 3) {
      setIsTenantResolved(true)
      return
    }

    const subdomain = parts[0]

    axios
      .get<TenantResponse>(`${API_BASE_URL}/tenants/${subdomain}`)
      .then((response) => {
        const tenant = response.data?.tenant
        if (tenant && typeof tenant.id === 'number') {
          setTenantId(tenant.id)
          window.sessionStorage.setItem('tenant_id', String(tenant.id))
          window.sessionStorage.setItem('tenant', JSON.stringify(tenant))
        } else {
          setError('Unable to load tenant information.')
        }
      })
      .catch(() => {
        setError('Unable to load tenant information.')
      })
      .finally(() => {
        setIsTenantResolved(true)
      })
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (typeof window === 'undefined') return

    setError(null)

    if (!tenantId) {
      setError('Tenant information is missing.')
      return
    }

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/login`,
        {
          email,
          password,
          tenant_id: tenantId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      const { user, token } = response.data

      window.sessionStorage.setItem('authUser', JSON.stringify(user))
      window.sessionStorage.setItem('authToken', token)
      window.sessionStorage.setItem('tenant_id', String(user.tenant_id))

      navigate('/dashboard')
    } catch {
      setError('Invalid credentials or server error.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth bg-base d-flex flex-wrap min-vh-100">
      <div className="auth-left d-lg-block d-none">
        <div className="d-flex align-items-center flex-column h-100 justify-content-center">
          <img src="/assets/images/auth/auth-img.png" alt="" />
        </div>
      </div>
      <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center">
        <div className="max-w-464-px mx-auto w-100">
          <div>
            <button
              type="button"
              className="border-0 bg-transparent mb-40 max-w-290-px p-0"
              onClick={() => navigate('/')}
            >
              <img src="/assets/images/logo.png" alt="Coachify" />
            </button>
            <h4 className="mb-12">Sign in to your account</h4>
            <p className="mb-32 text-secondary-light text-lg">
              Welcome back! Please enter your credentials.
            </p>
            {!isTenantResolved && (
              <p className="mb-16 text-secondary-light text-sm">
                Loading tenant information...
              </p>
            )}
            {error && (
              <p className="mb-16 text-danger-600 text-sm">{error}</p>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="icon-field mb-16">
              <span className="icon top-50 translate-middle-y">
                <Icon icon="mage:email" />
              </span>
              <input
                type="email"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Email"
                name="email"
                required
              />
            </div>
            <div className="mb-20">
              <div className="position-relative">
                <div className="icon-field">
                  <span className="icon top-50 translate-middle-y">
                    <Icon icon="solar:lock-password-outline" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control h-56-px bg-neutral-50 radius-12"
                    id="signin-password"
                    placeholder="Password"
                    name="password"
                    required
                    minLength={8}
                  />
                </div>
                <button
                  type="button"
                  className="position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light border-0 bg-transparent"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i
                    className={
                      showPassword
                        ? 'ri-eye-off-line cursor-pointer'
                        : 'ri-eye-line cursor-pointer'
                    }
                  ></i>
                </button>
              </div>
              <span className="mt-12 text-sm text-secondary-light d-block">
                Enter your password to continue.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-8"
              disabled={isSubmitting || !isTenantResolved}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="mt-32 text-center text-sm">
              <p className="mb-0">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="text-primary-600 fw-semibold border-0 bg-transparent p-0"
                  onClick={() => navigate('/auth/sign-up')}
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
