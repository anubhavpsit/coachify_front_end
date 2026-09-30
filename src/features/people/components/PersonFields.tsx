import type { Control } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import PasswordInput from '@/components/common/PasswordInput'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { todayInputValue, type PersonBase } from '../schemas/person'
import PasswordStrength from './PasswordStrength'

interface Props {
  /** Pass `form.control as unknown as Control<PersonBase>` from a form whose values extend PersonBase. */
  control: Control<PersonBase>
  mode: 'create' | 'edit'
  /** Hide DOB/gender (not every form has them). */
  showDob?: boolean
  showGender?: boolean
  /** Rendered after email (e.g. phone) */
  afterEmail?: React.ReactNode
}

/** Name / Email / Password (+ strength) / DOB / Gender — shared by the people forms. */
export default function PersonFields({ control, mode, showDob = true, showGender = true, afterEmail }: Props) {
  const pw = useWatch({ control, name: 'password' })
  return (
    <>
      <div className="tw:grid tw:gap-5 tw:sm:grid-cols-2">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input autoComplete="off" placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Email</FormLabel>
              <FormControl>
                <Input type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {afterEmail}
      <FormField
        control={control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel required={mode === 'create'}>Password</FormLabel>
            <FormControl>
              <PasswordInput autoComplete="new-password" placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'At least 8 characters'} {...field} />
            </FormControl>
            <PasswordStrength value={pw} />
            {mode === 'edit' && <FormDescription>Leave blank to keep the current password.</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
      {(showDob || showGender) && (
        <div className="tw:grid tw:gap-5 tw:sm:grid-cols-2">
          {showDob && (
            <FormField
              control={control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" max={todayInputValue()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {showGender && (
            <FormField
              control={control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Gender</FormLabel>
                  <FormControl>
                    <NativeSelect {...field}>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </>
  )
}
