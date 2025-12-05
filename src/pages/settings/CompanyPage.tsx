import type { FormEvent } from 'react'
import Icon from '../../components/common/Icon.tsx'

export default function CompanyPage() {
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
        <h6 className="fw-semibold mb-0">Company</h6>
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
          <li className="fw-medium">Settings - Company</li>
        </ul>
      </div>

      <div className="card h-100 p-0 radius-12 overflow-hidden">
        <div className="card-body p-40">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="name"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Full Name <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="name"
                    placeholder="Enter Full Name"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="email"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Email <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control radius-8"
                    id="email"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="number"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-control radius-8"
                    id="number"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="website"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Website
                  </label>
                  <input
                    type="url"
                    className="form-control radius-8"
                    id="website"
                    placeholder="Website URL"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="country"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Country <span className="text-danger-600">*</span>
                  </label>
                  <select
                    className="form-control radius-8 form-select"
                    id="country"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select Country
                    </option>
                    <option>USA</option>
                    <option>Bangladesh</option>
                    <option>Pakistan</option>
                    <option>India</option>
                    <option>Canada</option>
                  </select>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="city"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    City <span className="text-danger-600">*</span>
                  </label>
                  <select
                    className="form-control radius-8 form-select"
                    id="city"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select City
                    </option>
                    <option>Washington</option>
                    <option>Dhaka</option>
                    <option>Lahor</option>
                    <option>Panjab</option>
                  </select>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="state"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    State <span className="text-danger-600">*</span>
                  </label>
                  <select
                    className="form-control radius-8 form-select"
                    id="state"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select State
                    </option>
                    <option>Washington</option>
                    <option>Dhaka</option>
                    <option>Lahor</option>
                    <option>Panjab</option>
                  </select>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="zip"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Zip Code <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="zip"
                    placeholder="Zip Code"
                  />
                </div>
              </div>
              <div className="col-sm-12">
                <div className="mb-20">
                  <label
                    htmlFor="address"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Address <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="address"
                    placeholder="Enter Your Address"
                  />
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
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
