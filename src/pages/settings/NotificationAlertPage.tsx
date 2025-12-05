import type { FormEvent } from 'react'
import Icon from '../../components/common/Icon.tsx'

export default function NotificationAlertPage() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  const handleReset = (event: FormEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const form = event.currentTarget.form
    form?.reset()
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Notification Alert</h6>
        <ul className="d-flex align-items-center gap-2">
          <li className="fw-medium">
            <span className="d-flex align-items-center gap-1 hover-text-primary">
              <Icon
                icon="solar:home-smile-angle-outline"
                className="icon text-lg"
              />
              Dashboard
            </span>
          </li>
          <li>-</li>
          <li className="fw-medium">Settings - Notification Alert</li>
        </ul>
      </div>

      <div className="card h-100 p-0 radius-12 overflow-hidden">
        <div className="card-body p-40">
          <form onSubmit={handleSubmit}>
            <div className="mb-24">
              <h6 className="mb-16">Mail Notification Messages</h6>
              <div className="d-flex flex-wrap justify-content-between gap-1">
                <label className="form-label fw-medium text-secondary-light text-md mb-8">
                  Admin New Order Message
                </label>
                <div className="form-switch switch-primary d-flex align-items-center gap-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="mailAdminNewOrder"
                    defaultChecked
                  />
                  <label
                    className="form-check-label line-height-1 fw-medium text-secondary-light"
                    htmlFor="mailAdminNewOrder"
                  >
                    On
                  </label>
                </div>
              </div>
              <textarea
                className="form-control radius-8 h-80-px"
                placeholder="You have a new order."
              ></textarea>
            </div>

            <div className="mb-24">
              <h6 className="mb-16">SMS Notification Messages</h6>
              <div className="d-flex flex-wrap justify-content-between gap-1">
                <label className="form-label fw-medium text-secondary-light text-md mb-8">
                  Admin New Order Message
                </label>
                <div className="form-switch switch-primary d-flex align-items-center gap-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="smsAdminNewOrder"
                  />
                  <label
                    className="form-check-label line-height-1 fw-medium text-secondary-light"
                    htmlFor="smsAdminNewOrder"
                  >
                    Off
                  </label>
                </div>
              </div>
              <textarea
                className="form-control radius-8 h-80-px"
                placeholder="You have a new order."
              ></textarea>
            </div>

            <div className="mb-24">
              <h6 className="mb-16">Push Notification Messages</h6>
              <div className="d-flex flex-wrap justify-content-between gap-1">
                <label className="form-label fw-medium text-secondary-light text-md mb-8">
                  Admin New Order Message
                </label>
                <div className="form-switch switch-primary d-flex align-items-center gap-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="pushAdminNewOrder"
                  />
                  <label
                    className="form-check-label line-height-1 fw-medium text-secondary-light"
                    htmlFor="pushAdminNewOrder"
                  >
                    Off
                  </label>
                </div>
              </div>
              <textarea
                className="form-control radius-8 h-80-px"
                placeholder="You have a new order."
              ></textarea>
            </div>

            <div className="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="button"
                className="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                type="submit"
                className="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
              >
                Save Change
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
