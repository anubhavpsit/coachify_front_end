import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import type { UseFormSetError } from 'react-hook-form'
import { ROUTES } from '@/constants/routes'
import { applyServerErrors } from '@/lib/forms'
import { SIGN_IN_FIELDS, type SignInValues } from '../schemas/signIn'
import { loginRequest, storeSession } from '../services/authService'

export const TENANT_MISSING_ERROR = 'Tenant information is missing.'
const GENERIC_LOGIN_ERROR = 'Invalid credentials or server error.'

function loginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Unable to reach the server. Check your connection and try again.'
    if (err.response.status === 401 || err.response.status === 403) return 'Invalid email or password.'
  }
  return GENERIC_LOGIN_ERROR
}

/** Submit flow unchanged: POST /auth/login → store session → /dashboard. */
export function useSignIn(tenantId: number | null, setError: UseFormSetError<SignInValues>) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async (values: SignInValues) => {
    setFormError(null)
    if (!tenantId) {
      setFormError(TENANT_MISSING_ERROR)
      return
    }
    try {
      const data = await loginRequest({ email: values.email, password: values.password, tenant_id: tenantId })
      storeSession(data)
      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      const isValidation = axios.isAxiosError(err) && err.response?.status === 422
      setFormError(
        isValidation ? applyServerErrors(err, setError, SIGN_IN_FIELDS, { fallback: GENERIC_LOGIN_ERROR }) : loginErrorMessage(err),
      )
    }
  }

  return { submit, formError }
}
