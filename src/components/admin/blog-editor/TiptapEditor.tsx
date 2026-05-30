'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading2, Heading3, List, ListOrdered, Quote, Link2, Undo2, Redo2,
  FileCode2, Pencil,
} from 'lucide-react'
import { countWordsFromHtml, sanitizeBlogHtml } from '@/lib/blog-html'

export default function TiptapEditor({
  value,
  onChange,
  placeholder = 'Write your story…',
}: {
  value: string
  onChange: (html: string, wordCount: number) => void
  placeholder?: string
}) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const [htmlDraft, setHtmlDraft] = useState(value || '')

  const editor = useEditor({
    // Don't render on the server — ProseMirror needs the DOM
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Sensible defaults for blog content
        bulletList:  { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener nofollow', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-content focus:outline-none',
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      const wordCount = editor.getText().split(/\s+/).filter(Boolean).length
      onChange(html, wordCount)
      if (mode === 'visual') setHtmlDraft(html)
    },
  })

  // If the parent resets the value (e.g. server refresh), sync the editor.
  useEffect(() => {
    if (!editor) return
    if (mode === 'visual' && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value, mode])

  if (!editor) {
    return (
      <div
        className="flex-1 px-6 py-10 italic"
        style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '1.0625rem',
          color: 'var(--admin-on-surface-variant)',
        }}
      >
        Loading editor…
      </div>
    )
  }
  const activeEditor = editor

  const wordCount = activeEditor.getText().split(/\s+/).filter(Boolean).length

  function switchToHtml() {
    const currentHtml = activeEditor.getHTML()
    setHtmlDraft(currentHtml)
    setMode('html')
  }

  function switchToVisual() {
    const clean = sanitizeBlogHtml(htmlDraft)
    setHtmlDraft(clean)
    activeEditor.commands.setContent(clean || '', { emitUpdate: false })
    onChange(clean, countWordsFromHtml(clean))
    setMode('visual')
  }

  function handleHtmlChange(raw: string) {
    setHtmlDraft(raw)
    const clean = sanitizeBlogHtml(raw)
    onChange(clean, countWordsFromHtml(clean))
  }

  return (
    <>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-3 py-2 flex-wrap"
        style={{
          borderBottom: '1px solid var(--admin-outline-variant)',
          background: 'var(--admin-surface-low)',
        }}
      >
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')} label="Bold"><Bold size={16} /></TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')} label="Italic"><Italic size={16} /></TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')} label="Underline"><UnderlineIcon size={16} /></TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')} label="Strikethrough"><Strikethrough size={16} /></TBtn>

        <Divider />

        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })} label="Heading 2"><Heading2 size={16} /></TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })} label="Heading 3"><Heading3 size={16} /></TBtn>

        <Divider />

        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')} label="Bullet list"><List size={16} /></TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')} label="Numbered list"><ListOrdered size={16} /></TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')} label="Quote"><Quote size={16} /></TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')} label="Inline code"><Code size={16} /></TBtn>

        <Divider />

        <TBtn
          editor={editor}
          cmd={() => {
            const prev = editor.getAttributes('link').href as string | undefined
            const url = window.prompt('Link URL (leave empty to remove)', prev ?? '')
            if (url === null) return
            if (url === '') {
              editor.chain().focus().unsetLink().run()
            } else {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
            }
          }}
          active={editor.isActive('link')}
          label="Link"
        >
          <Link2 size={16} />
        </TBtn>

        <Divider />

        <TBtn editor={editor} cmd={() => editor.chain().focus().undo().run()} active={false} label="Undo">
          <Undo2 size={16} />
        </TBtn>
        <TBtn editor={editor} cmd={() => editor.chain().focus().redo().run()} active={false} label="Redo">
          <Redo2 size={16} />
        </TBtn>

        <div className="flex-1" />

        <div
          className="inline-flex rounded-lg p-0.5"
          style={{
            background: 'var(--admin-surface-container)',
            border: '1px solid var(--admin-outline-variant)',
          }}
          aria-label="Editor mode"
        >
          <ModeButton active={mode === 'visual'} label="Visual editor" onClick={() => {
            if (mode !== 'visual') switchToVisual()
          }}>
            <Pencil size={14} />
            Visual
          </ModeButton>
          <ModeButton active={mode === 'html'} label="HTML source editor" onClick={() => {
            if (mode !== 'html') switchToHtml()
          }}>
            <FileCode2 size={14} />
            HTML
          </ModeButton>
        </div>

        <span
          className="px-3"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
          }}
        >
          Words: {(mode === 'html' ? countWordsFromHtml(sanitizeBlogHtml(htmlDraft)) : wordCount).toLocaleString()}
        </span>
      </div>

      {/* Content surface */}
      {mode === 'html' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="px-4 py-3"
            style={{
              background: 'rgba(234, 244, 226, 0.55)',
              borderBottom: '1px solid var(--admin-outline-variant)',
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              color: 'var(--admin-on-surface-variant)',
              lineHeight: 1.5,
            }}
          >
            Paste or edit safe HTML here. Scripts, unsafe attributes, and unsupported embed sources are removed automatically before saving.
          </div>
          <textarea
            value={htmlDraft}
            onChange={(e) => handleHtmlChange(e.target.value)}
            spellCheck={false}
            aria-label="Blog post HTML"
            className="flex-1 custom-scrollbar"
            style={{
              resize: 'none',
              width: '100%',
              border: 'none',
              borderRadius: 0,
              padding: '1.25rem',
              background: '#101b10',
              color: '#f7f4eb',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '0.875rem',
              lineHeight: 1.65,
              outline: 'none',
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <EditorContent editor={editor} />
        </div>
      )}

      {/* Prose styles — scoped to the editor surface */}
      <style jsx global>{`
        .tiptap-content {
          padding: 1.5rem 1.75rem 4rem;
          font-family: var(--font-eb-garamond);
          font-size: 1.125rem;
          line-height: 1.7;
          color: var(--admin-on-surface);
          min-height: 100%;
        }
        .tiptap-content p { margin: 0 0 1em; }
        .tiptap-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--admin-outline-variant);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap-content h2 {
          font-family: var(--font-eb-garamond);
          font-size: 1.875rem;
          font-weight: 600;
          color: var(--admin-primary-container);
          margin: 1.5em 0 0.5em;
          line-height: 1.2;
        }
        .tiptap-content h3 {
          font-family: var(--font-eb-garamond);
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--admin-primary-container);
          margin: 1.25em 0 0.4em;
          line-height: 1.25;
        }
        .tiptap-content ul, .tiptap-content ol {
          padding-left: 1.5em;
          margin: 0 0 1em;
        }
        .tiptap-content ul li, .tiptap-content ol li { margin: 0.25em 0; }
        .tiptap-content ul { list-style: disc; }
        .tiptap-content ol { list-style: decimal; }
        .tiptap-content blockquote {
          border-left: 4px solid var(--admin-celadon);
          padding: 0.5em 0 0.5em 1.25em;
          margin: 1.25em 0;
          font-style: italic;
          color: var(--admin-primary-container);
          font-family: var(--font-eb-garamond);
        }
        .tiptap-content code {
          background: var(--admin-surface-container);
          padding: 0.125em 0.375em;
          border-radius: 0.25em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.92em;
          color: var(--admin-primary-container);
        }
        .tiptap-content pre {
          background: var(--admin-primary-container);
          color: var(--admin-bg);
          padding: 1em 1.25em;
          border-radius: 0.5em;
          overflow-x: auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.9em;
          line-height: 1.5;
          margin: 1.25em 0;
        }
        .tiptap-content pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
        .tiptap-content a {
          color: var(--admin-primary-container);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .tiptap-content strong { font-weight: 700; }
        .tiptap-content em { font-style: italic; }
        .tiptap-content u { text-decoration: underline; }
        .tiptap-content .ProseMirror-focused { outline: none; }
      `}</style>
    </>
  )
}

function TBtn({
  editor, cmd, active, label, children,
}: {
  editor: Editor
  cmd: () => void
  active: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={() => { cmd(); editor.commands.focus() }}
      className="p-1.5 rounded transition-colors"
      style={{
        background: active ? 'var(--admin-celadon-pale)' : 'transparent',
        color:      active ? 'var(--admin-primary-container)' : 'var(--admin-on-surface-variant)',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--admin-surface-container)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return (
    <div
      className="w-px h-5 mx-1"
      style={{ background: 'var(--admin-outline-variant)' }}
      aria-hidden
    />
  )
}

function ModeButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
      style={{
        border: 'none',
        background: active ? 'var(--admin-surface)' : 'transparent',
        color: active ? 'var(--admin-primary-container)' : 'var(--admin-on-surface-variant)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.75rem',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
