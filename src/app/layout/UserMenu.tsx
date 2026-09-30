import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROUTES } from '@/constants/routes'
import { useLogout } from '@/features/auth'
import type { AuthUser } from '@/lib/auth'

function initials(name?: string) {
  return (
    name?.trim().split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || '?'
  )
}

function formatRole(role?: string) {
  return role ? role.replace(/_/g, ' ') : ''
}

export default function UserMenu({ user }: { user: AuthUser | null }) {
  const navigate = useNavigate()
  const { logout, loggingOut } = useLogout()
  const name = user?.name ?? ''
  const image = typeof user?.profile_image === 'string' && user.profile_image.trim() ? user.profile_image : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-full tw:border-0 tw:bg-transparent tw:p-0.5 tw:pr-2 tw:outline-none tw:transition-colors tw:hover:bg-accent tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50"
          aria-label="Account menu"
        >
          <Avatar className="tw:size-9">
            {image && <AvatarImage src={image} alt={name} />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="tw:hidden tw:max-w-[9rem] tw:truncate tw:text-sm tw:font-medium tw:text-foreground tw:lg:inline">{name}</span>
          <ChevronDown className="tw:hidden tw:size-4 tw:text-muted-foreground tw:lg:inline" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="tw:w-60">
        <DropdownMenuLabel className="tw:flex tw:flex-col tw:gap-0.5 tw:rounded-md tw:bg-primary-soft tw:px-3 tw:py-2.5">
          <span className="tw:truncate tw:text-sm tw:font-semibold tw:text-foreground">{name}</span>
          <span className="tw:text-xs tw:font-medium tw:capitalize tw:text-muted-foreground">{formatRole(user?.role)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(ROUTES.PROFILE)}>
          <UserRound aria-hidden="true" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" disabled={loggingOut} onSelect={() => void logout()}>
          <LogOut aria-hidden="true" />
          {loggingOut ? 'Logging out…' : 'Logout'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
