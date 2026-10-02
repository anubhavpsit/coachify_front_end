import { useWatch, type Control, type FieldValues, type Path, type PathValue, type UseFormSetValue } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { TEXT_MAX } from '../schemas/activityForm'
import { searchChapters, searchTopics, type CatalogItem } from '../services/dailyActivitiesService'
import CatalogCombobox from './CatalogCombobox'

type Ref = { id: number; name: string } | null
type TopicRef = { id: number; name: string; chapter_id: number | null } | null

interface Props<T extends FieldValues> {
  control: Control<T>
  setValue: UseFormSetValue<T>
  /** Field names, e.g. `entries.0.chapter` or `chapter`. */
  names: { chapter: Path<T>; topic: Path<T>; notes: Path<T>; homework: Path<T> }
  subjectId: number | null
  disabled?: boolean
}

function Counter({ value }: { value: string }) {
  const near = value.length > TEXT_MAX * 0.9
  return (
    <span className={cn('ml-auto text-xs tabular-nums', near ? 'text-destructive' : 'text-muted-foreground')} aria-hidden={!near}>
      {value.length}/{TEXT_MAX}
    </span>
  )
}

/** Chapter → topic → class notes → homework, shared by the per-student and whole-class forms. */
export default function LessonFields<T extends FieldValues>({ control, setValue, names, subjectId, disabled }: Props<T>) {
  const chapter = useWatch({ control, name: names.chapter }) as Ref
  const topic = useWatch({ control, name: names.topic }) as TopicRef

  const pickChapter = (item: CatalogItem | null) => {
    setValue(names.chapter, (item ? { id: item.id, name: item.name } : null) as PathValue<T, Path<T>>, { shouldDirty: true })
    // A topic from another chapter no longer fits (legacy rule).
    if (topic && topic.chapter_id !== (item?.id ?? null)) setValue(names.topic, null as PathValue<T, Path<T>>, { shouldDirty: true })
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={names.chapter}
          render={({ fieldState }) => (
            <FormItem>
              <FormLabel>Chapter</FormLabel>
              <FormControl>
                <CatalogCombobox
                  value={chapter}
                  onChange={pickChapter}
                  search={(q) => searchChapters(subjectId!, q)}
                  deps={[subjectId]}
                  placeholder="Search chapters (optional)"
                  disabledHint="Select a subject first"
                  emptyText="No chapters found. Ask your coaching admin to add one."
                  disabled={disabled || !subjectId}
                  invalid={!!fieldState.error}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={names.topic}
          render={({ fieldState }) => (
            <FormItem>
              <FormLabel>Topic</FormLabel>
              <FormControl>
                <CatalogCombobox
                  value={topic}
                  onChange={(item) =>
                    setValue(names.topic, (item ? { id: item.id, name: item.name, chapter_id: item.chapter_id ?? null } : null) as PathValue<T, Path<T>>, {
                      shouldDirty: true,
                      shouldValidate: fieldState.isTouched,
                    })
                  }
                  search={(q) => searchTopics(subjectId!, chapter?.id ?? null, q)}
                  deps={[subjectId, chapter?.id]}
                  placeholder={chapter ? `Search topics in ${chapter.name}` : 'Search topics'}
                  disabledHint="Select a subject first"
                  emptyText="No topics found."
                  disabled={disabled || !subjectId}
                  invalid={!!fieldState.error}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={names.notes}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline gap-2">
                <FormLabel>Class notes</FormLabel>
                <Counter value={(field.value as string) ?? ''} />
              </div>
              <FormControl>
                <Textarea rows={3} maxLength={TEXT_MAX} placeholder="What did you teach? Key points covered in class." disabled={disabled} {...field} />
              </FormControl>
              <FormDescription>Pick a topic or write a few words here — at least one is needed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={names.homework}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline gap-2">
                <FormLabel>Homework</FormLabel>
                <Counter value={(field.value as string) ?? ''} />
              </div>
              <FormControl>
                <Textarea rows={3} maxLength={TEXT_MAX} placeholder="e.g. Complete exercises 1–5 on page 48. (optional)" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
