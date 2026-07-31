import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Icon from '../common/Icon.tsx';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  imageUploadUrl?: string;
  disabled?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function RichTextEditor({ value, onChange, imageUploadUrl, disabled }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
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

  const handleImageButtonClick = () => {
    if (!imageUploadUrl) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor || !imageUploadUrl) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}${imageUploadUrl}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const url = response.data?.data?.url;
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image.');
    }
  };

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
        {imageUploadUrl && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleImageButtonClick}
              disabled={disabled}
            >
              <Icon icon="mdi:image-plus-outline" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="d-none"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>
      <div className="px-12 py-8" style={{ minHeight: 160 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
