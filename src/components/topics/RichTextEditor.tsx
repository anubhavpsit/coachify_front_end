import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Icon from '../common/Icon.tsx';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  return (
    <div className="rich-text-editor border radius-8 overflow-hidden">
      <div className="d-flex align-items-center gap-2 border-bottom bg-neutral-50 px-8 py-4 flex-wrap">
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('bold') ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
        >
          <Icon icon="mdi:format-bold" />
        </button>
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('italic') ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
        >
          <Icon icon="mdi:format-italic" />
        </button>
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('bulletList') ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
        >
          <Icon icon="mdi:format-list-bulleted" />
        </button>
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('orderedList') ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
        >
          <Icon icon="mdi:format-list-numbered" />
        </button>
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('heading', { level: 3 }) ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
        >
          H3
        </button>
      </div>
      <div className="px-12 py-8" style={{ minHeight: 160 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
