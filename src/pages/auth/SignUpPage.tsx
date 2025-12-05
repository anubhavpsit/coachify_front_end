import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/common/Icon.tsx'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate('/')
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
            <h4 className="mb-12">Sign up to your account</h4>
            <p className="mb-32 text-secondary-light text-lg">
              Welcome! Please enter your details to get started.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="icon-field mb-16">
              <span className="icon top-50 translate-middle-y">
                <Icon icon="f7:person" />
              </span>
              <input
                type="text"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Username"
                required
              />
            </div>
            <div className="icon-field mb-16">
              <span className="icon top-50 translate-middle-y">
                <Icon icon="mage:email" />
              </span>
              <input
                type="email"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Email"
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
                    id="your-password"
                    placeholder="Password"
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
                Your password must have at least 8 characters.
              </span>
            </div>
            <div className="d-flex justify-content-between gap-2">
              <div className="form-check style-check d-flex align-items-start">
                <input
                  className="form-check-input border border-neutral-300 mt-4"
                  type="checkbox"
                  value=""
                  id="condition"
                  required
                />
                <label
                  className="form-check-label text-sm ms-2"
                  htmlFor="condition"
                >
                  By creating an account you agree to the{' '}
                  <a
                    href="javascript:void(0)"
                    className="text-primary-600 fw-semibold"
                  >
                    Terms &amp; Conditions
                  </a>{' '}
                  and our{' '}
                  <a
                    href="javascript:void(0)"
                    className="text-primary-600 fw-semibold"
                  >
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32"
            >
              Sign Up
            </button>

            <div className="mt-32 text-center text-sm">
              <p className="mb-0">
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-primary-600 fw-semibold border-0 bg-transparent p-0"
                  onClick={() => navigate('/')}
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
