import { useId } from 'react'
import { Textarea } from '@/components/ui/textarea'
import SettingsForm from '../components/SettingsForm'

function AlertSection({ title, id, defaultOn }: { title: string; id: string; defaultOn?: boolean }) {
  const textId = useId()
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-solid border-border p-4">
      <h2 className="m-0 text-sm! font-semibold text-foreground">{title}</h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={textId} className="m-0 text-sm text-muted-foreground">
          Admin New Order Message
        </label>
        <label className="m-0 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <input id={id} type="checkbox" role="switch" defaultChecked={defaultOn} className="size-4 accent-primary" />
          On
        </label>
      </div>
      <Textarea id={textId} rows={3} placeholder="You have a new order." />
    </section>
  )
}

/** Static page (D2): same fields as before, nothing is saved. */
export default function NotificationAlertPage() {
  return (
    <SettingsForm title="Notification Alert">
      <AlertSection title="Mail Notification Messages" id="mailAdminNewOrder" defaultOn />
      <AlertSection title="SMS Notification Messages" id="smsAdminNewOrder" />
      <AlertSection title="Push Notification Messages" id="pushAdminNewOrder" />
    </SettingsForm>
  )
}
