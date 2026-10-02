import { z } from 'zod'
import { requiredText } from '@/lib/validation'
import { toDateTimeInputValue } from '@/utils/date'
import type { ContentType, Fact, FactPayload } from '../services/factsService'

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'link', label: 'Link' },
  { value: 'attachment', label: 'Attachment' },
]

/** Backend upload: image|mimes:jpeg,jpg,png,webp,gif|max:4096 (KB). */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
export function imageProblem(f: File): string | null {
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(f.name.split('.').pop()?.toLowerCase() ?? '')) return 'Only JPG, PNG, WebP or GIF images.'
  if (f.size > 4 * 1024 * 1024) return 'Image is larger than 4 MB.'
  return null
}

const isUrl = (v: string) => {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Mirrors StoreFactRequest: title ≤255, type enum, image/source URLs, tags array, roles, publish date. */
export const factSchema = z
  .object({
    title: requiredText('Title', 255),
    content: z.string().max(5000, 'Keep the content under 5000 characters.'),
    content_type: z.enum(['text', 'image', 'link', 'attachment']),
    image_url: z.string(),
    source_url: z.string().refine((v): boolean => v.trim() === '' || isUrl(v.trim()), 'Enter a full link starting with https://'),
    tags: z.string(),
    target_roles: z.array(z.enum(['student', 'teacher'])),
    class_ids: z.array(z.number()),
    is_published: z.boolean(),
    publish_at: z.string().refine((v): boolean => v === '' || !Number.isNaN(Date.parse(v)), 'Enter a valid date and time.'),
  })
  .superRefine((v, ctx) => {
    if (v.content_type === 'image' && !v.image_url) ctx.addIssue({ code: 'custom', path: ['image_url'], message: 'Upload an image for an image fact.' })
    if (v.content_type === 'link' && !v.source_url.trim()) ctx.addIssue({ code: 'custom', path: ['source_url'], message: 'Add the link for a link fact.' })
    if (v.content_type === 'text' && !v.content.trim()) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Write the fact.' })
  })
export type FactValues = z.infer<typeof factSchema>

export const factDefaults = (f?: Fact | null): FactValues => ({
  title: f?.title ?? '',
  content: f?.content ?? '',
  content_type: f?.content_type ?? 'text',
  image_url: f?.image_url ?? '',
  source_url: f?.source_url ?? '',
  tags: (f?.tags ?? []).join(', '),
  // Legacy reset these to [] on edit (and wiped the audience on save); keep what the fact has.
  target_roles: (f?.target_roles ?? []).filter((r): r is 'student' | 'teacher' => r === 'student' || r === 'teacher'),
  class_ids: [],
  is_published: !!f?.is_published,
  // Local time for <input type=datetime-local> (legacy used UTC, shifting the time on every edit).
  publish_at: toDateTimeInputValue(f?.publish_at ?? null),
})

/**
 * Same body as before. `class_ids` is sent on create, and on edit only when the
 * class picker was touched — the API doesn't return a fact's classes, and an
 * array (even empty) replaces them.
 */
export function toFactPayload(v: FactValues, opts: { editing: boolean; classesTouched: boolean }): FactPayload {
  const p: FactPayload = {
    title: v.title,
    content: v.content || undefined,
    content_type: v.content_type,
    image_url: v.image_url || undefined,
    source_url: v.source_url.trim() || undefined,
    tags: v.tags
      ? v.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    target_roles: v.target_roles,
    is_published: v.is_published,
    publish_at: v.publish_at || undefined,
  }
  if (!opts.editing || opts.classesTouched) p.class_ids = v.target_roles.includes('student') ? v.class_ids : []
  return p
}
