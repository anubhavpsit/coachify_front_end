import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import SettingsForm, { Field } from '../components/SettingsForm'

const CITIES = ['Washington', 'Dhaka', 'Lahor', 'Panjab']

/** Static page (D2): same fields as before, nothing is saved. */
export default function CompanyPage() {
  return (
    <SettingsForm title="Company">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full Name" required>
          <Input id="name" type="text" placeholder="Enter Full Name" />
        </Field>
        <Field id="email" label="Email" required>
          <Input id="email" type="email" placeholder="Enter email address" />
        </Field>
        <Field id="number" label="Phone Number">
          <Input id="number" type="tel" placeholder="Enter phone number" />
        </Field>
        <Field id="website" label="Website">
          <Input id="website" type="url" placeholder="Website URL" />
        </Field>
        <Field id="country" label="Country" required>
          <NativeSelect id="country" defaultValue="">
            <option value="" disabled>
              Select Country
            </option>
            {['USA', 'Bangladesh', 'Pakistan', 'India', 'Canada'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="city" label="City" required>
          <NativeSelect id="city" defaultValue="">
            <option value="" disabled>
              Select City
            </option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="state" label="State" required>
          <NativeSelect id="state" defaultValue="">
            <option value="" disabled>
              Select State
            </option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="zip" label="Zip Code" required>
          <Input id="zip" type="text" placeholder="Zip Code" />
        </Field>
        <Field id="address" label="Address" required wide>
          <Input id="address" type="text" placeholder="Enter Your Address" />
        </Field>
      </div>
    </SettingsForm>
  )
}
