import { z } from 'zod'
import type { CommunicationPayload, EnquiryPayload } from '../services/enquiriesService'

const optional = (label: string, max: number) => z.string().trim().max(max, `${label} must be at most ${max} characters.`)

/** EnquiryController: name req ≤255, contact_number req ≤50, email email ≤255, school ≤255, class_grade ≤100, subjects ≤500. */
export const enquirySchema = z.object({
  enquiry_type: z.enum(['student', 'teacher']),
  name: z.string().trim().min(1, 'Name is required.').max(255, 'Name must be at most 255 characters.'),
  contact_number: z.string().trim().min(1, 'Contact number is required.').max(50, 'Contact number must be at most 50 characters.'),
  email: z
    .string()
    .trim()
    .max(255, 'Email must be at most 255 characters.')
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address.'),
  school_name: optional('School name', 255),
  class_grade: optional('Class / Grade', 100),
  subjects_interested: optional('Subjects', 500),
  description: z.string().trim(),
})
export type EnquiryValues = z.infer<typeof enquirySchema>
export const ENQUIRY_FIELDS = ['enquiry_type', 'name', 'contact_number', 'email', 'school_name', 'class_grade', 'subjects_interested', 'description'] as const

export const enquiryDefaults = (): EnquiryValues => ({
  enquiry_type: 'student',
  name: '',
  contact_number: '',
  email: '',
  school_name: '',
  class_grade: '',
  subjects_interested: '',
  description: '',
})

/** Legacy body: trimmed, empty optional fields → null. */
export function toEnquiryPayload(v: EnquiryValues): EnquiryPayload {
  return {
    enquiry_type: v.enquiry_type,
    name: v.name,
    contact_number: v.contact_number,
    email: v.email || null,
    school_name: v.school_name || null,
    class_grade: v.class_grade || null,
    subjects_interested: v.subjects_interested || null,
    description: v.description || null,
  }
}

/** Communication log: channel in:email,whatsapp,sms,other (required). */
export const communicationSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'sms', 'other'], { error: 'Channel is required.' }),
  notes: z.string(),
  communicated_at: z.string(),
})
export type CommunicationValues = z.infer<typeof communicationSchema>
export const communicationDefaults = (): CommunicationValues => ({ channel: 'email', notes: '', communicated_at: '' })

/** datetime-local is zone-less local time; send real UTC (legacy did the same). */
export function toCommunicationPayload(v: CommunicationValues): CommunicationPayload {
  return {
    channel: v.channel,
    notes: v.notes.trim() || null,
    communicated_at: v.communicated_at.trim() ? new Date(v.communicated_at).toISOString() : undefined,
  }
}
