import type { ReactNode } from 'react'
import { m } from 'motion/react'
import { fadeIn } from '@/animations'

/** Split auth layout: brand panel (lg+) and a centred form column. */
export default function AuthLayout({ brandName, children }: { brandName: string; children: ReactNode }) {
  return (
    <main className="tw:grid tw:min-h-screen tw:bg-background tw:lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <m.section
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        aria-hidden="true"
        className="tw:relative tw:hidden tw:overflow-hidden tw:bg-primary tw:lg:flex tw:lg:flex-col tw:lg:justify-between tw:lg:p-12"
      >
        <div className="tw:pointer-events-none tw:absolute tw:-top-32 tw:-right-32 tw:size-96 tw:rounded-full tw:bg-primary-foreground/10" />
        <div className="tw:pointer-events-none tw:absolute tw:-bottom-40 tw:-left-24 tw:size-[28rem] tw:rounded-full tw:bg-primary-foreground/5" />
        <div className="tw:relative tw:text-xl tw:font-bold tw:text-primary-foreground">{brandName}</div>
        <img src="/assets/images/auth/auth-img.png" alt="" className="tw:relative tw:mx-auto tw:max-h-[26rem] tw:w-auto tw:max-w-full tw:object-contain" />
        <p className="tw:relative tw:m-0 tw:max-w-sm tw:text-lg tw:font-medium tw:text-primary-foreground/90">
          Classes, attendance, assessments and progress — all in one place.
        </p>
      </m.section>
      <section className="tw:flex tw:items-center tw:justify-center tw:px-5 tw:py-10 tw:sm:px-10">
        <div className="tw:w-full tw:max-w-[28rem]">{children}</div>
      </section>
    </main>
  )
}
