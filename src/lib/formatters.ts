/** ₹ with no decimals, locale grouping — same output the dashboard used. */
export const formatCurrency = (value: number) =>
  `₹${Math.round(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export const formatNumber = (value: number) => Math.round(value).toLocaleString()

/** Up to two initials from a name ('?' when empty). */
export function initials(name?: string | null) {
  return name?.trim().split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || '?'
}
