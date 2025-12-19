import { useEffect, useState } from 'react'
import type { FormEvent, MouseEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
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
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

  const handleLogout: MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault()

    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('authToken')
          : null

      if (token) {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        )
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error during logout:', error)
    } finally {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('authUser')
        window.localStorage.removeItem('authToken')
        window.localStorage.removeItem('tenant_id')
        window.localStorage.removeItem('tenant')
        window.sessionStorage.clear()
      }
      setProfileOpen(false)
      navigate('/')
    }
  }

  useEffect(() => {
    
    const savedColor = window.localStorage.getItem('templateColor')
    if (savedColor) {
      document.documentElement.style.setProperty('--primary-600', savedColor)
    }

    const authUser = JSON.parse(window.localStorage.getItem('authUser') || '{}');
    setUser(authUser);
  }, []);  

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchTerm.trim()
    if (!trimmed) return

    setProfileOpen(false)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

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
            <form
              className="navbar-search d-none d-md-flex"
              onSubmit={handleSearchSubmit}
            >
              <input
                type="text"
                name="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button
                type="submit"
                className="border-0 bg-transparent p-0 d-flex align-items-center"
                aria-label="Search"
              >
                <Icon icon="ion:search-outline" className="icon" />
              </button>
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
                {/*
                <button
                  type="button"
                  className="dropdown-item text-sm"
                  onClick={() => setProfileOpen(false)}
                >
                  Settings
                </button>
                */}
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
