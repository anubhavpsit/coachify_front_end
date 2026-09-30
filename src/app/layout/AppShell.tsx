import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAnimate, useReducedMotion } from 'motion/react'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { useNoticeUnreadPolling } from '@/hooks/useNoticeUnreadPolling'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { applyThemeColor, readStoredThemeColor } from '@/theme'
import { duration, easing } from '@/theme/tokens'
import BrandMark from './BrandMark'
import Footer from './Footer'
import PageFallback from './PageFallback'
import SidebarNav from './SidebarNav'
import Topbar from './Topbar'
import { DESKTOP_QUERY, useMediaQuery } from './useMediaQuery'

const COLLAPSED_KEY = 'coachify-sidebar-collapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/** Fade/rise the content on route change without remounting the page. */
function useRouteTransition() {
  const { pathname } = useLocation()
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!scope.current) return
    const keyframes = reduce ? { opacity: [0.6, 1] } : { opacity: [0, 1], y: [8, 0] }
    animate(scope.current, keyframes, { duration: duration.base, ease: easing.standard })
    window.scrollTo({ top: 0 })
  }, [pathname, animate, scope, reduce])
  return scope
}

/**
 * Authenticated app shell (was layouts/DashboardLayout). Mounted once for all
 * signed-in routes so the sidebar/topbar keep their state across navigation.
 */
export default function AppShell() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const contentRef = useRouteTransition()
  const { pathname } = useLocation()

  useNoticeUnreadPolling()

  // The legacy Topbar re-applied the cached tenant colour on mount.
  useEffect(() => {
    applyThemeColor(readStoredThemeColor())
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const handleToggleSidebar = () => {
    if (isDesktop) setCollapsed((v) => !v)
    else setMobileOpen((v) => !v)
  }

  const railCollapsed = isDesktop && collapsed

  return (
    <div className="tw:min-h-screen tw:bg-background">
      {isDesktop ? (
        <aside
          className={cn(
            'tw:fixed tw:inset-y-0 tw:left-0 tw:z-40 tw:flex tw:flex-col tw:border-r tw:border-solid tw:border-border tw:bg-card tw:transition-[width] tw:duration-250 tw:ease-standard',
            railCollapsed ? 'tw:w-[4.75rem]' : 'tw:w-64',
          )}
        >
          <div className={cn('tw:flex tw:h-16 tw:shrink-0 tw:items-center tw:border-b tw:border-solid tw:border-border', railCollapsed ? 'tw:justify-center tw:px-2' : 'tw:px-5')}>
            <BrandMark collapsed={railCollapsed} />
          </div>
          <div className="tw:flex-1 tw:overflow-y-auto tw:overflow-x-hidden">
            <SidebarNav collapsed={railCollapsed} layoutId="nav-active-desktop" />
          </div>
        </aside>
      ) : (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="tw:w-72 tw:gap-0 tw:p-0">
            <SheetTitle className="tw:sr-only">Menu</SheetTitle>
            <SheetDescription className="tw:sr-only">Main navigation</SheetDescription>
            <div className="tw:flex tw:h-16 tw:shrink-0 tw:items-center tw:border-b tw:border-solid tw:border-border tw:px-5">
              <BrandMark />
            </div>
            <div className="tw:flex-1 tw:overflow-y-auto">
              <SidebarNav layoutId="nav-active-mobile" onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <div
        className={cn(
          'tw:flex tw:min-h-screen tw:min-w-0 tw:flex-col tw:transition-[padding] tw:duration-250 tw:ease-standard',
          isDesktop && (railCollapsed ? 'tw:pl-[4.75rem]' : 'tw:pl-64'),
        )}
      >
        <Topbar
          isDesktop={isDesktop}
          sidebarCollapsed={railCollapsed}
          onToggleSidebar={handleToggleSidebar}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main id="main-content" className="tw:flex-1 tw:p-4 tw:md:p-6">
          <div ref={contentRef}>
            <ErrorBoundary resetKey={pathname}>
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
