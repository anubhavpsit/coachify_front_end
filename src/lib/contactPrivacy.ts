import type { AuthUser } from './auth'

/**
 * Same rule as the API (App\Support\ContactPrivacy): teachers and students
 * never see each other's contact details — only their own. The API already
 * sends null for them; screens use this to drop the empty Email / Phone
 * columns and rows instead of showing "-".
 */
const RESTRICTED_ROLES = ['teacher', 'student']

type Viewer = Pick<AuthUser, 'id' | 'role'> | null | undefined

/** Viewer only ever sees their own contact details. */
export const restrictsContacts = (viewer: Viewer): boolean => !!viewer && RESTRICTED_ROLES.includes(String(viewer.role).toLowerCase())

/** May the viewer see the email / phone / address of user `ownerId`? */
export function seesContactsOf(viewer: Viewer, ownerId?: number | string | null): boolean {
  if (!restrictsContacts(viewer)) return true
  return ownerId != null && Number(ownerId) === Number(viewer!.id)
}
