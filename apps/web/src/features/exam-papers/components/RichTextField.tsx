'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Mathematics from '@tiptap/extension-mathematics';
import { Button } from '@/components/ui/button';

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextField({ value, onChange, placeholder }: RichTextFieldProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Subscript,
      Superscript,
      Mathematics.configure({
        katexOptions: {
          displayMode: false,
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'min-h-[120px] rounded-md border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const cleaned = html
        .replace(/\r?\n/g, '') // strip raw newlines
        .replace(/\\n/g, '') // strip escaped literal \n text
        .replace(/<p>\s*<\/p>/g, '') // strip empty paragraph blocks
        .replace(/<p>&nbsp;<\/p>/g, '') // strip empty space blocks
        .trim();
      onChange(cleaned);
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap items-center">
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}>
          Bold
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          Italic
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          Underline
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleStrike().run()}>
          Strikethrough
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleSuperscript().run()}>
          Superscript (x²)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleSubscript().run()}>
          Subscript (x₂)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          Bullet List
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleCode().run()}>
          Code
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => {
          const latex = prompt('Enter LaTeX equation (e.g., \\frac{a}{b}):');
          if (latex) {
            editor?.chain().focus().insertContent(`<span class="math-node" data-latex="${latex}">${latex}</span>`).run();
          }
        }}>
          ∑ Math
        </Button>
      </div>
      <EditorContent editor={editor} />
      {placeholder ? <p className="text-xs text-gray-400">{placeholder}</p> : null}
    </div>
  );
}
