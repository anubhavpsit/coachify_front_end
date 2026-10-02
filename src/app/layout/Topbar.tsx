import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { useAuthUser } from '@/permissions'
import NoticeBoardButton from './NoticeBoardButton'
import UserMenu from './UserMenu'

interface Props {
  isDesktop: boolean
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

export default function Topbar({ isDesktop, sidebarCollapsed, onToggleSidebar, theme, onToggleTheme }: Props) {
  const navigate = useNavigate()
  const user = useAuthUser()
  const scrolled = useScrolled()
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileSearch, setMobileSearch] = useState(false)

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchTerm.trim()
    if (!trimmed) return
    setMobileSearch(false)
    navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}`)
  }

  const searchForm = (className?: string) => (
    <form role="search" className={cn('relative', className)} onSubmit={handleSearchSubmit}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        name="search"
        placeholder="Search"
        aria-label="Search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className="rounded-full bg-background pl-9"
      />
    </form>
  )

  const SidebarIcon = !isDesktop ? Menu : sidebarCollapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-solid border-border bg-card/85 backdrop-blur-md transition-shadow duration-250',
        scrolled && 'shadow-md',
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          aria-expanded={isDesktop ? !sidebarCollapsed : undefined}
        >
          <SidebarIcon className="size-5" aria-hidden="true" />
        </Button>

        {searchForm('hidden w-full max-w-sm md:block')}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search"
            aria-expanded={mobileSearch}
            onClick={() => setMobileSearch((v) => !v)}
          >
            <Search className="size-5" aria-hidden="true" />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                {theme === 'dark' ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>
          <NoticeBoardButton />
          <NotificationBell role={user?.role} />
          <UserMenu user={user} />
        </div>
      </div>
      {mobileSearch && <div className="px-4 pb-3 md:hidden">{searchForm()}</div>}
    </header>
  )
}
