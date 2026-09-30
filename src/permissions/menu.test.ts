import { describe, expect, it } from 'vitest'
import legacy from './__fixtures__/legacy-sidebar.json'
import { visibleNavGroups } from './menu'
import { createPermissionApi } from './usePermission'
import type { AuthUser } from '@/lib/auth'

// Keys used when the fixture was captured from the pre-refactor Sidebar.tsx.
const KEYS = ['facts.manage','content_library.manage','insights.view','students.view','students.manage','assessments.view','assessments.manage','assessments.grade','teachers.view','teachers.manage','staff.manage','expenses.view','expenses.manage','attendance.mark','daily_activities.approve','generated_content.approve','subjects.manage','classes.manage','academic_years.manage','fees.view','fees.manage','enquiries.view','enquiries.manage','attendance.corrections','notifications.manage']

function userFor(name: string): AuthUser | null {
  if (name === 'anonymous') return null
  const [role, key] = name.split('+')
  const permissions = key === 'ALL' ? KEYS : key ? [key] : []
  return { id: 1, name: 'U', email: 'u@x', role, tenant_id: 1, permissions }
}

describe('menu visibility matches the legacy sidebar', () => {
  for (const [name, entries] of Object.entries(legacy as Record<string, string[]>)) {
    it(name, () => {
      // Legacy rendered some links twice (Insights, Approvals); the new menu shows each once.
      const expected = [...new Set(entries.map((e) => e.split('|')[0]))].sort()
      const actual = visibleNavGroups(createPermissionApi(userFor(name)))
        .flatMap((g) => g.items.map((i) => i.to))
        .sort()
      expect(actual).toEqual(expected)
    })
  }
})
