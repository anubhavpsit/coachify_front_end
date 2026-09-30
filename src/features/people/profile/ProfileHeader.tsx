import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { toast } from 'sonner'
import UserAvatar from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { uploadProfileImage, validateProfileImage, type UserProfile } from './profileService'

/** Name, email, role and (only when canEditImage) the profile-image upload. */
export default function ProfileHeader({ user, canEditImage, onUpdated }: { user: UserProfile; canEditImage: boolean; onUpdated: (u: UserProfile) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => {
      URL.revokeObjectURL(url)
      setPreview(null)
    }
  }, [file])

  const pick = (f: File | undefined) => {
    if (!f) return
    const problem = validateProfileImage(f)
    setError(problem)
    setFile(problem ? null : f)
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const updated = await uploadProfileImage(user.id, file)
      if (updated) {
        onUpdated(updated)
        setFile(null)
        toast.success('Profile image updated.')
      }
    } catch (err) {
      console.error('Error uploading profile image', err)
      toast.error('Failed to upload profile image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-4">
      <div className="tw:relative">
        {preview ? (
          <img src={preview} alt="New profile image preview" className="tw:size-16 tw:rounded-full tw:object-cover tw:ring-2 tw:ring-primary" />
        ) : (
          <UserAvatar name={user.name} image={user.profile_image} className="tw:size-16 tw:text-lg" />
        )}
        {canEditImage && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="tw:absolute tw:-right-1 tw:-bottom-1 tw:m-0 tw:flex tw:size-7 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-full tw:border-2 tw:border-solid tw:border-card tw:bg-primary tw:p-0 tw:text-primary-foreground tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50"
              aria-label="Change profile image"
            >
              <Camera className="tw:size-3.5" aria-hidden="true" />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="tw:sr-only"
              aria-label="Profile image"
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </>
        )}
      </div>
      <div className="tw:min-w-0 tw:flex-1">
        <div className="tw:truncate tw:text-lg tw:font-semibold tw:text-foreground">{user.name}</div>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
          <span className="tw:truncate">{user.email}</span>
          <Badge variant="secondary" className="tw:capitalize">
            {user.role.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
      {canEditImage && (file || error) && (
        <div className="tw:flex tw:w-full tw:items-center tw:justify-end tw:gap-2 tw:sm:w-auto">
          {error && <span className="tw:text-xs tw:text-destructive">{error}</span>}
          {file && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={uploading}>
                <X aria-hidden="true" /> Cancel
              </Button>
              <Button size="sm" onClick={() => void upload()} loading={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
