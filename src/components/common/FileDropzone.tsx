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
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'm-0 flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-input bg-muted/40 px-4 py-5 text-center transition-colors',
          dragging && 'border-primary bg-primary-soft/60',
          invalid && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">
          Drop a file here or <span className="text-primary">browse</span>
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="sr-only"
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
            className="flex items-center gap-3 rounded-lg border border-solid border-border bg-card p-2"
          >
            {preview ? (
              <img src={preview} alt="" className="size-12 rounded-md object-cover" />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText className="size-5" aria-hidden="true" />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{value.name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(value.size)}</span>
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
