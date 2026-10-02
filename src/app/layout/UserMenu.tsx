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
import { initials } from '@/lib/formatters'
import type { AuthUser } from '@/lib/auth'

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
          className="m-0 flex cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent p-0.5 pr-2 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Account menu"
        >
          <Avatar className="size-9">
            {image && <AvatarImage src={image} alt={name} />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground lg:inline">{name}</span>
          <ChevronDown className="hidden size-4 text-muted-foreground lg:inline" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 rounded-md bg-primary-soft px-3 py-2.5">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="text-xs font-medium capitalize text-muted-foreground">{formatRole(user?.role)}</span>
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
