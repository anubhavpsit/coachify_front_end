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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Enquiry Details
            {enquiry && <Badge variant={enquiry.status === 'active' ? 'success' : 'secondary'} className="capitalize">{enquiry.status}</Badge>}
          </DialogTitle>
          <DialogDescription>Contact history and follow-ups for this enquiry.</DialogDescription>
        </DialogHeader>
        {enquiry && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className="flex flex-col gap-4">
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {info
                  .filter(([, v]) => !!v)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="m-0 break-words text-foreground">
                        {k === 'Contact' ? (
                          <a href={`tel:${v}`} className="text-primary">
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
                <div className="rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap">{enquiry.description}</div>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-3 rounded-lg border border-solid border-border p-3 sm:grid-cols-2">
                  <div className="text-sm font-semibold sm:col-span-2">Log a communication</div>
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
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="What was discussed?" disabled={submitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-2">
                    <Button type="submit" size="sm" loading={submitting}>
                      {submitting ? 'Saving...' : 'Save Communication'}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold">History</div>
                {logs.length === 0 ? (
                  <EmptyState icon={MessageSquareText} title="No communications logged yet." className="py-4" />
                ) : (
                  <ol className="m-0 max-h-64 list-none overflow-y-auto border-0 border-l border-solid border-border p-0 pl-5">
                    <AnimatePresence initial={false}>
                      {logs.map((log) => {
                        const ch = CHANNEL[log.channel] ?? CHANNEL.other
                        return (
                          <m.li key={log.id} variants={slideUp} initial="hidden" animate="visible" className="relative pb-3 last:pb-0">
                            <span className="absolute top-0.5 -left-[1.95rem] flex size-6 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground ring-4 ring-card">
                              <ch.icon className="size-3" aria-hidden="true" />
                            </span>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium">{ch.label}</span>
                              <span className="text-xs text-muted-foreground">{formatDateTime(log.communicated_at || log.created_at)}</span>
                            </div>
                            {log.notes && <p className="m-0 text-sm text-muted-foreground">{log.notes}</p>}
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
