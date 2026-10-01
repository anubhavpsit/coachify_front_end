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
        'tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-dashed tw:border-input tw:px-4 tw:py-3 tw:text-sm tw:transition-colors tw:hover:border-primary/60 tw:hover:bg-primary-soft/40',
        dragging && 'tw:border-primary tw:bg-primary-soft/60',
        disabled && 'tw:pointer-events-none tw:opacity-50',
      )}
    >
      <span className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted tw:text-muted-foreground">
        {busy ? <LoaderCircle className="tw:size-4 tw:animate-spin tw:motion-reduce:animate-none" aria-hidden="true" /> : <Paperclip className="tw:size-4" aria-hidden="true" />}
      </span>
      <span className="tw:flex tw:flex-col">
        <span className="tw:font-medium tw:text-foreground">{busy ? 'Uploading…' : `${label} — click or drop here`}</span>
        <span className="tw:text-xs tw:text-muted-foreground">{hint}</span>
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        disabled={disabled}
        className="tw:sr-only"
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
    <ul className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:gap-2 tw:p-0">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="tw:flex tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-solid tw:border-border tw:bg-muted/50 tw:py-1 tw:pr-1 tw:pl-3 tw:text-xs">
          {isPdf(f.name) ? <FileText className="tw:size-3.5 tw:text-destructive" aria-hidden="true" /> : <ImageIcon className="tw:size-3.5 tw:text-info" aria-hidden="true" />}
          <span className="tw:max-w-48 tw:truncate">{f.name}</span>
          <span className="tw:text-muted-foreground">{sizeLabel(f.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${f.name}`}
            className="tw:m-0 tw:flex tw:size-5 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-full tw:border-0 tw:bg-transparent tw:p-0 tw:text-muted-foreground tw:hover:bg-background tw:hover:text-foreground"
          >
            <X className="tw:size-3" aria-hidden="true" />
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
    <ul className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:gap-2 tw:p-0">
      {attachments.map((a) => (
        <li key={a.id} className="tw:flex tw:items-center tw:gap-1 tw:rounded-full tw:border tw:border-solid tw:border-border tw:bg-card tw:py-1 tw:pr-1 tw:pl-3 tw:text-xs">
          {a.file_type === 'pdf' || isPdf(a.original_name) ? (
            <FileText className="tw:size-3.5 tw:text-destructive" aria-hidden="true" />
          ) : (
            <ImageIcon className="tw:size-3.5 tw:text-info" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={() => onPreview(a)}
            className="tw:m-0 tw:max-w-48 tw:cursor-pointer tw:truncate tw:border-0 tw:bg-transparent tw:p-0 tw:pr-2 tw:text-xs tw:text-foreground tw:underline-offset-2 tw:hover:underline"
          >
            {a.original_name}
          </button>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(a)}
              disabled={deletingId === a.id}
              aria-label={`Delete ${a.original_name}`}
              className="tw:m-0 tw:flex tw:size-5 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-full tw:border-0 tw:bg-transparent tw:p-0 tw:text-muted-foreground tw:hover:bg-destructive-soft tw:hover:text-destructive tw:disabled:opacity-50"
            >
              <X className="tw:size-3" aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
