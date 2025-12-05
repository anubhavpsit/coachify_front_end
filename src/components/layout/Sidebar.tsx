import { NavLink } from 'react-router-dom'
import Icon from '../common/Icon.tsx'

type SidebarProps = {
  isCollapsed: boolean
}

const linkBaseClass =
  'd-flex align-items-center gap-2 w-100 text-md fw-medium hover-text-primary'

function navLinkClass(isActive: boolean) {
  const activeClass = isActive ? ' active-page' : ''
  return `${linkBaseClass}${activeClass}`
}

export default function Sidebar({ isCollapsed }: SidebarProps) {
  return (
    <aside className={`sidebar${isCollapsed ? ' active' : ''}`}>
      <div>
        <NavLink to="/" className="sidebar-logo">
          <img
            src="/assets/images/logo.png"
            alt="Coachify logo"
            className="light-logo"
          />
          <img
            src="/assets/images/logo-light.png"
            alt="Coachify logo"
            className="dark-logo"
          />
          <img
            src="/assets/images/logo-icon.png"
            alt="Coachify logo icon"
            className="logo-icon"
          />
        </NavLink>
      </div>

      <div className="sidebar-menu-area">
        <ul className="sidebar-menu" id="sidebar-menu">
          <li className="sidebar-menu-group-title">Dashboard</li>
          <li>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon icon="solar:home-smile-angle-outline" className="menu-icon" />
              <span>Overview</span>
            </NavLink>
          </li>

          <li className="sidebar-menu-group-title">Settings</li>
          <li>
            <NavLink
              to="/dashboard/settings/company"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon icon="icon-park-outline:setting-two" className="menu-icon" />
              <span>Company</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/settings/notification"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon icon="mage:notification-bing" className="menu-icon" />
              <span>Notification</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/settings/notification-alert"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon icon="solar:bell-bing-outline" className="menu-icon" />
              <span>Notification Alert</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/settings/theme"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon icon="icon-park-outline:setting-two" className="menu-icon" />
              <span>Theme</span>
            </NavLink>
          </li>

          <li className="sidebar-menu-group-title">Access</li>
          <li>
            <NavLink
              to="/auth/sign-up"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon icon="simple-line-icons:vector" className="menu-icon" />
              <span>Sign Up</span>
            </NavLink>
          </li>
        </ul>
      </div>
    </aside>
  )
}
