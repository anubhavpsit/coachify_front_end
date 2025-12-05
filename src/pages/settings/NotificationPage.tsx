import type { FormEvent } from 'react'
import Icon from '../../components/common/Icon.tsx'

export default function NotificationPage() {
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
        <h6 className="fw-semibold mb-0">Notification</h6>
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
          <li className="fw-medium">Settings - Notification</li>
        </ul>
      </div>

      <div className="card h-100 p-0 radius-12 overflow-hidden">
        <div className="card-body p-40">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseSecretKey"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase secret key
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebaseSecretKey"
                    placeholder="Firebase secret key"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebasePublicVapidKey"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase public vapid key (key pair)
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebasePublicVapidKey"
                    placeholder="Firebase public vapid key (key pair)"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseAPIKey"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase API Key
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebaseAPIKey"
                    placeholder="Firebase API Key"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseAuthDomain"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase AUTH Domain
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebaseAuthDomain"
                    placeholder="Firebase AUTH Domain"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseProjectID"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase Project ID
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebaseProjectID"
                    placeholder="Firebase Project ID"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseStorageBucket"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase Storage Bucket
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebaseStorageBucket"
                    placeholder="Firebase Storage Bucket"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseMessageSenderID"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase Message Sender ID
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebaseMessageSenderID"
                    placeholder="Firebase Message Sender ID"
                  />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseAppID"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Firebase App ID
                  </label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    id="firebaseAppID"
                    placeholder="Firebase App ID"
                  />
                </div>
              </div>
              <div className="col-sm-12">
                <div className="mb-20">
                  <label
                    htmlFor="firebaseNotes"
                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                  >
                    Notes
                  </label>
                  <textarea
                    id="firebaseNotes"
                    className="form-control radius-8"
                    placeholder="Any implementation notes for your team..."
                    rows={3}
                  ></textarea>
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
