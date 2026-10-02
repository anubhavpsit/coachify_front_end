import { useId, useRef, useState, type DragEvent } from 'react'
import { FileText, ImageIcon, LoaderCircle, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ATTACHMENT_ACCEPT, attachmentProblem } from '../schemas/activityForm'
import type { ActivityAttachment } from '../services/dailyActivitiesService'

const sizeLabel = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)
const isPdf = (name: string) => name.toLowerCase().endsWith('.pdf')

interface PickerProps {
  /** Valid files only; invalid ones are reported through onRejected. */
  onFiles: (files: File[]) => void
  onRejected?: (problems: string[]) => void
  disabled?: boolean
  busy?: boolean
  label?: string
  hint?: string
  id?: string
}

/** Click-or-drop area for several images/PDFs, checked against the backend rules before anything is sent. */
export function FilePicker({ onFiles, onRejected, disabled, busy, label = 'Add files', hint = 'JPG, PNG, WebP or PDF · up to 10 MB each', id }: PickerProps) {
  const fallback = useId()
  const inputId = id ?? fallback
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const take = (list: FileList | null) => {
    const files = list ? Array.from(list) : []
    if (!files.length) return
    const problems = files.map(attachmentProblem).filter((p): p is string => !!p)
    const ok = files.filter((f) => !attachmentProblem(f))
    if (problems.length) onRejected?.(problems)
    if (ok.length) onFiles(ok)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) take(e.dataTransfer.files)
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'm-0 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input px-4 py-3 text-sm transition-colors hover:border-primary/60 hover:bg-primary-soft/40',
        dragging && 'border-primary bg-primary-soft/60',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Paperclip className="size-4" aria-hidden="true" />}
      </span>
      <span className="flex flex-col">
        <span className="font-medium text-foreground">{busy ? 'Uploading…' : `${label} — click or drop here`}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </label>
  )
}

/** Files chosen but not uploaded yet (whole-class form). */
export function PendingFiles({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  if (!files.length) return null
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full border border-solid border-border bg-muted/50 py-1 pr-1 pl-3 text-xs">
          {isPdf(f.name) ? <FileText className="size-3.5 text-destructive" aria-hidden="true" /> : <ImageIcon className="size-3.5 text-info" aria-hidden="true" />}
          <span className="max-w-48 truncate">{f.name}</span>
          <span className="text-muted-foreground">{sizeLabel(f.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${f.name}`}
            className="m-0 flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Uploaded files: open in the preview; delete only when `canDelete` (coaching admin, as before). */
export function AttachmentChips({
  attachments,
  onPreview,
  onDelete,
  canDelete,
  deletingId,
}: {
  attachments: ActivityAttachment[]
  onPreview: (a: ActivityAttachment) => void
  onDelete?: (a: ActivityAttachment) => void
  canDelete?: boolean
  deletingId?: number | null
}) {
  if (!attachments.length) return null
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center gap-1 rounded-full border border-solid border-border bg-card py-1 pr-1 pl-3 text-xs">
          {a.file_type === 'pdf' || isPdf(a.original_name) ? (
            <FileText className="size-3.5 text-destructive" aria-hidden="true" />
          ) : (
            <ImageIcon className="size-3.5 text-info" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={() => onPreview(a)}
            className="m-0 max-w-48 cursor-pointer truncate border-0 bg-transparent p-0 pr-2 text-xs text-foreground underline-offset-2 hover:underline"
          >
            {a.original_name}
          </button>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(a)}
              disabled={deletingId === a.id}
              aria-label={`Delete ${a.original_name}`}
              className="m-0 flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:opacity-50"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
