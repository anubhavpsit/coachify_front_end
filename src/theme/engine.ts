// Tenant colour engine.
//
// MUST stay dependency-free: vite.config.ts compiles this file on its own into
// an inline <head> script (see themePreloadPlugin) so the tenant colour is
// applied before first paint. The app imports the same functions, so there is
// a single implementation.
//
// Source of truth is unchanged: `tenant.theme_color` from GET /tenants/{subdomain},
// cached by SignInPage in localStorage (`templateColor`, `tenant`).

export const DEFAULT_PRIMARY = '#487FFF' // WowDash template primary-600
export const THEME_COLOR_KEY = 'templateColor'
export const TENANT_KEY = 'tenant'
export const THEME_MODE_KEY = 'coachify-theme'

const LIGHT_FG = '#FFFFFF'
const DARK_FG = '#0F172A'

type RGB = [number, number, number]

/** Accepts #RGB / #RRGGBB (the backend regex) with or without '#'. Returns '#RRGGBB' or null. */
export function normalizeHex(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const raw = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return ('#' + raw.split('').map((c) => c + c).join('')).toUpperCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return ('#' + raw).toUpperCase()
  return null
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: RGB): string {
  const h = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return ('#' + h(r) + h(g) + h(b)).toUpperCase()
}

/** Linear-light mix of `hex` towards `target` by `amount` (0..1). */
function mix(hex: string, target: string, amount: number): string {
  const toLin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const toSrgb = (l: number) =>
    255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055)
  const a = hexToRgb(hex).map(toLin)
  const b = hexToRgb(target).map(toLin)
  return rgbToHex([0, 1, 2].map((i) => toSrgb(a[i] + (b[i] - a[i]) * amount)) as RGB)
}

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** White if it reaches WCAG AA (4.5:1) on `bg`, otherwise whichever of white/dark is higher. */
export function readableForeground(bg: string): string {
  const white = contrastRatio(bg, LIGHT_FG)
  if (white >= 4.5) return LIGHT_FG
  return contrastRatio(bg, DARK_FG) > white ? DARK_FG : LIGHT_FG
}

// Tint (towards white) / shade (towards black) amounts per step; 600 is the
// tenant colour itself, as it was before this refactor.
const SCALE: Array<[step: number, target: string, amount: number]> = [
  [50, '#FFFFFF', 0.92],
  [100, '#FFFFFF', 0.8],
  [200, '#FFFFFF', 0.62],
  [300, '#FFFFFF', 0.44],
  [400, '#FFFFFF', 0.26],
  [500, '#FFFFFF', 0.1],
  [600, '#FFFFFF', 0],
  [700, '#000000', 0.14],
  [800, '#000000', 0.28],
  [900, '#000000', 0.42],
]

export function buildPrimaryScale(primary: string): Record<number, string> {
  const out: Record<number, string> = {}
  for (const [step, target, amount] of SCALE) out[step] = amount ? mix(primary, target, amount) : primary
  return out
}

/**
 * CSS variables derived from the tenant colour. Writes both the design-system
 * tokens (shadcn names) and the legacy template scale (--primary-50..900) so
 * pages not yet migrated follow the tenant colour too.
 */
export function buildThemeVars(input: unknown): Record<string, string> {
  const primary = normalizeHex(input) ?? DEFAULT_PRIMARY
  const scale = buildPrimaryScale(primary)
  const vars: Record<string, string> = {}
  for (const step of Object.keys(scale)) vars['--primary-' + step] = scale[Number(step)]
  vars['--primary'] = primary
  vars['--primary-foreground'] = readableForeground(primary)
  vars['--primary-hover'] = scale[700]
  vars['--primary-active'] = scale[800]
  vars['--primary-soft'] = scale[50]
  vars['--primary-soft-foreground'] = contrastRatio(scale[50], scale[700]) >= 4.5 ? scale[700] : scale[900]
  vars['--ring'] = scale[400]
  return vars
}

/**
 * Dark-mode overrides. The template itself swaps --primary-50 for a translucent
 * tint under [data-theme=dark]; keep that behaviour with the tenant colour.
 */
export function buildDarkThemeVars(input: unknown): Record<string, string> {
  const primary = normalizeHex(input) ?? DEFAULT_PRIMARY
  const scale = buildPrimaryScale(primary)
  return {
    '--primary-50': primary + '0F',
    '--primary-soft': primary + '1F',
    '--primary-soft-foreground': scale[300],
  }
}

const STYLE_ID = 'cf-tenant-theme'

function declarations(vars: Record<string, string>): string {
  return Object.keys(vars).map((k) => k + ':' + vars[k]).join(';')
}

export function buildThemeCss(input: unknown): string {
  return (
    ':root{' + declarations(buildThemeVars(input)) + '}' +
    '[data-theme=dark]{' + declarations(buildDarkThemeVars(input)) + '}'
  )
}

/**
 * Apply a tenant colour at runtime (invalid/missing input falls back to the
 * default). Uses a <style> element appended to <head> — not inline styles — so
 * it lands after the template CSS (wins on equal specificity) while the
 * template's [data-theme=dark] rules still apply.
 */
export function applyThemeColor(input: unknown): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
  }
  el.textContent = buildThemeCss(input)
  document.head.appendChild(el) // (re)append keeps it last in <head>
  // Pre-refactor code set --primary-600 inline; clear it so the rule above applies.
  document.documentElement.style.removeProperty('--primary-600')
}

/** Last known tenant colour: `templateColor`, else `tenant.theme_color`. */
export function readStoredThemeColor(): string | null {
  try {
    const saved = normalizeHex(window.localStorage.getItem(THEME_COLOR_KEY))
    if (saved) return saved
    const tenant = JSON.parse(window.localStorage.getItem(TENANT_KEY) || 'null')
    return normalizeHex(tenant && tenant.theme_color)
  } catch {
    return null
  }
}

/** Runs from the inline <head> script before first paint. */
export function bootTheme(): void {
  try {
    applyThemeColor(readStoredThemeColor())
    const mode = window.localStorage.getItem(THEME_MODE_KEY)
    if (mode === 'light' || mode === 'dark') document.documentElement.setAttribute('data-theme', mode)
  } catch {
    /* storage blocked — keep template defaults */
  }
}
