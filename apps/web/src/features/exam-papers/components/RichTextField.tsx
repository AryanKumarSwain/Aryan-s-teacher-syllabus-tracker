'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Mathematics from '@tiptap/extension-mathematics';
import { MathEquationDialog } from './MathEquationDialog';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  Sigma,
} from 'lucide-react';

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  fontFamily?: string;
  fontSize?: string;
  color?: string;
}

const tiptapExtensions = [
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
      throwOnError: false,
    },
  }),
];

export function RichTextField({
  value,
  onChange,
  placeholder,
  fontFamily,
  fontSize,
  color,
}: RichTextFieldProps) {
  const [mathModalOpen, setMathModalOpen] = useState(false);

  // Instant local active marks state to eliminate button toggling lag
  const [activeMarks, setActiveMarks] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    superscript: false,
    subscript: false,
    bulletList: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestHtmlRef = useRef<string>(value || '');

  const syncMarks = useCallback((ed: Editor) => {
    setActiveMarks({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      strike: ed.isActive('strike'),
      superscript: ed.isActive('superscript'),
      subscript: ed.isActive('subscript'),
      bulletList: ed.isActive('bulletList'),
    });
  }, []);

  const flushChange = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (latestHtmlRef.current !== value) {
      onChange(latestHtmlRef.current);
    }
  }, [onChange, value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const editor = useEditor({
    extensions: tiptapExtensions,
    immediatelyRender: false,
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] rounded-b-xl border border-t-0 border-slate-200 bg-white p-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed',
      },
      handleDOMEvents: {
        blur: () => {
          flushChange();
          return false;
        },
      },
    },
    onTransaction: ({ editor: ed }) => {
      syncMarks(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      syncMarks(ed);
    },
    onUpdate: ({ editor: ed }) => {
      syncMarks(ed);
      const html = ed.getHTML();
      const cleaned = html
        .replace(/\r?\n/g, '')
        .replace(/\\n/g, '')
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<p>&nbsp;<\/p>/g, '')
        .trim();
      latestHtmlRef.current = cleaned;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onChange(cleaned);
        debounceTimerRef.current = null;
      }, 200);
    },
  });

  // Sync content when value changes externally (and editor is not actively focused/edited)
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML() && !editor.isFocused) {
      latestHtmlRef.current = value;
      editor.commands.setContent(value);
      syncMarks(editor);
    }
  }, [value, editor, syncMarks]);

  const handleInsertMath = (latex: string) => {
    if (!editor) return;
    try {
      const commandSuccess = (editor.commands as any).insertInlineMath?.({ latex });
      if (!commandSuccess) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'inlineMath',
            attrs: { latex },
          })
          .run();
      }
    } catch {
      editor.chain().focus().insertContent(`$${latex}$ `).run();
    }
  };

  return (
    <div className="space-y-1 rounded-xl shadow-2xs">
      {/* Sleek Toolbar Header */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-slate-200 bg-slate-50/90 p-1.5">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor?.chain().focus().toggleBold().run();
          }}
          title="Bold (Ctrl+B)"
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
            activeMarks.bold
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-200/80',
          )}
        >
          <Bold className="h-3.5 w-3.5" />
          <span>Bold</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor?.chain().focus().toggleItalic().run();
          }}
          title="Italic (Ctrl+I)"
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
            activeMarks.italic
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-200/80',
          )}
        >
          <Italic className="h-3.5 w-3.5" />
          <span>Italic</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor?.chain().focus().toggleUnderline().run();
          }}
          title="Underline (Ctrl+U)"
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
            activeMarks.underline
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-200/80',
          )}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
          <span>Underline</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor?.chain().focus().toggleStrike().run();
          }}
          title="Strikethrough"
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
            activeMarks.strike
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-200/80',
          )}
        >
          <Strikethrough className="h-3.5 w-3.5" />
          <span>Strike</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-0.5" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor?.chain().focus().toggleSuperscript().run();
          }}
          title="Superscript (e.g. x²)"
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
            activeMarks.superscript
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-200/80',
          )}
        >
          <span>x²</span>
          <span className="hidden sm:inline">Sup</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor?.chain().focus().toggleSubscript().run();
          }}
          title="Subscript (e.g. x₂)"
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
            activeMarks.subscript
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-200/80',
          )}
        >
          <span>x₂</span>
          <span className="hidden sm:inline">Sub</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor?.chain().focus().toggleBulletList().run();
          }}
          title="Bullet List"
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
            activeMarks.bulletList
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-200/80',
          )}
        >
          <List className="h-3.5 w-3.5" />
          <span>List</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-0.5" />

        {/* Math Equation Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setMathModalOpen(true);
          }}
          title="Insert Math Equation / Formula"
          className="flex h-7 items-center gap-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs active:scale-95"
        >
          <Sigma className="h-3.5 w-3.5 text-indigo-600" />
          <span>∑ Math Formula</span>
        </button>
      </div>

      {/* Editor Content Area styled with dynamic Font, Size & Color */}
      <div
        style={{
          fontFamily: fontFamily || 'inherit',
          fontSize: fontSize || 'inherit',
          color: color || 'inherit',
        }}
        className="[&_.tiptap]:outline-none [&_.tiptap_p]:my-1 [&_.tiptap-mathematics-render]:inline-block [&_.tiptap-mathematics-render]:mx-0.5"
      >
        <EditorContent editor={editor} />
      </div>

      {placeholder ? <p className="text-xs text-muted-foreground px-1">{placeholder}</p> : null}

      {/* Math Equation Dialog */}
      <MathEquationDialog
        open={mathModalOpen}
        onOpenChange={setMathModalOpen}
        onInsert={handleInsertMath}
      />
    </div>
  );
}
