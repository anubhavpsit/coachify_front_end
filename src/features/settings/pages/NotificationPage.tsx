import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import SettingsForm, { Field } from '../components/SettingsForm'

const FIELDS: [string, string][] = [
  ['firebaseSecretKey', 'Firebase secret key'],
  ['firebasePublicVapidKey', 'Firebase public vapid key (key pair)'],
  ['firebaseAPIKey', 'Firebase API Key'],
  ['firebaseAuthDomain', 'Firebase AUTH Domain'],
  ['firebaseProjectID', 'Firebase Project ID'],
  ['firebaseStorageBucket', 'Firebase Storage Bucket'],
  ['firebaseMessageSenderID', 'Firebase Message Sender ID'],
  ['firebaseAppID', 'Firebase App ID'],
]

/** Static page (D2): same fields as before, nothing is saved. */
export default function NotificationPage() {
  return (
    <SettingsForm title="Notification">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map(([id, label]) => (
          <Field key={id} id={id} label={label}>
            <Input id={id} type="text" placeholder={label} />
          </Field>
        ))}
        <Field id="firebaseNotes" label="Notes" wide>
          <Textarea id="firebaseNotes" rows={3} placeholder="Any implementation notes for your team..." />
        </Field>
      </div>
    </SettingsForm>
  )
}
