import { useState } from 'react'
import { Check, Download, FileText, ImageIcon, Paperclip, Trash2, Undo2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getErrorMessage } from '@/lib/apiClient'
import { formatDateTime } from '@/utils/date'
import { FILE_ACCEPT, fileProblem } from '../schemas/assessmentForms'
import { deleteFile, fetchFiles, fileUrl, setFileApproval, uploadFile, type Assessment, type AssessmentFile, type AssessmentFileType } from '../services/assessmentsService'

interface Props {
  assessment: Assessment | null
  /** role coaching_admin — approve / mark pending / remove (unchanged rule). */
  isAdmin: boolean
  onClose: () => void
  onPreview: (f: AssessmentFile) => void
}

const TYPE_LABEL: Record<string, string> = { question_paper: 'Question paper', answer_sheet: 'Answer sheet', other: 'Other' }

export default function FilesDialog(p: Props) {
  return (
    <Dialog open={!!p.assessment} onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent className="sm:max-w-2xl">{p.assessment && <FilesBody key={p.assessment.id} {...p} assessment={p.assessment} />}</DialogContent>
    </Dialog>
  )
}

function FilesBody({ assessment, isAdmin, onClose, onPreview }: Props & { assessment: Assessment }) {
  const files = useAsync(() => fetchFiles(assessment.id).catch((e) => (console.error('Error loading assessment files:', e), [] as AssessmentFile[])), [assessment.id])
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<AssessmentFileType>('question_paper')
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'pending'; file: AssessmentFile } | null>(null)

  const pick = (f: File | null) => {
    setFile(f)
    setFileError(f ? fileProblem(f) : null)
  }

  const upload = async () => {
    if (!file || fileError) return
    setUploading(true)
    try {
      if (await uploadFile(assessment.id, file, type)) {
        toast.success(`${file.name} uploaded.`)
        setFile(null)
        files.reload()
      }
    } catch (err) {
      console.error('Error uploading assessment file:', err)
      toast.error(getErrorMessage(err, 'Failed to upload file'))
    } finally {
      setUploading(false)
    }
  }

  const approve = async (f: AssessmentFile, approved: boolean) => {
    setBusyId(f.id)
    try {
      await setFileApproval(f.id, approved)
      toast.success(approved ? `${f.original_name} approved.` : `${f.original_name} marked as pending.`)
      files.reload()
    } catch (err) {
      console.error('Error updating attachment approval:', err)
      toast.error('Failed to update attachment approval.')
      throw err
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (f: AssessmentFile) => {
    setBusyId(f.id)
    try {
      await deleteFile(assessment.id, f.id)
      toast.success(`${f.original_name} removed.`)
      files.reload()
    } catch (err) {
      console.error('Error deleting assessment attachment:', err)
      toast.error('Failed to delete attachment.')
      throw err
    } finally {
      setBusyId(null)
    }
  }

  const list = files.data ?? []

  return (
    <>
      <DialogHeader>
        <DialogTitle>Files</DialogTitle>
        <DialogDescription>{assessment.title} · files are approved separately from the assessment.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 rounded-lg border border-solid border-border bg-muted/30 p-3">
        <span className="text-sm font-medium">Upload a question paper or document</span>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect aria-label="File type" className="w-40" value={type} onChange={(e) => setType(e.target.value as AssessmentFileType)}>
            <option value="question_paper">Question paper</option>
            <option value="other">Other</option>
          </NativeSelect>
          {file ? (
            <span className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-solid border-border bg-card pr-1 pl-3 text-sm">
              <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{file.name}</span>
              <button type="button" aria-label="Clear file" onClick={() => pick(null)} className="m-0 ml-auto flex size-7 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <label className="m-0 flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-card px-3 text-sm text-muted-foreground hover:border-primary/60">
              <Paperclip className="size-4" aria-hidden="true" /> Choose a file — JPG, PNG, WebP or PDF, up to 20 MB
              <input type="file" accept={FILE_ACCEPT} className="sr-only" aria-label="File to upload" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            </label>
          )}
          <Button onClick={upload} loading={uploading} disabled={!file || !!fileError || uploading}>
            <Upload aria-hidden="true" /> {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
        {fileError && <p className="m-0 text-sm text-destructive">{fileError}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Uploaded files</span>
        {files.loading && !files.data ? (
          <Skeleton className="h-20" />
        ) : list.length === 0 ? (
          <EmptyState icon={Paperclip} title="No files uploaded yet." className="py-4" />
        ) : (
          <ul className="m-0 max-h-[45vh] list-none divide-y divide-border overflow-y-auto rounded-lg border border-solid border-border p-0">
            {list.map((f) => {
              const pdf = f.file_type === 'pdf' || f.original_name.toLowerCase().endsWith('.pdf')
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
                  {pdf ? <FileText className="size-4 text-destructive" aria-hidden="true" /> : <ImageIcon className="size-4 text-info" aria-hidden="true" />}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <button type="button" onClick={() => onPreview(f)} className="m-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-sm font-medium text-foreground underline-offset-2 hover:underline">
                      {f.original_name}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_LABEL[f.type] ?? f.type}
                      {f.student ? ` · ${f.student.name}` : f.student_id ? ` · Student #${f.student_id}` : ''}
                      {f.uploaded_at ? ` · ${formatDateTime(f.uploaded_at)}` : ''}
                    </span>
                  </div>
                  <Badge variant={f.is_admin_approved ? 'success' : 'warning'}>{f.is_admin_approved ? 'Approved' : 'Pending'}</Badge>
                  <a href={fileUrl(f)} target="_blank" rel="noreferrer" aria-label={`Download ${f.original_name}`} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {f.is_admin_approved ? (
                        <Button size="xs" variant="ghost" disabled={busyId === f.id} onClick={() => setConfirm({ kind: 'pending', file: f })}>
                          <Undo2 aria-hidden="true" /> Mark pending
                        </Button>
                      ) : (
                        <Button size="xs" variant="ghost" className="text-success" disabled={busyId === f.id} onClick={() => void approve(f, true).catch(() => {})}>
                          <Check aria-hidden="true" /> Approve
                        </Button>
                      )}
                      <Button size="xs" variant="ghost" className="text-destructive" disabled={busyId === f.id} onClick={() => setConfirm({ kind: 'remove', file: f })} aria-label={`Remove ${f.original_name}`}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'remove' ? 'Remove this file?' : 'Mark this file as pending?'}
        description={
          confirm?.kind === 'remove' ? (
            <>
              <strong>{confirm.file.original_name}</strong> will be deleted permanently.
            </>
          ) : (
            <>
              <strong>{confirm?.file.original_name}</strong> goes back to pending until an admin approves it again.
            </>
          )
        }
        confirmLabel={confirm?.kind === 'remove' ? 'Yes, remove' : 'Yes, mark pending'}
        cancelLabel="No"
        destructive={confirm?.kind === 'remove'}
        onConfirm={() => (confirm!.kind === 'remove' ? remove(confirm!.file) : approve(confirm!.file, false))}
      />
    </>
  )
}
