import { NavLink } from 'react-router-dom'
import Icon from '../common/Icon.tsx'
import { ROLES } from '../../constants/roles'

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
  const user = JSON.parse(
    window.localStorage.getItem('authUser') || '{}',
  )

  return (
    <aside className={`sidebar${isCollapsed ? ' active' : ''}`}>
      <div>
        <NavLink to="/dashboard" className="sidebar-logo">
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
          {/*<li className="sidebar-menu-group-title">Dashboard</li>*/}
          <li>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon icon="solar:home-smile-angle-outline" className="menu-icon" />
              <span>Dashboard</span>
            </NavLink>
          </li>

          {/* <li className="sidebar-menu-group-title">Settings</li> */}
          {(user.role === ROLES.TEACHER || user.role === ROLES.COACHING_ADMIN) && (
            <>
              <li>
                <NavLink
                  to="/students"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:book-outline" className="menu-icon" />
                  <span>Students</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/assessments"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:file-document-edit-outline" className="menu-icon" />
                  <span>Assessments</span>
                </NavLink>
              </li>
            </>
          )}
          {(user.role === ROLES.STUDENT || user.role === ROLES.COACHING_ADMIN) && (
            <>
              <li>
                <NavLink
                  to="/teachers"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:book-outline" className="menu-icon" />
                  <span>Teachers</span>
                </NavLink>
              </li>
            </>
          )}
          {user?.role === ROLES.STUDENT && (
            <>
              <li>
                <NavLink
                  to="/students/activities"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:calendar-check" className="menu-icon" />
                  <span>My Activities</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/students/assessments"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:file-document-edit-outline" className="menu-icon" />
                  <span>My Assessments</span>
                </NavLink>
              </li>
            </>
          )}
          {user?.role === ROLES.TEACHER && (
            <>
              <li>
                <NavLink 
                  to="/teachers/daily-activities"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:calendar-check" className="menu-icon" />
                  <span>Daily Activities</span>
                </NavLink>
              </li>
            </>
          )}
          {/* Show Company only for coaching_admin */}
          {user.role === ROLES.COACHING_ADMIN && (
            <>
              {/*
              <li>
                <NavLink
                  to="/dashboard/settings/company"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="icon-park-outline:setting-two" className="menu-icon" />
                  <span>Company</span>
                </NavLink>
              </li>
              */}
              <li>
                <NavLink
                  to="/subjects"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:book-outline" className="menu-icon" />
                  <span>Subjects</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/classes"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:book-outline" className="menu-icon" />
                  <span>Classes</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/fees"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:currency-inr" className="menu-icon" />
                  <span>Fees</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/expenses"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:cash-multiple" className="menu-icon" />
                  <span>Expenses</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/enquiries"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:account-question-outline" className="menu-icon" />
                  <span>Enquiries</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/attendance"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="ic:baseline-check-circle" />
                  <span>Daily Attendance</span>
                </NavLink>
              </li>
              {/*
              <li>
                <NavLink
                  to="/teachers"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:book-outline" className="menu-icon" />
                  <span>Teachers</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/students"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon icon="mdi:book-outline" className="menu-icon" />
                  <span>Students</span>
                </NavLink>
              </li>
              */}
            </>
          )}
          {/*
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
          */}
          {/*
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
          */}
        </ul>
      </div>
    </aside>
  )
}
