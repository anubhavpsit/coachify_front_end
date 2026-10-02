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
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        {preview ? (
          <img src={preview} alt="New profile image preview" className="size-16 rounded-full object-cover ring-2 ring-primary" />
        ) : (
          <UserAvatar name={user.name} image={user.profile_image} className="size-16 text-lg" />
        )}
        {canEditImage && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute -right-1 -bottom-1 m-0 flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-solid border-card bg-primary p-0 text-primary-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Change profile image"
            >
              <Camera className="size-3.5" aria-hidden="true" />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Profile image"
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-semibold text-foreground">{user.name}</div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">{user.email}</span>
          <Badge variant="secondary" className="capitalize">
            {user.role.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
      {canEditImage && (file || error) && (
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {error && <span className="text-xs text-destructive">{error}</span>}
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
