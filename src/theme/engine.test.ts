import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PRIMARY,
  applyThemeColor,
  bootTheme,
  buildThemeVars,
  contrastRatio,
  normalizeHex,
  readStoredThemeColor,
  readableForeground,
} from './engine'

afterEach(() => {
  localStorage.clear()
  document.getElementById('cf-tenant-theme')?.remove()
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-theme')
})

describe('normalizeHex', () => {
  it('accepts the backend formats (#RGB, #RRGGBB)', () => {
    expect(normalizeHex('#2563eb')).toBe('#2563EB')
    expect(normalizeHex('#abc')).toBe('#AABBCC')
    expect(normalizeHex(' 2563eb ')).toBe('#2563EB')
  })
  it('rejects anything else', () => {
    for (const bad of ['', '#12345', 'red', 'rgb(0,0,0)', null, undefined, 42, '#GGGGGG']) {
      expect(normalizeHex(bad)).toBeNull()
    }
  })
})

describe('contrast', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })
  it('keeps white on the default and dark brand colours', () => {
    expect(readableForeground('#2563EB')).toBe('#FFFFFF')
    expect(readableForeground('#1E3A8A')).toBe('#FFFFFF')
  })
  it('switches to dark text on light brand colours', () => {
    expect(readableForeground('#FACC15')).toBe('#0F172A')
    expect(readableForeground('#A3E635')).toBe('#0F172A')
  })
})

describe('buildThemeVars', () => {
  it('keeps the tenant colour as 600 and derives a full scale', () => {
    const vars = buildThemeVars('#2563eb')
    expect(vars['--primary-600']).toBe('#2563EB')
    expect(vars['--primary']).toBe('#2563EB')
    for (const step of [50, 100, 200, 300, 400, 500, 700, 800, 900]) {
      expect(vars[`--primary-${step}`]).toMatch(/^#[0-9A-F]{6}$/)
    }
    // tints get lighter, shades darker
    expect(contrastRatio(vars['--primary-50'], '#FFFFFF')).toBeLessThan(1.2)
    expect(contrastRatio(vars['--primary-900'], '#FFFFFF')).toBeGreaterThan(contrastRatio('#2563EB', '#FFFFFF'))
  })
  it('primary foreground always meets AA or is the best available', () => {
    for (const c of ['#2563EB', '#FACC15', '#16A34A', '#DC2626', '#0EA5E9', '#7C3AED', '#F97316']) {
      const v = buildThemeVars(c)
      const ratio = contrastRatio(v['--primary'], v['--primary-foreground'])
      const best = Math.max(contrastRatio(c, '#FFFFFF'), contrastRatio(c, '#0F172A'))
      expect(ratio).toBeCloseTo(ratio >= 4.5 ? ratio : best, 5)
    }
  })
  it('falls back to the default on invalid input', () => {
    expect(buildThemeVars('nope')['--primary']).toBe(DEFAULT_PRIMARY)
    expect(buildThemeVars(undefined)['--primary']).toBe(DEFAULT_PRIMARY)
  })
})

describe('storage + boot', () => {
  it('prefers templateColor, then tenant.theme_color', () => {
    localStorage.setItem('tenant', JSON.stringify({ theme_color: '#16a34a' }))
    expect(readStoredThemeColor()).toBe('#16A34A')
    localStorage.setItem('templateColor', '#dc2626')
    expect(readStoredThemeColor()).toBe('#DC2626')
  })
  it('survives corrupt storage', () => {
    localStorage.setItem('tenant', '{not json')
    expect(readStoredThemeColor()).toBeNull()
  })
  it('writes a single style element and restores dark mode', () => {
    localStorage.setItem('templateColor', '#16a34a')
    localStorage.setItem('coachify-theme', 'dark')
    document.documentElement.style.setProperty('--primary-600', '#000000') // legacy inline value
    bootTheme()
    applyThemeColor('#16a34a')
    const styles = document.querySelectorAll('#cf-tenant-theme')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toContain('--primary-600:#16A34A')
    expect(styles[0].textContent).toContain('[data-theme=dark]{--primary-50:#16A34A0F')
    expect(document.documentElement.style.getPropertyValue('--primary-600')).toBe('')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
