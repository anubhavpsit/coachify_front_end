import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, UserRound } from 'lucide-react'
import PasswordInput from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { getTenantBranding, getTenantBrandName } from '@/utils/branding'
import AuthLayout from '../components/AuthLayout'

/**
 * Static page (D2), ported as-is: same fields and native validation; submit
 * and "Sign in" go to "/" as before — no account is created.
 */
export default function SignUpPage() {
  const navigate = useNavigate()
  const branding = getTenantBranding()
  const brandName = getTenantBrandName()
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    navigate('/')
  }

  return (
    <AuthLayout brandName={brandName}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <button type="button" onClick={() => navigate('/')} className="m-0 w-fit cursor-pointer border-0 bg-transparent p-0" aria-label={`${brandName} home`}>
            <img src={branding.logoLight} alt={`${brandName} logo`} className="max-h-14 max-w-[18rem] object-contain object-left" />
          </button>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-2xl! font-bold tracking-tight text-foreground">Sign up to your account</h1>
            <p className="m-0 text-muted-foreground">Welcome! Please enter your details to get started.</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="relative">
            <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="text" aria-label="Username" placeholder="Username" required className="h-12 pl-10" />
          </div>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="email" aria-label="Email" placeholder="Email" required className="h-12 pl-10" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 z-[1] size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <PasswordInput id="your-password" aria-label="Password" placeholder="Password" required minLength={8} className="h-12 pl-10" />
            </div>
            <span className="text-sm text-muted-foreground">Your password must have at least 8 characters.</span>
          </div>
          <label className="m-0 flex items-start gap-2 text-sm">
            <Checkbox id="condition" required className="mt-0.5" />
            <span>
              By creating an account you agree to the <span className="font-semibold text-primary">Terms &amp; Conditions</span> and our{' '}
              <span className="font-semibold text-primary">Privacy Policy</span>.
            </span>
          </label>
          <Button type="submit" size="lg" className="mt-4 w-full">
            Sign Up
          </Button>
          <p className="m-0 mt-2 text-center text-sm">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/')} className="m-0 cursor-pointer border-0 bg-transparent p-0 font-semibold text-primary hover:underline">
              Sign in
            </button>
          </p>
        </form>
      </div>
    </AuthLayout>
  )
}
