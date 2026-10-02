import { Copy, Mail, MessageCircle, Share, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { logShare, type Fact, type ShareChannel } from '../services/factsService'

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall back below */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// Brand marks (lucide ships no brand icons).
const FacebookMark = ((props: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7.7V14h2.7v8h3.1Z" />
  </svg>
)) as unknown as LucideIcon
const XMark = ((props: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
  </svg>
)) as unknown as LucideIcon

const canWebShare = typeof navigator !== 'undefined' && 'share' in navigator

/** Same channels, URLs and share logging as before; "Link copied" is a toast instead of alert(). */
export default function ShareSheet({ fact, onClose, onShared }: { fact: Fact | null; onClose: () => void; onShared: (id: number, count: number) => void }) {
  const share = async (channel: ShareChannel) => {
    const f = fact!
    const text = `${f.title}${f.content ? `\n\n${f.content}` : ''}`
    const url = f.source_url || window.location.origin
    try {
      switch (channel) {
        case 'WHATSAPP':
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`, '_blank', 'noopener')
          break
        case 'FACEBOOK':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank', 'noopener')
          break
        case 'TWITTER':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener')
          break
        case 'EMAIL':
          window.location.href = `mailto:?subject=${encodeURIComponent(f.title)}&body=${encodeURIComponent(text + '\n' + url)}`
          break
        case 'COPY_LINK':
          if (await copyText(url)) toast.success('Link copied!')
          else toast.error(`Copy failed: ${url}`)
          break
        case 'WEB_SHARE':
          await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: f.title, text, url })
          break
      }
    } catch {
      /* user cancelled the native share sheet */
    } finally {
      try {
        const n = await logShare(f.id, channel)
        if (n !== undefined) onShared(f.id, n)
      } catch {
        /* non-critical */
      }
      onClose()
    }
  }

  const channels: { ch: ShareChannel; label: string; icon: LucideIcon; cls: string }[] = [
    { ch: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, cls: 'tw:bg-[#25D366] tw:text-white' },
    { ch: 'FACEBOOK', label: 'Facebook', icon: FacebookMark, cls: 'tw:bg-[#1877F2] tw:text-white' },
    { ch: 'TWITTER', label: 'Twitter / X', icon: XMark, cls: 'tw:bg-black tw:text-white' },
    { ch: 'EMAIL', label: 'Email', icon: Mail, cls: 'tw:bg-slate-500 tw:text-white' },
    { ch: 'COPY_LINK', label: 'Copy link', icon: Copy, cls: 'tw:bg-muted tw:text-foreground' },
    ...(canWebShare ? [{ ch: 'WEB_SHARE' as const, label: 'More options', icon: Share, cls: 'tw:bg-muted tw:text-foreground' }] : []),
  ]

  return (
    <Dialog open={!!fact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="tw:sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription className="tw:line-clamp-1">{fact?.title}</DialogDescription>
        </DialogHeader>
        <div className="tw:grid tw:grid-cols-2 tw:gap-2.5">
          {channels.map(({ ch, label, icon: Icon, cls }) => (
            <button
              key={ch}
              type="button"
              onClick={() => void share(ch)}
              className={cn('tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-2.5 tw:rounded-xl tw:border-0 tw:px-3.5 tw:py-3 tw:text-sm tw:font-semibold tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:hover:opacity-90', cls)}
            >
              <Icon className="tw:size-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
