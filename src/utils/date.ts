export function formatDate(value?: string | null, placeholder = '-'): string {
  if (!value) return placeholder;
  // Handle strings like "2025-12-01T00:00:00.000000Z" by taking the date prefix
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${m}/${d}/${y}`; // MM/DD/YYYY
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const d = new Date(parsed);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function formatDateTime(
  value?: string | null,
  placeholder = '—',
): string {
  if (!value) return placeholder;
  const date = formatDate(value, placeholder);
  if (date === placeholder || date === value) return date;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return date;
  const d = new Date(parsed);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

