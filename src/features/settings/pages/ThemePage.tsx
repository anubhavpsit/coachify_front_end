import { NativeSelect } from '@/components/ui/native-select'
import { Badge } from '@/components/ui/badge'
import SettingsForm, { Field } from '../components/SettingsForm'

/** Static page (D2): same fields as before, nothing is saved. */
export default function ThemePage() {
  return (
    <SettingsForm title="Theme">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="themeMode" label="Theme mode">
          <NativeSelect id="themeMode" defaultValue="light">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </NativeSelect>
        </Field>
        <Field id="themeDirection" label="Page direction">
          <NativeSelect id="themeDirection" defaultValue="ltr">
            <option value="ltr">LTR</option>
            <option value="rtl">RTL</option>
          </NativeSelect>
        </Field>
        <Field id="themeColor" label="Primary color">
          <NativeSelect id="themeColor" defaultValue="blue">
            {['Blue', 'Red', 'Green', 'Yellow', 'Cyan', 'Violet'].map((c) => (
              <option key={c} value={c.toLowerCase()}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Preview</span>
          <div id="themePreview" className="flex items-center justify-between rounded-xl border border-solid border-border p-4">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-full bg-primary" aria-hidden="true" />
              <div>
                <p className="m-0 text-sm font-semibold">Coachify</p>
                <p className="m-0 text-xs text-muted-foreground">Colors &amp; layout preview</p>
              </div>
            </div>
            <Badge variant="soft">Example</Badge>
          </div>
        </div>
      </div>
    </SettingsForm>
  )
}
