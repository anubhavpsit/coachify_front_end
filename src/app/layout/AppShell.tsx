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
import { ROUTES } from '@/constants/routes'
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
  // Full-screen pages (the Facts reels feed): no padding or footer, and the
  // page itself doesn't scroll — the feed inside does.
  const immersive = pathname === ROUTES.FACTS

  return (
    <div className="min-h-screen bg-background">
      {isDesktop ? (
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-solid border-border bg-card transition-[width] duration-250 ease-standard',
            railCollapsed ? 'w-[4.75rem]' : 'w-64',
          )}
        >
          <div className={cn('flex h-16 shrink-0 items-center border-b border-solid border-border', railCollapsed ? 'justify-center px-2' : 'px-5')}>
            <BrandMark collapsed={railCollapsed} />
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <SidebarNav collapsed={railCollapsed} layoutId="nav-active-desktop" />
          </div>
        </aside>
      ) : (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 gap-0 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
            <div className="flex h-16 shrink-0 items-center border-b border-solid border-border px-5">
              <BrandMark />
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav layoutId="nav-active-mobile" onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <div
        className={cn(
          'flex min-w-0 flex-col transition-[padding] duration-250 ease-standard',
          immersive ? 'h-dvh overflow-hidden' : 'min-h-screen',
          isDesktop && (railCollapsed ? 'pl-[4.75rem]' : 'pl-64'),
        )}
      >
        <Topbar
          isDesktop={isDesktop}
          sidebarCollapsed={railCollapsed}
          onToggleSidebar={handleToggleSidebar}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main id="main-content" className={immersive ? 'min-h-0 flex-1' : 'flex-1 p-4 md:p-6'}>
          <div ref={contentRef} className={immersive ? 'h-full' : undefined}>
            <ErrorBoundary resetKey={pathname}>
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        {!immersive && <Footer />}
      </div>
    </div>
  )
}
