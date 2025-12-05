export default function Footer() {
  return (
    <footer className="d-footer mt-auto px-24 py-16 border-top bg-base">
      <div className="row align-items-center justify-content-between">
        <div className="col-auto">
          <p className="mb-0 text-sm text-secondary-light">
            © {new Date().getFullYear()} Coachify. All Rights Reserved.
          </p>
        </div>
        <div className="col-auto">
          <p className="mb-0 text-sm text-secondary-light">
            Built on&nbsp;
            <span className="text-primary-600 fw-semibold">Wowdash UI</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

