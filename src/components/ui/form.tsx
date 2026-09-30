import * as React from 'react'
import { Label as LabelPrimitive, Slot as SlotPrimitive } from 'radix-ui'
import { AnimatePresence, m, useAnimationControls } from 'motion/react'
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { shake, slideUp } from '@/animations'
import { cn } from '@/lib/utils'
import { Label } from './label'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName }

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

function FormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>,
) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

type FormItemContextValue = { id: string }
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)
  if (!fieldContext.name) throw new Error('useFormField should be used within <FormField>')
  const { id } = itemContext
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

/** Field wrapper. Shakes once when a submit attempt leaves this field invalid. */
function FormItem({ className, children, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <ShakeOnInvalidSubmit className={cn('tw:grid tw:content-start tw:gap-2', className)} {...props}>
        {children}
      </ShakeOnInvalidSubmit>
    </FormItemContext.Provider>
  )
}

function ShakeOnInvalidSubmit({ className, children, ...props }: React.ComponentProps<'div'>) {
  const fieldContext = React.useContext(FormFieldContext)
  const { submitCount, errors } = useFormState({ name: fieldContext.name })
  const controls = useAnimationControls()
  const hasError = !!fieldContext.name && !!errors[fieldContext.name]
  React.useEffect(() => {
    if (submitCount > 0 && hasError) void controls.start('shake')
    // only on a new submit attempt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount])
  return (
    <m.div
      data-slot="form-item"
      variants={shake}
      initial="idle"
      animate={controls}
      className={className}
      {...(props as React.ComponentProps<typeof m.div>)}
    >
      {children}
    </m.div>
  )
}

function FormLabel({ className, required, children, ...props }: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  const { error, formItemId } = useFormField()
  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('tw:data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    >
      {children}
      {required && (
        <span className="tw:text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </Label>
  )
}

function FormControl(props: React.ComponentProps<typeof SlotPrimitive.Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  return (
    <SlotPrimitive.Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField()
  return <p data-slot="form-description" id={formDescriptionId} className={cn('tw:m-0 tw:text-xs tw:text-muted-foreground', className)} {...props} />
}

/** Inline field error. Always in the DOM target for aria-describedby; content animates in. */
function FormMessage({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? '') : children
  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      aria-live="polite"
      className={cn('tw:m-0 tw:text-xs tw:font-medium tw:text-destructive tw:empty:hidden', className)}
      {...props}
    >
      <AnimatePresence initial={false} mode="wait">
        {body ? (
          <m.span key={String(body)} className="tw:block" variants={slideUp} initial="hidden" animate="visible" exit="exit">
            {body}
          </m.span>
        ) : null}
      </AnimatePresence>
    </p>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField }
