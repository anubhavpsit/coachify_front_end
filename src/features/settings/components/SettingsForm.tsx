import type { FormEvent, ReactNode } from 'react'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Shell for the static settings pages (ported as-is, decision D2): the forms
 * don't call an API — Save only prevents the submit, Reset resets the inputs.
 */
export default function SettingsForm({ title, children }: { title: string; children: ReactNode }) {
  const submit = (e: FormEvent<HTMLFormElement>) => e.preventDefault()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={`Settings - ${title}`} className="mb-0" />
      <Card>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-5">
            {children}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button type="reset" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive-soft">
                Reset
              </Button>
              <Button type="submit">Save Change</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function Field({ id, label, required, children, wide }: { id: string; label: string; required?: boolean; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'flex flex-col gap-2 sm:col-span-2' : 'flex flex-col gap-2'}>
      <label htmlFor={id} className="m-0 text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}
