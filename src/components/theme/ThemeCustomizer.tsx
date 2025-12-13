import { useEffect, useState } from 'react'

type ThemeCustomizerProps = {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
}
type ThemeMode = 'light' | 'dark'


export default function ThemeCustomizer({
  isOpen,
  onToggle,
  onClose,
  theme,
  setTheme,
}: ThemeCustomizerProps) {

  return (
    <>
      {/* Overlay */}
      <div
        className={`body-overlay${isOpen ? ' show' : ''}`}
        onClick={onClose}
      />

      {/* Floating Button */}
      <button
        type="button"
        className="theme-customization__button w-48-px h-48-px bg-primary-600 text-white rounded-circle d-flex justify-content-center align-items-center position-fixed end-0 bottom-0 mb-40 me-40 text-2xxl bg-hover-primary-700"
        onClick={onToggle}
      >
        <i className="ri-settings-3-line animate-spin"></i>
      </button>

      {/* Sidebar */}
      <div
        className={`theme-customization-sidebar w-100 bg-base h-100vh overflow-y-auto position-fixed end-0 top-0 shadow-lg${
          isOpen ? ' active' : ''
        }`}
      >
        {/* Header */}
        <div className="d-flex align-items-center gap-3 py-16 px-24 justify-content-between border-bottom">
          <div>
            <h6 className="text-sm">Theme Settings</h6>
            <p className="text-xs mb-0 text-neutral-500">
              Customize and preview instantly
            </p>
          </div>
          <button
            type="button"
            className="theme-customization-sidebar__close text-neutral-900 bg-transparent text-hover-primary-600 d-flex text-xl border-0"
            onClick={onClose}
          >
            <i className="ri-close-fill"></i>
          </button>
        </div>

        {/* Content */}
        <div className="d-flex flex-column gap-48 p-24 overflow-y-auto flex-grow-1">
          {/* Theme Mode */}
          <div className="theme-setting-item">
            <h6 className="fw-medium text-primary-light text-md mb-3">
              Theme Mode
            </h6>
            <div className="d-grid grid-cols-3 gap-3 dark-light-mode">
              <button
                type="button"
                className={`theme-btn theme-setting-item__btn d-flex align-items-center justify-content-center h-64-px rounded-3 text-xl${
                  theme === 'light' ? ' active' : ''
                }`}
                onClick={() => setTheme('light')}
              >
                <i className="ri-sun-line"></i>
              </button>

              <button
                type="button"
                className={`theme-btn theme-setting-item__btn d-flex align-items-center justify-content-center h-64-px rounded-3 text-xl${
                  theme === 'dark' ? ' active' : ''
                }`}
                onClick={() => setTheme('dark')}
              >
                <i className="ri-moon-line"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
