import type { ReactNode } from 'react'
import { m } from 'motion/react'
import { fadeIn } from '@/animations'

/** Split auth layout: brand panel (lg+) and a centred form column. */
export default function AuthLayout({ brandName, children }: { brandName: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <m.section
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary-foreground/10" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-primary-foreground/5" />
        <div className="relative text-xl font-bold text-primary-foreground">{brandName}</div>
        <img src="/assets/images/auth/auth-img.png" alt="" className="relative mx-auto max-h-[26rem] w-auto max-w-full object-contain" />
        <p className="relative m-0 max-w-sm text-lg font-medium text-primary-foreground/90">
          Classes, attendance, assessments and progress — all in one place.
        </p>
      </m.section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[28rem]">{children}</div>
      </section>
    </main>
  )
}
