import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar.tsx'
import Topbar from '../components/layout/Topbar.tsx'
import Footer from '../components/layout/Footer.tsx'
import ThemeCustomizer from '../components/theme/ThemeCustomizer.tsx'
import { useTheme } from '../hooks/useTheme.ts'

export default function DashboardLayout() {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isCustomizerOpen, setCustomizerOpen] = useState(false)
  const { theme, setTheme, toggleTheme } = useTheme()

  const themeLabel = theme === 'dark' ? 'dark' : 'light'

  return (
    <>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
      />

      <main
        className={`dashboard-main d-flex flex-column${
          isSidebarCollapsed ? ' active' : ''
        }`}
      >
        <Topbar
          onToggleSidebar={() =>
            setSidebarCollapsed((previous) => !previous)
          }
          onToggleTheme={toggleTheme}
          onOpenCustomizer={() => setCustomizerOpen(true)}
          themeLabel={themeLabel}
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
    </>
  )
}
