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
    <form role="search" className={cn('tw:relative', className)} onSubmit={handleSearchSubmit}>
      <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        name="search"
        placeholder="Search"
        aria-label="Search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className="tw:rounded-full tw:bg-background tw:pl-9"
      />
    </form>
  )

  const SidebarIcon = !isDesktop ? Menu : sidebarCollapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <header
      className={cn(
        'tw:sticky tw:top-0 tw:z-30 tw:border-b tw:border-solid tw:border-border tw:bg-card/85 tw:backdrop-blur-md tw:transition-shadow tw:duration-250',
        scrolled && 'tw:shadow-md',
      )}
    >
      <div className="tw:flex tw:h-16 tw:items-center tw:gap-3 tw:px-4 tw:md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          aria-expanded={isDesktop ? !sidebarCollapsed : undefined}
        >
          <SidebarIcon className="tw:size-5" aria-hidden="true" />
        </Button>

        {searchForm('tw:hidden tw:w-full tw:max-w-sm tw:md:block')}

        <div className="tw:ml-auto tw:flex tw:items-center tw:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="tw:md:hidden"
            aria-label="Search"
            aria-expanded={mobileSearch}
            onClick={() => setMobileSearch((v) => !v)}
          >
            <Search className="tw:size-5" aria-hidden="true" />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" className="tw:rounded-full" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                {theme === 'dark' ? <Sun className="tw:size-5" aria-hidden="true" /> : <Moon className="tw:size-5" aria-hidden="true" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>
          <NotificationBell role={user?.role} />
          <UserMenu user={user} />
        </div>
      </div>
      {mobileSearch && <div className="tw:px-4 tw:pb-3 tw:md:hidden">{searchForm()}</div>}
    </header>
  )
}
