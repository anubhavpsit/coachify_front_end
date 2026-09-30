/** ₹ with no decimals, locale grouping — same output the dashboard used. */
export const formatCurrency = (value: number) =>
  `₹${Math.round(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export const formatNumber = (value: number) => Math.round(value).toLocaleString()
