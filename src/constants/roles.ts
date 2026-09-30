export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COACHING_ADMIN: 'coaching_admin',
  STUDENT: 'student',
  TEACHER: 'teacher',
  STAFF: 'staff',
  // add more roles here
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
