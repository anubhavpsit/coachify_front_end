import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, MessageCircle, MessageSquareText, MoreHorizontal, type LucideIcon } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { toast } from 'sonner'
import { slideUp } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { applyServerErrors } from '@/lib/forms'
import { formatDateTime } from '@/utils/date'
import { communicationDefaults, communicationSchema, toCommunicationPayload, type CommunicationValues } from '../schemas/enquiry'
import { addCommunication, type Channel, type EnquiryDetail } from '../services/enquiriesService'

const CHANNEL: Record<Channel, { label: string; icon: LucideIcon }> = {
  email: { label: 'Email', icon: Mail },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  sms: { label: 'SMS', icon: MessageSquareText },
  other: { label: 'Other', icon: MoreHorizontal },
}

interface Props {
  enquiry: EnquiryDetail | null
  onClose: () => void
  onUpdated: (detail: EnquiryDetail) => void
}

export default function EnquiryDetailDialog({ enquiry, onClose, onUpdated }: Props) {
  const form = useForm<CommunicationValues>({ resolver: zodResolver(communicationSchema), defaultValues: communicationDefaults() })
  useEffect(() => {
    if (enquiry) form.reset(communicationDefaults())
    // reset only when a different enquiry is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry?.id, form])

  const submit = async (values: CommunicationValues) => {
    if (!enquiry) return
    try {
      const updated = await addCommunication(enquiry.id, toCommunicationPayload(values))
      if (!updated) return
      onUpdated(updated)
      form.reset(communicationDefaults())
      toast.success('Communication logged.')
    } catch (err) {
      console.error('Error saving communication log:', err)
      const general = applyServerErrors(err, form.setError, ['channel', 'notes', 'communicated_at'], { fallback: 'Failed to save communication log.' })
      if (general) toast.error(general)
    }
  }

  const info: Array<[string, string | null | undefined]> = enquiry
    ? [
        ['Type', enquiry.enquiry_type === 'teacher' ? 'Teacher' : 'Student'],
        ['Name', enquiry.name],
        ['Contact', enquiry.contact_number],
        ['Email', enquiry.email],
        ['School', enquiry.school_name],
        ['Class / Grade', enquiry.class_grade],
        ['Subjects', enquiry.subjects_interested],
        ['Created', formatDateTime(enquiry.created_at)],
      ]
    : []
  const logs = enquiry?.communications ?? []
  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={!!enquiry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="tw:sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="tw:flex tw:items-center tw:gap-2">
            Enquiry Details
            {enquiry && <Badge variant={enquiry.status === 'active' ? 'success' : 'secondary'} className="tw:capitalize">{enquiry.status}</Badge>}
          </DialogTitle>
          <DialogDescription>Contact history and follow-ups for this enquiry.</DialogDescription>
        </DialogHeader>
        {enquiry && (
          <div className="tw:grid tw:gap-6 tw:md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className="tw:flex tw:flex-col tw:gap-4">
              <dl className="tw:m-0 tw:grid tw:grid-cols-[auto_1fr] tw:gap-x-4 tw:gap-y-2 tw:text-sm">
                {info
                  .filter(([, v]) => !!v)
                  .map(([k, v]) => (
                    <div key={k} className="tw:contents">
                      <dt className="tw:text-muted-foreground">{k}</dt>
                      <dd className="tw:m-0 tw:break-words tw:text-foreground">
                        {k === 'Contact' ? (
                          <a href={`tel:${v}`} className="tw:text-primary">
                            {v}
                          </a>
                        ) : (
                          v
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
              {enquiry.description && (
                <div className="tw:rounded-lg tw:bg-muted/60 tw:p-3 tw:text-sm tw:whitespace-pre-wrap">{enquiry.description}</div>
              )}
            </section>

            <section className="tw:flex tw:flex-col tw:gap-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="tw:grid tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-3 tw:sm:grid-cols-2">
                  <div className="tw:text-sm tw:font-semibold tw:sm:col-span-2">Log a communication</div>
                  <FormField
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Channel</FormLabel>
                        <FormControl>
                          <NativeSelect disabled={submitting} {...field}>
                            {(Object.keys(CHANNEL) as Channel[]).map((c) => (
                              <option key={c} value={c}>
                                {CHANNEL[c].label}
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
                    name="communicated_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" disabled={submitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="tw:sm:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="What was discussed?" disabled={submitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="tw:sm:col-span-2">
                    <Button type="submit" size="sm" loading={submitting}>
                      {submitting ? 'Saving...' : 'Save Communication'}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="tw:flex tw:flex-col tw:gap-2">
                <div className="tw:text-sm tw:font-semibold">History</div>
                {logs.length === 0 ? (
                  <EmptyState icon={MessageSquareText} title="No communications logged yet." className="tw:py-4" />
                ) : (
                  <ol className="tw:m-0 tw:max-h-64 tw:list-none tw:overflow-y-auto tw:border-0 tw:border-l tw:border-solid tw:border-border tw:p-0 tw:pl-5">
                    <AnimatePresence initial={false}>
                      {logs.map((log) => {
                        const ch = CHANNEL[log.channel] ?? CHANNEL.other
                        return (
                          <m.li key={log.id} variants={slideUp} initial="hidden" animate="visible" className="tw:relative tw:pb-3 tw:last:pb-0">
                            <span className="tw:absolute tw:top-0.5 tw:-left-[1.95rem] tw:flex tw:size-6 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary-soft tw:text-primary-soft-foreground tw:ring-4 tw:ring-card">
                              <ch.icon className="tw:size-3" aria-hidden="true" />
                            </span>
                            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-sm">
                              <span className="tw:font-medium">{ch.label}</span>
                              <span className="tw:text-xs tw:text-muted-foreground">{formatDateTime(log.communicated_at || log.created_at)}</span>
                            </div>
                            {log.notes && <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{log.notes}</p>}
                          </m.li>
                        )
                      })}
                    </AnimatePresence>
                  </ol>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
