import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar.tsx'
import Topbar from '../components/layout/Topbar.tsx'
import Footer from '../components/layout/Footer.tsx'
import ThemeCustomizer from '../components/theme/ThemeCustomizer.tsx'
import { useTheme } from '../hooks/useTheme.ts'

export default function DashboardLayout() {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1200 : true,
  )
  const [isCustomizerOpen, setCustomizerOpen] = useState(false)
  const { theme, setTheme, toggleTheme } = useTheme()

  const themeLabel = theme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return
      const isWide = window.innerWidth >= 1200
      setIsDesktop(isWide)

      if (isWide) {
        setSidebarOpen(false)
      } else {
        setSidebarCollapsed(false)
      }
    }

    handleResize()

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleToggleSidebar = () => {
    if (isDesktop) {
      setSidebarCollapsed((previous) => !previous)
      return
    }

    setSidebarOpen((previous) => !previous)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <>
      <Sidebar
        isCollapsed={isDesktop && isSidebarCollapsed}
        isOpen={!isDesktop && isSidebarOpen}
        onClose={handleCloseSidebar}
      />

      <main
        className={`dashboard-main d-flex flex-column${
          isSidebarCollapsed ? ' active' : ''
        }`}
      >
        <Topbar
          onToggleSidebar={handleToggleSidebar}
          onToggleTheme={toggleTheme}
          themeLabel={themeLabel}
          isSidebarActive={isDesktop ? isSidebarCollapsed : isSidebarOpen}
        />

        <div className="dashboard-main-body px-24 py-24 flex-grow-1">
          <Outlet />
        </div>

        <Footer />
      </main>

      <ThemeCustomizer
        isOpen={isCustomizerOpen}
        onToggle={() => setCustomizerOpen((previous) => !previous)}
        onClose={() => setCustomizerOpen(false)}
        theme={theme}
        setTheme={setTheme}
      />

      {!isDesktop && (
        <div
          className={`body-overlay${isSidebarOpen ? ' show' : ''}`}
          onClick={handleCloseSidebar}
        />
      )}
    </>
  )
}
