import { createElement } from 'react'

type IconProps = {
  icon: string
  className?: string
}

export default function Icon({ icon, className }: IconProps) {
  return createElement('iconify-icon', {
    icon,
    class: className,
  } as unknown as Record<string, unknown>)
}

