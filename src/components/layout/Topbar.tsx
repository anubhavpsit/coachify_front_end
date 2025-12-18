import { useEffect, useState } from 'react'
import type { MouseEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../common/Icon.tsx'
import Avatar from '../common/Avatar.tsx';

type TopbarProps = {
  onToggleSidebar: MouseEventHandler<HTMLButtonElement>
  onToggleTheme: () => void
  onOpenCustomizer: () => void
  themeLabel: string
}

export default function Topbar({
  onToggleSidebar,
  onToggleTheme,
  onOpenCustomizer,
  themeLabel,
}: TopbarProps) {
  const [isProfileOpen, setProfileOpen] = useState(false)
  const [user, setUser] = useState<object>('');
  const navigate = useNavigate()

  const handleLogout: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
      window.sessionStorage.clear()
    }
    setProfileOpen(false)
    navigate('/')
  }

  useEffect(() => {
    
    const savedColor = window.localStorage.getItem('templateColor')
    if (savedColor) {
      document.documentElement.style.setProperty('--primary-600', savedColor)
    }

    const authUser = JSON.parse(sessionStorage.getItem('authUser') || '{}');
    setUser(authUser);
  }, []);  

  return (
    <header className="navbar-header px-24 py-16 border-bottom bg-base">
      <div className="row align-items-center justify-content-between">
        <div className="col-auto">
          <div className="d-flex flex-wrap align-items-center gap-4">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Icon
                icon="heroicons:bars-3-solid"
                className="icon text-2xl non-active"
              />
              <Icon
                icon="iconoir:arrow-right"
                className="icon text-2xl active"
              />
            </button>
            <form className="navbar-search d-none d-md-flex">
              <input type="text" name="search" placeholder="Search" />
              <Icon icon="ion:search-outline" className="icon" />
            </form>
          </div>
        </div>
        <div className="col-auto">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <button
              type="button"
              data-theme-toggle
              className="w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center text-xs text-uppercase"
              onClick={onToggleTheme}
            >
              {themeLabel}
            </button>

            {/*
            <button
              type="button"
              className="w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center"
              onClick={onOpenCustomizer}
              aria-label="Open theme customization"
            >
              <Icon
                icon="ri:settings-3-line"
                className="text-primary-light text-xl"
              />
            </button>
            */}
            
            <div className={`dropdown${isProfileOpen ? ' show' : ''}`}>
              <button
                className="d-flex justify-content-center align-items-center rounded-circle border-0 bg-transparent"
                type="button"
                onClick={() => setProfileOpen((previous) => !previous)}
              >
                <Avatar
                  user={user}
                  size={40}
                  color={{
                    bg: "bg-info-100",
                    text: "text-info-600",
                  }}
                />
              </button>
              <div
                className={`dropdown-menu to-top dropdown-menu-sm${
                  isProfileOpen ? ' show' : ''
                }`}
              >
                <div className="py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2">
                  <div>
                    <h6 className="text-lg text-primary-light fw-semibold mb-2">
                      {user.name}
                    </h6>
                    <span className="text-secondary-light fw-medium text-sm">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="dropdown-item text-sm"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate('/profile')
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="dropdown-item text-sm"
                  onClick={() => setProfileOpen(false)}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="dropdown-item text-sm text-danger-600"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
