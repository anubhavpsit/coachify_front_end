import { useEffect, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading3, Italic, List, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  id?: string
  placeholder?: string
  /** Accessible name (a <label> can't name a contenteditable). */
  label?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

function Tool({ label, active, onClick, disabled, children }: { label: string; active: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'm-0 flex size-8 cursor-pointer items-center justify-center rounded-md border-0 p-0 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
        active ? 'bg-primary-soft text-primary' : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

/** Tiptap editor (same StarterKit + toolbar as the legacy one) in the app's form style. */
export default function RichTextEditor({ value, onChange, disabled, id, placeholder, label, ...aria }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: 'textbox',
        ...(label ? { 'aria-label': label } : {}),
        'aria-multiline': 'true',
        ...(aria['aria-describedby'] ? { 'aria-describedby': aria['aria-describedby'] } : {}),
        ...(aria['aria-invalid'] ? { 'aria-invalid': 'true' } : {}),
        class: 'min-h-36 px-3 py-2 text-sm outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base!',
      },
    },
    // An empty document is "" rather than "<p></p>" so blank stays blank.
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })

  useEffect(() => {
    if (editor && value !== (editor.isEmpty ? '' : editor.getHTML())) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) return null
  const empty = editor.isEmpty

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-solid border-input bg-transparent shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        aria['aria-invalid'] && 'border-destructive',
        disabled && 'opacity-60',
      )}
    >
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-solid border-border bg-muted/40 px-1.5 py-1">
        <Tool label="Bold" active={editor.isActive('bold')} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Italic" active={editor.isActive('italic')} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" aria-hidden="true" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <Tool label="Bulleted list" active={editor.isActive('bulletList')} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Numbered list" active={editor.isActive('orderedList')} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Heading" active={editor.isActive('heading', { level: 3 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="size-4" aria-hidden="true" />
        </Tool>
      </div>
      <div className="relative">
        {empty && placeholder && <p className="pointer-events-none absolute top-2 left-3 m-0 my-1 text-sm text-muted-foreground/60">{placeholder}</p>}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
