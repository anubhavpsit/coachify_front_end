import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-80">
      <h1 className="display-4 fw-bold mb-16">404</h1>
      <p className="text-secondary-light mb-24">
        The page you are looking for could not be found.
      </p>
      <Link
        to="/"
        className="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

