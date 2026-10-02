import { useState, type ReactNode } from 'react'
import type { FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form'
import { AnimatePresence, m } from 'motion/react'
import { CircleAlert } from 'lucide-react'
import { shake } from '@/animations'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import ConfirmDialog from './ConfirmDialog'

interface Props<T extends FieldValues> {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  form: UseFormReturn<T>
  onSubmit: SubmitHandler<T>
  submitLabel: string
  submittingLabel?: string
  /** Form-level error (non-field API errors). */
  error?: string | null
  className?: string
  children: ReactNode
}

/**
 * Dialog + react-hook-form shell: submit/cancel footer with loading state,
 * double-submit protection, animated form-level error, and a "discard
 * changes?" prompt when closing a dirty form.
 */
export default function FormDialog<T extends FieldValues>({
  open,
  onClose,
  title,
  description,
  form,
  onSubmit,
  submitLabel,
  submittingLabel = 'Saving...',
  error,
  className,
  children,
}: Props<T>) {
  const { isDirty, isSubmitting } = form.formState // read in render → subscribed
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const requestClose = () => {
    if (isSubmitting) return
    if (isDirty) setConfirmDiscard(true)
    else onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent className={cn('sm:max-w-lg', className)} onInteractOutside={(e) => isDirty && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
              {children}
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {isSubmitting ? submittingLabel : submitLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        description="You have unsaved changes."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={onClose}
      />
    </>
  )
}
