import { useState } from 'react'
import { BarChart3, ClipboardList, LayoutGrid, ReceiptIndianRupee } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAsync } from '@/hooks/useAsync'
import { useAuthUser } from '@/permissions'
import AssessmentsTab from './AssessmentsTab'
import FeesHistoryTab from './FeesHistoryTab'
import InsightsTab from './InsightsTab'
import OverviewTab from './OverviewTab'
import ProfileHeader from './ProfileHeader'
import { fetchFeeSummary, fetchUserProfile, type UserProfile } from './profileService'

export interface UserProfileModalProps {
  userId: number | null
  show: boolean
  onHide: () => void
  /** Caller decides (Staff: staff.manage; Teachers/Students: role coaching_admin). */
  canEditImage: boolean
}

/**
 * Profile of any user, opened from the people lists. Every section keeps its
 * legacy gate, which compares the viewer's raw role (so super_admin gets the
 * non-admin view, PERMISSIONS_MAP Q7):
 *  - Fees summary card: viewer coaching_admin + viewed student + API not 403
 *  - Fees history tab, Next Fee Due / Trial Days: viewer coaching_admin + viewed student
 *  - Assessments + Insights tabs: viewed student + viewer coaching_admin | teacher
 *  - Image upload: canEditImage
 */
export default function UserProfileDialog({ userId, show, onHide, canEditImage }: UserProfileModalProps) {
  const authRole = useAuthUser()?.role ?? ''
  const enabled = show && !!userId
  const profile = useAsync(
    () =>
      fetchUserProfile(userId!).catch((err) => {
        console.error('Error fetching user profile', err)
        return undefined
      }),
    [userId],
    { enabled },
  )
  const [override, setOverride] = useState<UserProfile | null>(null)
  const user = override && override.id === userId ? override : profile.data

  const viewedStudent = user?.role === 'student'
  const isAdminViewer = authRole === 'coaching_admin'
  const showFees = isAdminViewer && viewedStudent
  const showAcademic = viewedStudent && (isAdminViewer || authRole === 'teacher')

  const fees = useAsync(() => fetchFeeSummary(userId!), [userId, user?.id], { enabled: enabled && !!showFees })

  const tabs = [
    { value: 'overview', label: 'Overview', icon: LayoutGrid, show: true },
    { value: 'assessments', label: 'Assessments', icon: ClipboardList, show: showAcademic },
    { value: 'fees', label: 'Fees History', icon: ReceiptIndianRupee, show: showFees },
    { value: 'insights', label: 'Insights', icon: BarChart3, show: showAcademic },
  ].filter((t) => t.show)

  return (
    <Dialog open={show} onOpenChange={(o) => !o && onHide()}>
      <DialogContent className="tw:gap-5 tw:sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription className="tw:sr-only">Profile details</DialogDescription>
        </DialogHeader>

        {profile.loading || !user ? (
          <div className="tw:flex tw:flex-col tw:gap-4" role="status" aria-label="Loading profile">
            <div className="tw:flex tw:items-center tw:gap-4">
              <Skeleton className="tw:size-16 tw:rounded-full" />
              <div className="tw:flex tw:flex-1 tw:flex-col tw:gap-2">
                <Skeleton className="tw:h-5 tw:w-40" />
                <Skeleton className="tw:h-4 tw:w-60" />
              </div>
            </div>
            <Skeleton className="tw:h-32" />
          </div>
        ) : (
          <>
            <ProfileHeader user={user} canEditImage={canEditImage} onUpdated={setOverride} />
            {tabs.length > 1 ? (
              <Tabs key={user.id} defaultValue="overview">
                <TabsList>
                  {tabs.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      <t.icon aria-hidden="true" />
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="overview">
                  <OverviewTab
                    user={user}
                    showFees={!!showFees}
                    showAdminStudentFields={!!showFees}
                    fees={{ loading: fees.loading, summary: fees.data?.summary ?? null, forbidden: !!fees.data?.forbidden, error: fees.data?.error ?? null }}
                  />
                </TabsContent>
                {showAcademic && (
                  <TabsContent value="assessments">
                    <AssessmentsTab studentId={user.id} />
                  </TabsContent>
                )}
                {showFees && (
                  <TabsContent value="fees">
                    <FeesHistoryTab studentId={user.id} />
                  </TabsContent>
                )}
                {showAcademic && (
                  <TabsContent value="insights">
                    <InsightsTab studentId={user.id} />
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              <OverviewTab user={user} showFees={false} showAdminStudentFields={false} fees={{ loading: false, summary: null, forbidden: false, error: null }} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
