import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, ImageUp } from 'lucide-react'
import { toast } from 'sonner'
import FormDialog from '@/components/common/FormDialog'
import RichTextEditor from '@/components/common/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/apiClient'
import { applyServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { DIFFICULTIES, GRADES, IMAGE_ACCEPT, imageProblem, QUESTION_TYPES, questionDefaults, questionSchema, SUBJECTIVE_TYPES, toQuestionPayload, type QuestionValues } from '../schemas/questionForm'
import { createQuestion, updateQuestion, uploadQuestionImage, type Question } from '../services/contentLibraryService'

interface Props {
  open: boolean
  onClose: () => void
  topicId: string
  /** null = create */
  question: Question | null
  presetGrade?: string
  onSaved: () => void
}

const OPTIONS = [
  ['optionA', 'a', 'A'],
  ['optionB', 'b', 'B'],
  ['optionC', 'c', 'C'],
  ['optionD', 'd', 'D'],
] as const

// API field → form field, for 422 mapping.
const FIELD_MAP = {
  question_type: 'questionType',
  question_html: 'questionHtml',
  solution_html: 'solutionHtml',
  option_a: 'optionA',
  option_b: 'optionB',
  option_c: 'optionC',
  option_d: 'optionD',
  correct_answer: 'correctAnswer',
  answer_key: 'answerKey',
  needs_image: 'needsImage',
  image_note: 'imageNote',
}

export default function QuestionFormDialog({ open, onClose, topicId, question, presetGrade = '', onSaved }: Props) {
  const form = useForm<QuestionValues>({ resolver: zodResolver(questionSchema), defaultValues: questionDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)
  const [type, correct, needsImage] = useWatch({ control: form.control, name: ['questionType', 'correctAnswer', 'needsImage'] })
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) form.reset(questionDefaults(question, presetGrade))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the dialog opens
  }, [open, question])

  const close = () => {
    setError(null)
    setUploadedUrl('')
    onClose()
  }

  const submit = async (v: QuestionValues) => {
    setError(null)
    try {
      if (question) await updateQuestion(topicId, question.id, toQuestionPayload(v))
      else await createQuestion(topicId, toQuestionPayload(v))
      toast.success(question ? 'Question updated.' : 'Question added.')
      onSaved()
      close()
    } catch (err) {
      console.error(question ? 'Error updating question:' : 'Error creating question:', err)
      setError(applyServerErrors(err, form.setError, Object.values(FIELD_MAP).concat(['grade', 'difficulty']), { fieldMap: FIELD_MAP, fallback: question ? 'Failed to update question.' : 'Failed to create question.' }))
    }
  }

  const upload = async (file: File) => {
    const problem = imageProblem(file)
    if (problem) return toast.error(problem)
    setUploading(true)
    try {
      setUploadedUrl(await uploadQuestionImage(topicId, question!.id, file))
      setCopied(false)
    } catch (err) {
      console.error('Error uploading image:', err)
      toast.error(getErrorMessage(err, 'Failed to upload image.'))
    } finally {
      setUploading(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(uploadedUrl)
      setCopied(true)
    } catch {
      toast.error('Copy failed — select the link and copy it manually.')
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={question ? 'Edit Question' : 'Add Question'}
      form={form}
      onSubmit={submit}
      submitLabel={question ? 'Update' : 'Save'}
      submittingLabel={question ? 'Updating...' : 'Saving...'}
      error={error}
      className="tw:sm:max-w-3xl"
    >
      <div className="tw:grid tw:gap-4 tw:sm:grid-cols-3">
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Grade</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={String(g)}>
                      Grade {g}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">None</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d[0].toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="questionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question type</FormLabel>
              <FormControl>
                <NativeSelect
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    form.setValue('correctAnswer', '') // legacy reset
                    form.clearErrors(['optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'answerKey'])
                  }}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="questionHtml"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel required>Question</FormLabel>
            <FormControl>
              <RichTextEditor value={field.value} onChange={(v) => field.onChange(v)} aria-invalid={!!fieldState.error} label="Question" placeholder="Type the question…" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {type === 'mcq' && (
        <fieldset className="tw:m-0 tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-3">
          <legend className="tw:float-none tw:m-0 tw:w-auto tw:px-1 tw:text-sm tw:font-medium">Options — tick the correct one</legend>
          <div role="radiogroup" aria-label="Correct option" className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
            {OPTIONS.map(([name, key, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <div className="tw:flex tw:items-center tw:gap-2">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={correct === key}
                        aria-label={`Option ${label} is correct`}
                        onClick={() => form.setValue('correctAnswer', key, { shouldDirty: true, shouldValidate: true })}
                        className={cn(
                          'tw:m-0 tw:flex tw:size-9 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-full tw:border tw:border-solid tw:text-sm tw:font-bold tw:transition-colors tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
                          correct === key ? 'tw:border-success tw:bg-success tw:text-success-foreground' : 'tw:border-input tw:bg-transparent tw:text-muted-foreground tw:hover:bg-muted',
                        )}
                      >
                        {correct === key ? <Check className="tw:size-4" aria-hidden="true" /> : label}
                      </button>
                      <FormControl>
                        <Input placeholder={`Option ${label}`} maxLength={255} {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormField control={form.control} name="correctAnswer" render={() => <FormMessage />} />
        </fieldset>
      )}

      {type === 'true_false' && (
        <FormField
          control={form.control}
          name="correctAnswer"
          render={() => (
            <FormItem>
              <FormLabel required>Correct answer</FormLabel>
              <div role="radiogroup" aria-label="Correct answer" className="tw:flex tw:gap-2">
                {(['true', 'false'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={correct === v}
                    onClick={() => form.setValue('correctAnswer', v, { shouldDirty: true, shouldValidate: true })}
                    className={cn(
                      'tw:m-0 tw:cursor-pointer tw:rounded-full tw:border tw:border-solid tw:px-5 tw:py-1.5 tw:text-sm tw:font-medium tw:capitalize tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
                      correct === v ? 'tw:border-success tw:bg-success tw:text-success-foreground' : 'tw:border-input tw:bg-transparent tw:hover:bg-muted',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {SUBJECTIVE_TYPES.includes(type) && (
        <FormField
          control={form.control}
          name="answerKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Answer key</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="The expected answer, for whoever checks it." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="solutionHtml"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Solution</FormLabel>
            <FormControl>
              <RichTextEditor value={field.value} onChange={(v) => field.onChange(v)} label="Solution" placeholder="Step-by-step solution (optional)." />
            </FormControl>
            <FormDescription>Hidden from students until the unlock delay passes.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="tw:grid tw:items-start tw:gap-4 tw:sm:grid-cols-[auto_1fr]">
        <FormField
          control={form.control}
          name="needsImage"
          render={({ field }) => (
            <FormItem className="tw:flex tw:items-center tw:gap-2 tw:pt-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              </FormControl>
              <FormLabel className="tw:m-0">Needs an image</FormLabel>
            </FormItem>
          )}
        />
        {needsImage && (
          <FormField
            control={form.control}
            name="imageNote"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="What image is needed?" aria-label="Image note" maxLength={255} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {question ? (
        <div className="tw:flex tw:flex-col tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-border tw:bg-muted/30 tw:p-3">
          <span className="tw:text-sm tw:font-medium">Upload an image</span>
          <label className="tw:m-0 tw:flex tw:h-10 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-dashed tw:border-input tw:bg-card tw:px-3 tw:text-sm tw:text-muted-foreground tw:hover:border-primary/60">
            <ImageUp className="tw:size-4" aria-hidden="true" /> {uploading ? 'Uploading…' : 'Choose an image — JPG, PNG or WebP, up to 5 MB'}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              className="tw:sr-only"
              disabled={uploading}
              aria-label="Upload image"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
                e.target.value = ''
              }}
            />
          </label>
          {uploadedUrl && (
            <div className="tw:flex tw:flex-col tw:gap-1">
              <span className="tw:text-xs tw:text-muted-foreground">Uploaded — copy this link into the question or solution:</span>
              <div className="tw:flex tw:gap-2">
                <Input readOnly value={uploadedUrl} aria-label="Uploaded image link" onFocus={(e) => e.target.select()} className="tw:h-9" />
                <Button type="button" size="sm" variant="outline" onClick={copy}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">Image upload becomes available once the question is first saved.</p>
      )}
    </FormDialog>
  )
}
