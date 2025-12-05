import Icon from '../../components/common/Icon.tsx'

export default function DashboardPage() {
  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Dashboard</h6>
        <ul className="d-flex align-items-center gap-2">
          <li className="fw-medium">
            <span className="d-flex align-items-center gap-1 text-secondary-light">
              <Icon
                icon="solar:home-smile-angle-outline"
                className="icon text-lg"
              />
              Overview
            </span>
          </li>
        </ul>
      </div>

      <div className="row gy-4 mb-24">
        <div className="col-xxl-3 col-md-6">
          <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-1">
            <div className="d-flex align-items-center justify-content-between mb-12">
              <div className="d-flex align-items-center gap-2">
                <span className="mb-0 w-48-px h-48-px bg-base text-pink text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                  <i className="ri-group-fill"></i>
                </span>
                <div>
                  <span className="mb-0 fw-medium text-secondary-light text-lg">
                    Total Students
                  </span>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
              <h5 className="fw-semibold mb-0">15,000</h5>
              <p className="text-sm mb-0 d-flex align-items-center gap-8">
                <span className="text-white px-1 rounded-2 fw-medium bg-success-main text-sm">
                  +2.5k
                </span>
                This Month
              </p>
            </div>
          </div>
        </div>

        <div className="col-xxl-3 col-md-6">
          <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-2">
            <div className="d-flex align-items-center justify-content-between mb-12">
              <div className="d-flex align-items-center gap-2">
                <span className="mb-0 w-48-px h-48-px bg-base text-purple text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                  <i className="ri-youtube-fill"></i>
                </span>
                <div>
                  <span className="mb-0 fw-medium text-secondary-light text-lg">
                    Total Classes
                  </span>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
              <h5 className="fw-semibold mb-0">420</h5>
              <p className="text-sm mb-0 d-flex align-items-center gap-8">
                <span className="text-white px-1 rounded-2 fw-medium bg-success-main text-sm">
                  +30
                </span>
                This Month
              </p>
            </div>
          </div>
        </div>

        <div className="col-xxl-3 col-md-6">
          <div className="card p-20 radius-12 h-100 bg-gradient-dark-start-3">
            <div className="d-flex align-items-center justify-content-between mb-12">
              <div className="d-flex align-items-center gap-2">
                <span className="mb-0 w-48-px h-48-px bg-base text-info-main text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                  <i className="ri-book-open-fill"></i>
                </span>
                <div>
                  <span className="mb-0 fw-medium text-secondary-light text-lg">
                    Active Courses
                  </span>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
              <h5 className="fw-semibold mb-0">68</h5>
              <p className="text-sm mb-0 d-flex align-items-center gap-8">
                <span className="text-white px-1 rounded-2 fw-medium bg-success-main text-sm">
                  +12
                </span>
                This Month
              </p>
            </div>
          </div>
        </div>

        <div className="col-xxl-3 col-md-6">
          <div className="card p-20 radius-12 h-100">
            <div className="d-flex align-items-center justify-content-between mb-12">
              <div className="d-flex align-items-center gap-2">
                <span className="mb-0 w-48-px h-48-px bg-primary-50 text-primary-600 text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                  <i className="ri-bar-chart-grouped-fill"></i>
                </span>
                <div>
                  <span className="mb-0 fw-medium text-secondary-light text-lg">
                    Monthly Revenue
                  </span>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-8">
              <h5 className="fw-semibold mb-0">$24,500</h5>
              <p className="text-sm mb-0 d-flex align-items-center gap-8">
                <span className="text-success-main d-flex align-items-center gap-1">
                  <i className="ri-arrow-up-s-fill"></i>
                  12.3%
                </span>
                vs last month
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
