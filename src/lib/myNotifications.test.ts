import { describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { fetchUnreadCount, notificationLink, type InboxNotification } from './myNotifications'
import { getAssessmentBadgeCount } from './assessmentBadge'

const n = (type: string, data: Record<string, unknown> = {}, action_route: string | null = null): InboxNotification => ({
  id: 1, type, type_label: null, title: 't', body: null, created_at: '2026-10-27T08:00:00Z', is_read: false, read_at: null, sender: null, data: { type, ...data }, action_route,
})

describe('notificationLink — assessment tracking', () => {
  it('uses the route the API sent', () => {
    expect(notificationLink(n('assessment_results_due', { assessment_id: 7 }, '/assessments?assessment=7&results=1'), 'teacher')).toBe('/assessments?assessment=7&results=1')
  })

  it('falls back by type: results due / overdue open the results dialog', () => {
    expect(notificationLink(n('assessment_results_due', { assessment_id: 7 }), 'teacher')).toBe('/assessments?assessment=7&results=1')
    expect(notificationLink(n('assessment_results_overdue', { assessment_id: 9 }), 'coaching_admin')).toBe('/assessments?assessment=9&results=1')
  })

  it('several pending → the Needs results tab; daily summary → needs results or today', () => {
    expect(notificationLink(n('assessment_results_due'), 'teacher')).toBe('/assessments?tab=needs_results')
    expect(notificationLink(n('assessment_daily_digest'), 'coaching_admin')).toBe('/assessments?tab=needs_results')
  })

  it('test today / cancelled: students go to My Assessments, staff to Assessments', () => {
    expect(notificationLink(n('assessment_today', { assessment_id: 7 }), 'student')).toBe('/students/assessments?assessment=7')
    expect(notificationLink(n('assessment_today', { assessment_id: 7 }), 'teacher')).toBe('/assessments?assessment=7')
    expect(notificationLink(n('assessment_cancelled', { assessment_id: 7 }), 'student')).toBe('/students/assessments?assessment=7')
    expect(notificationLink(n('assessment_tomorrow_teacher', { assessment_id: 7 }), 'teacher')).toBe('/assessments?assessment=7')
  })
})

describe('assessments menu badge', () => {
  it('rides on the unread-count poll', async () => {
    localStorage.setItem('authToken', 'tok')
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { unread_count: 4, assessments_badge: 3 } } })
    await expect(fetchUnreadCount()).resolves.toBe(4)
    expect(getAssessmentBadgeCount()).toBe(3)
    vi.restoreAllMocks()
  })
})
