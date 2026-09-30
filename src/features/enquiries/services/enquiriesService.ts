import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy EnquiriesPage.
const opts = (token: string) => ({ headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
const requireToken = () => {
  const token = localStorage.getItem('authToken')
  if (!token) throw new Error('You are not authenticated.')
  return token
}

export type EnquiryType = 'student' | 'teacher'
export type Channel = 'email' | 'whatsapp' | 'sms' | 'other'
export type Enquiry = {
  id: number
  tenant_id: number
  enquiry_type: EnquiryType
  name: string
  contact_number: string
  email?: string | null
  school_name?: string | null
  class_grade?: string | null
  subjects_interested?: string | null
  description?: string | null
  status: 'active' | 'inactive'
  last_communication_at?: string | null
  communications_count?: number
  created_at: string
}
export type Communication = { id: number; channel: Channel; notes?: string | null; communicated_at?: string | null; created_at: string }
export type EnquiryDetail = Enquiry & { communications?: Communication[] }
export type EnquiryPayload = {
  enquiry_type: EnquiryType
  name: string
  contact_number: string
  email: string | null
  school_name: string | null
  class_grade: string | null
  subjects_interested: string | null
  description: string | null
}
export type CommunicationPayload = { channel: Channel; notes: string | null; communicated_at?: string }

export async function fetchEnquiries(status: 'all' | 'active' | 'inactive'): Promise<Enquiry[]> {
  const query = status !== 'all' ? `?status=${status}` : ''
  const res = await axios.get<{ success: boolean; data: Enquiry[] }>(`${API_BASE_URL}/enquiries${query}`, opts(requireToken()))
  if (!res.data.success) throw new Error('Unable to load enquiries.')
  return res.data.data || []
}

export async function createEnquiry(payload: EnquiryPayload): Promise<Enquiry | null> {
  const res = await axios.post<{ success: boolean; data: Enquiry }>(`${API_BASE_URL}/enquiries`, payload, opts(requireToken()))
  return res.data.success ? res.data.data : null
}

export async function setEnquiryStatus(id: number, status: 'active' | 'inactive'): Promise<Enquiry | null> {
  const res = await axios.put<{ success: boolean; data: Enquiry }>(`${API_BASE_URL}/enquiries/${id}`, { status }, opts(requireToken()))
  return res.data.success ? res.data.data : null
}

export async function fetchEnquiry(id: number): Promise<EnquiryDetail | null> {
  const res = await axios.get<{ success: boolean; data: EnquiryDetail }>(`${API_BASE_URL}/enquiries/${id}`, opts(requireToken()))
  return res.data.success ? res.data.data : null
}

export async function addCommunication(id: number, payload: CommunicationPayload): Promise<EnquiryDetail | null> {
  const res = await axios.post<{ success: boolean; data: { enquiry: EnquiryDetail } }>(`${API_BASE_URL}/enquiries/${id}/communications`, payload, opts(requireToken()))
  return res.data.success ? res.data.data.enquiry : null
}
