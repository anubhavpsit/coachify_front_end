import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Password field with an accessible show/hide toggle. Forwards all input props. */
export default function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <div className="tw:relative">
      <Input type={visible ? 'text' : 'password'} className={cn('tw:pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="tw:absolute tw:top-1/2 tw:right-1.5 tw:m-0 tw:inline-flex tw:size-8 tw:-translate-y-1/2 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-transparent tw:text-muted-foreground tw:outline-none tw:transition-colors tw:hover:text-foreground tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50"
      >
        <Icon className="tw:size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
