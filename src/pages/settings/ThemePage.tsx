import type { FormEvent } from 'react'
import Icon from '../../components/common/Icon.tsx'

export default function ThemePage() {
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
        <h6 className="fw-semibold mb-0">Theme</h6>
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
          <li className="fw-medium">Settings - Theme</li>
        </ul>
      </div>

      <div className="card h-100 p-0 radius-12 overflow-hidden">
        <div className="card-body p-40">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-20">
                  <label
                    htmlFor="themeMode"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Theme mode
                  </label>
                  <select
                    id="themeMode"
                    className="form-control radius-8 form-select"
                    defaultValue="light"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-20">
                  <label
                    htmlFor="themeDirection"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Page direction
                  </label>
                  <select
                    id="themeDirection"
                    className="form-control radius-8 form-select"
                    defaultValue="ltr"
                  >
                    <option value="ltr">LTR</option>
                    <option value="rtl">RTL</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-20">
                  <label
                    htmlFor="themeColor"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Primary color
                  </label>
                  <select
                    id="themeColor"
                    className="form-control radius-8 form-select"
                    defaultValue="blue"
                  >
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="cyan">Cyan</option>
                    <option value="violet">Violet</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-20">
                  <label
                    htmlFor="themePreview"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Preview
                  </label>
                  <div
                    id="themePreview"
                    className="p-16 radius-12 border d-flex align-items-center justify-content-between"
                  >
                    <div className="d-flex align-items-center gap-3">
                      <span className="w-32-px h-32-px rounded-circle bg-primary-600"></span>
                      <div>
                        <p className="mb-0 fw-semibold text-primary-light text-sm">
                          Coachify
                        </p>
                        <p className="mb-0 text-xs text-secondary-light">
                          Colors & layout preview
                        </p>
                      </div>
                    </div>
                    <span className="badge bg-primary-50 text-primary-600 text-xs">
                      Example
                    </span>
                  </div>
                </div>
              </div>
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
