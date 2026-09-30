import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { slideUp } from '@/animations'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  value: File | null
  onChange: (file: File | null) => void
  accept: string
  hint?: string
  invalid?: boolean
  disabled?: boolean
  id?: string
  describedBy?: string
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Click-or-drop single file picker with image preview. Validation belongs to the form schema. */
export default function FileDropzone({ value, onChange, accept, hint, invalid, disabled, id, describedBy }: Props) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!value || !value.type.startsWith('image/')) return
    const url = URL.createObjectURL(value)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the object URL with the file
    setPreview(url)
    return () => {
      URL.revokeObjectURL(url)
      setPreview(null)
    }
  }, [value])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const f = e.dataTransfer.files?.[0]
    if (f) onChange(f)
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-2">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'tw:m-0 tw:flex tw:cursor-pointer tw:flex-col tw:items-center tw:gap-1.5 tw:rounded-lg tw:border-2 tw:border-dashed tw:border-input tw:bg-muted/40 tw:px-4 tw:py-5 tw:text-center tw:transition-colors',
          dragging && 'tw:border-primary tw:bg-primary-soft/60',
          invalid && 'tw:border-destructive',
          disabled && 'tw:cursor-not-allowed tw:opacity-50',
        )}
      >
        <Upload className="tw:size-5 tw:text-muted-foreground" aria-hidden="true" />
        <span className="tw:text-sm tw:font-medium tw:text-foreground">
          Drop a file here or <span className="tw:text-primary">browse</span>
        </span>
        {hint && <span className="tw:text-xs tw:text-muted-foreground">{hint}</span>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="tw:sr-only"
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null)
            e.target.value = '' // allow re-picking the same file
          }}
        />
      </label>
      <AnimatePresence>
        {value && (
          <m.div
            key={value.name + value.size}
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="tw:flex tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-border tw:bg-card tw:p-2"
          >
            {preview ? (
              <img src={preview} alt="" className="tw:size-12 tw:rounded-md tw:object-cover" />
            ) : (
              <span className="tw:flex tw:size-12 tw:items-center tw:justify-center tw:rounded-md tw:bg-muted tw:text-muted-foreground">
                <FileText className="tw:size-5" aria-hidden="true" />
              </span>
            )}
            <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
              <span className="tw:truncate tw:text-sm tw:font-medium tw:text-foreground">{value.name}</span>
              <span className="tw:text-xs tw:text-muted-foreground">{formatSize(value.size)}</span>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label={`Remove ${value.name}`}>
              <X aria-hidden="true" />
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
