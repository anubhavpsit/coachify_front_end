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
        'tw:m-0 tw:flex tw:size-8 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:p-0 tw:transition-colors tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:disabled:opacity-50',
        active ? 'tw:bg-primary-soft tw:text-primary' : 'tw:bg-transparent tw:text-muted-foreground tw:hover:bg-muted tw:hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

/** Tiptap editor (same StarterKit + toolbar as the legacy one) in the app's form style. */
export default function RichTextEditor({ value, onChange, disabled, id, placeholder, ...aria }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
        ...(aria['aria-describedby'] ? { 'aria-describedby': aria['aria-describedby'] } : {}),
        ...(aria['aria-invalid'] ? { 'aria-invalid': 'true' } : {}),
        class: 'tw:min-h-36 tw:px-3 tw:py-2 tw:text-sm tw:outline-none tw:[&_ol]:pl-5 tw:[&_ul]:pl-5 tw:[&_p]:my-1 tw:[&_h3]:mt-2 tw:[&_h3]:mb-1 tw:[&_h3]:text-base!',
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
        'tw:overflow-hidden tw:rounded-md tw:border tw:border-solid tw:border-input tw:bg-transparent tw:shadow-xs tw:transition-[border-color,box-shadow] tw:focus-within:border-ring tw:focus-within:ring-[3px] tw:focus-within:ring-ring/50',
        aria['aria-invalid'] && 'tw:border-destructive',
        disabled && 'tw:opacity-60',
      )}
    >
      <div role="toolbar" aria-label="Formatting" className="tw:flex tw:flex-wrap tw:items-center tw:gap-0.5 tw:border-b tw:border-solid tw:border-border tw:bg-muted/40 tw:px-1.5 tw:py-1">
        <Tool label="Bold" active={editor.isActive('bold')} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="tw:size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Italic" active={editor.isActive('italic')} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="tw:size-4" aria-hidden="true" />
        </Tool>
        <span className="tw:mx-1 tw:h-5 tw:w-px tw:bg-border" aria-hidden="true" />
        <Tool label="Bulleted list" active={editor.isActive('bulletList')} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="tw:size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Numbered list" active={editor.isActive('orderedList')} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="tw:size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Heading" active={editor.isActive('heading', { level: 3 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="tw:size-4" aria-hidden="true" />
        </Tool>
      </div>
      <div className="tw:relative">
        {empty && placeholder && <p className="tw:pointer-events-none tw:absolute tw:top-2 tw:left-3 tw:m-0 tw:my-1 tw:text-sm tw:text-muted-foreground/60">{placeholder}</p>}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
