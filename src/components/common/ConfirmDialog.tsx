import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /** May be async; the dialog shows a spinner until it settles. Throw/reject to keep it open (report the error yourself, e.g. a toast). */
  onConfirm: () => unknown | Promise<unknown>
}

/** Replaces window.confirm for destructive / irreversible actions. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false)
  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // stay open so the user can retry or cancel
    } finally {
      setBusy(false)
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          {/* Plain Button (not AlertDialogAction) so the dialog doesn't close before the request finishes. */}
          <Button variant={destructive ? 'destructive' : 'default'} loading={busy} onClick={() => void handleConfirm()}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
