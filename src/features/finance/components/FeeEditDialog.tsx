import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import FormDialog from '@/components/common/FormDialog'
import { applyServerErrors } from '@/lib/forms'
import { FEE_FIELDS, feeDefaults, feeSchema, toFeePayload, type FeeValues } from '../schemas/feeForm'
import { updateFee, type FeeStudent } from '../services/feesService'
import FeeFields from './FeeFields'

export type EditableFee = {
  id: number
  student_id: number
  from_date: string
  to_date: string
  amount: number | string
  payment_mode: string
  submitted_on: string | null
  notes?: string | null
}

const dateOnly = (v?: string | null) => (v ? v.slice(0, 10) : '')

/** Correct a mistaken fee entry (PUT /student-fees/{id}). Mounted only for coaching_admin (Q3). */
export default function FeeEditDialog({ fee, students, onClose, onSaved }: { fee: EditableFee | null; students: FeeStudent[]; onClose: () => void; onSaved: () => void }) {
  const form = useForm<FeeValues>({ resolver: zodResolver(feeSchema), defaultValues: feeDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fee) return
    form.reset({
      student_id: fee.student_id,
      from_date: dateOnly(fee.from_date),
      to_date: dateOnly(fee.to_date),
      amount: String(Number(fee.amount)),
      payment_mode: (fee.payment_mode || 'cash') as FeeValues['payment_mode'],
      submitted_on: dateOnly(fee.submitted_on) || feeDefaults().submitted_on,
      notes: fee.notes ?? '',
    })
  }, [fee, form])
  const [lastFee, setLastFee] = useState(fee)
  if (fee !== lastFee) {
    setLastFee(fee)
    setError(null)
  }

  const submit = async (values: FeeValues) => {
    if (!fee) return
    setError(null)
    try {
      await updateFee(fee.id, toFeePayload(values))
      toast.success('Fee entry updated.')
      onSaved()
    } catch (err) {
      setError(applyServerErrors(err, form.setError, FEE_FIELDS, { fallback: 'Unable to update fee.' }))
    }
  }

  return (
    <FormDialog
      open={fee !== null}
      onClose={onClose}
      title="Edit Fee Entry"
      description="Correct a mistaken entry. Change the student if it was recorded against the wrong one."
      form={form}
      onSubmit={submit}
      submitLabel="Save changes"
      error={error}
      className="tw:sm:max-w-2xl"
    >
      <FeeFields control={form.control} students={students} className="tw:lg:grid-cols-2" />
    </FormDialog>
  )
}
