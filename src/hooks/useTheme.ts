import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'coachify-theme'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}

