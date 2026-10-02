import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, m } from 'motion/react'
import { CircleAlert, Mail } from 'lucide-react'
import { slideUp, shake } from '@/animations'
import PasswordInput from '@/components/common/PasswordInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getTenantPrimaryLogoUrl } from '@/utils/branding'
import AuthLayout from '../components/AuthLayout'
import { useSignIn } from '../hooks/useSignIn'
import { useTenantResolution } from '../hooks/useTenantResolution'
import { signInSchema, type SignInValues } from '../schemas/signIn'

export default function SignInPage() {
  const { tenantId, isResolved, displayBrandName, tenantError } = useTenantResolution()
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched', // validate on blur, then live while fixing
  })
  const { submit, formError } = useSignIn(tenantId, form.setError)
  const error = formError ?? tenantError
  const logoUrl = isResolved ? getTenantPrimaryLogoUrl() : null
  const submitting = form.formState.isSubmitting

  return (
    <AuthLayout brandName={displayBrandName}>
      <m.div variants={slideUp} initial="hidden" animate="visible" className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          {!isResolved ? (
            <div className="flex flex-col gap-2" role="status">
              <Skeleton className="h-10 w-40" />
              <span className="text-sm text-muted-foreground">Preparing your workspace...</span>
            </div>
          ) : logoUrl ? (
            <img src={logoUrl} alt={`${displayBrandName} logo`} className="max-h-14 max-w-[18rem] object-contain object-left" />
          ) : (
            <div className="text-2xl font-bold text-foreground">{displayBrandName}</div>
          )}
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-2xl! font-bold tracking-tight text-foreground">Sign in to your account</h1>
            <p className="m-0 text-muted-foreground">Welcome back! Please enter your credentials.</p>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {error && (
            <m.div key={error} variants={shake} initial="idle" animate="shake">
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </m.div>
          )}
        </AnimatePresence>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <FormControl>
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="you@example.com"
                        className="h-12 pl-10"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" placeholder="Password" className="h-12" {...field} />
                  </FormControl>
                  <FormDescription>Enter your password to continue.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="lg" className="mt-1 h-12 w-full" loading={submitting} disabled={!isResolved}>
              {submitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Form>
      </m.div>
    </AuthLayout>
  )
}
