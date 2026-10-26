import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'
import FormDialog from '@/components/common/FormDialog'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { MAX_QUESTIONS, MIN_QUESTIONS, toAutoPick, toMeta, WORKSHEET_FIELDS, worksheetDefaults, worksheetSchema, type WorksheetValues } from '../schemas/worksheetForm'
import { createWorksheet, fetchTopicOptions, gradeFromClassName, QUESTION_TYPES, updateWorksheet, type Worksheet, type WithNote } from '../services/worksheetsService'

interface Props {
  open: boolean
  /** null = create */
  worksheet: Worksheet | null
  subjects: { id: number; subject: string }[]
  classes: { id: number; name: string }[]
  loading: boolean
  onClose: () => void
  onSaved: (result: WithNote<Worksheet>, mode: 'create' | 'edit') => void
}

export default function WorksheetFormDialog({ open, worksheet, subjects, classes, loading, onClose, onSaved }: Props) {
  const mode = worksheet ? 'edit' : 'create'
  const form = useForm<WorksheetValues>({ resolver: zodResolver(worksheetSchema), defaultValues: worksheetDefaults(worksheet), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)
  const [topicSearch, setTopicSearch] = useState('')
  const [subjectId, classId, topicIds] = useWatch({ control: form.control, name: ['subject_id', 'class_id', 'topic_ids'] })

  useEffect(() => {
    if (open) form.reset(worksheetDefaults(worksheet))
  }, [open, worksheet, form])
  // Fresh error / topic filter each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setError(null)
      setTopicSearch('')
    }
  }

  const grade = gradeFromClassName(classes.find((c) => String(c.id) === classId)?.name)
  const topics = useAsync(() => (subjectId ? fetchTopicOptions(Number(subjectId), grade) : Promise.resolve([])), [subjectId, grade], { enabled: open })
  const shownTopics = useMemo(() => {
    const term = topicSearch.trim().toLowerCase()
    return (topics.data ?? []).filter((t) => !term || t.name.toLowerCase().includes(term) || (t.chapter ?? '').toLowerCase().includes(term))
  }, [topics.data, topicSearch])
  const poolSize = (topics.data ?? []).filter((t) => topicIds.includes(t.id)).reduce((s, t) => s + t.questions_count, 0)

  const submit = async (v: WorksheetValues) => {
    setError(null)
    try {
      const result =
        mode === 'create'
          ? await createWorksheet({ ...toMeta(v), subject_id: Number(v.subject_id) }, toAutoPick(v))
          : { data: await updateWorksheet(worksheet!.id, toMeta(v)), note: null }
      onSaved(result, mode)
      onClose()
    } catch (err) {
      setError(applyServerErrors(err, form.setError, WORKSHEET_FIELDS, { fallback: 'Failed to save the worksheet.' }))
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New worksheet' : 'Edit worksheet details'}
      description={
        mode === 'create'
          ? `Choose the topics; at least ${MIN_QUESTIONS} questions are picked from the question bank — newest and not-recently-used first, in shuffled order. You can change them afterwards.`
          : 'Questions are edited separately.'
      }
      form={form}
      onSubmit={submit}
      submitLabel={mode === 'create' ? 'Create worksheet' : 'Save'}
      submittingLabel="Saving…"
      error={error}
      className="sm:max-w-2xl"
    >
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Title</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Friction — practice sheet 1" autoComplete="off" maxLength={150} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="subject_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Subject</FormLabel>
              <FormControl>
                <NativeSelect
                  {...field}
                  disabled={loading || mode === 'edit'}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    form.setValue('topic_ids', [])
                  }}
                >
                  <option value="">{loading ? 'Loading…' : 'Select subject'}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.subject}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              {mode === 'edit' && <FormDescription>The subject can&apos;t be changed.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="class_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class</FormLabel>
              <FormControl>
                <NativeSelect {...field} disabled={loading}>
                  <option value="">Any class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormDescription>Only questions for this class level are used.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="topic_ids"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Topics</FormLabel>
            {!subjectId ? (
              <p className="m-0 text-sm text-muted-foreground">Select a subject first.</p>
            ) : topics.loading ? (
              <Skeleton className="h-24" />
            ) : (topics.data ?? []).length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">This subject has no topics in the library yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input className="h-9 pl-9" placeholder="Filter topics…" aria-label="Filter topics" value={topicSearch} onChange={(e) => setTopicSearch(e.target.value)} />
                </div>
                <ul role="group" aria-label="Topics" className="m-0 max-h-52 list-none divide-y divide-border overflow-y-auto rounded-md border border-solid border-border p-0">
                  {shownTopics.map((t) => {
                    const checked = field.value.includes(t.id)
                    const id = `ws-topic-${t.id}`
                    return (
                      <li key={t.id}>
                        <label htmlFor={id} className="m-0 flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                          <Checkbox id={id} checked={checked} onCheckedChange={() => field.onChange(checked ? field.value.filter((x) => x !== t.id) : [...field.value, t.id])} />
                          <span className="min-w-0 flex-1">
                            {t.name}
                            {t.chapter && <span className="text-xs text-muted-foreground"> · {t.chapter}</span>}
                          </span>
                          <span className={cn('text-xs tabular-nums', t.questions_count ? 'text-muted-foreground' : 'text-warning')}>
                            {t.questions_count} {t.questions_count === 1 ? 'question' : 'questions'}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                <span className="text-xs text-muted-foreground">
                  {field.value.length} selected · {poolSize} {poolSize === 1 ? 'question' : 'questions'} available{grade ? ` for class ${grade}` : ''}
                </span>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Instructions for students</FormLabel>
            <FormControl>
              <Textarea rows={2} maxLength={2000} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="layout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Layout</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="standard">Standard</option>
                  <option value="compact">Compact (saves paper)</option>
                </NativeSelect>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="show_marks"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 pt-6">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="m-0">Show marks on the sheet</FormLabel>
            </FormItem>
          )}
        />
      </div>

      {mode === 'create' && (
        <fieldset className="m-0 flex flex-col gap-3 rounded-lg border border-solid border-border p-3">
          <legend className="px-1 text-sm font-semibold">Questions</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="auto_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of questions</FormLabel>
                  <FormControl>
                    <Input type="number" min={MIN_QUESTIONS} max={MAX_QUESTIONS} value={Number.isNaN(field.value) ? '' : field.value} onChange={(e) => field.onChange(e.target.valueAsNumber)} onBlur={field.onBlur} />
                  </FormControl>
                  <FormDescription>
                    {MIN_QUESTIONS}–{MAX_QUESTIONS}. {poolSize < field.value && topicIds.length > 0 ? `Only ${poolSize} available for these topics — add more topics.` : ''}
                  </FormDescription>
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
                      <option value="mix">Mix (30% easy · 50% medium · 20% hard)</option>
                      <option value="easy">Easy only</option>
                      <option value="medium">Medium only</option>
                      <option value="hard">Hard only</option>
                    </NativeSelect>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="types"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question types</FormLabel>
                <div role="group" aria-label="Question types" className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((t) => {
                    const checked = field.value.includes(t.value)
                    const id = `ws-type-${t.value}`
                    return (
                      <label key={t.value} htmlFor={id} className="m-0 flex cursor-pointer items-center gap-2 rounded-full border border-solid border-input px-3 py-1.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                        <Checkbox id={id} checked={checked} onCheckedChange={() => field.onChange(checked ? field.value.filter((x) => x !== t.value) : [...field.value, t.value])} />
                        {t.label}
                      </label>
                    )
                  })}
                </div>
                <FormDescription>None ticked = any type.</FormDescription>
              </FormItem>
            )}
          />
        </fieldset>
      )}
    </FormDialog>
  )
}
