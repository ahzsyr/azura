"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Content } from "@tiptap/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { createAdvancedRichTextExtensions } from "@/features/builder/blocks/content/admin/advanced-rich-text-extensions";
import { AdvancedRichTextToolbar } from "@/features/builder/blocks/content/admin/advanced-rich-text-toolbar";
import { AdvancedRichTextBubbleMenu } from "@/features/builder/blocks/content/admin/advanced-rich-text-bubble-menu";
import { AdvancedRichTextSlashMenu } from "@/features/builder/blocks/content/admin/advanced-rich-text-slash-menu";
import { AdvancedRichTextLinkDialog } from "@/features/builder/blocks/content/admin/advanced-rich-text-link-dialog";
import { AdvancedRichTextImageDialog } from "@/features/builder/blocks/content/admin/advanced-rich-text-image-dialog";
import { insertImageFiles, isImageFile } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-upload";
import "./advanced-rich-text-editor.css";

type Props = {
  content: string;
  onChange: (json: string, html: string) => void;
  placeholder?: string;
};

export function AdvancedRichTextEditor({ content, onChange, placeholder = "Write content…" }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const lastEmittedJsonRef = useRef<string | null>(null);
  const isApplyingExternalContentRef = useRef(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  const extensions = useMemo(
    () => createAdvancedRichTextExtensions(placeholder),
    [placeholder]
  );

  const handleUpdate = useCallback(
    (ed: { getJSON: () => unknown; getHTML: () => string }) => {
      if (isApplyingExternalContentRef.current) return;

      const json = JSON.stringify(ed.getJSON());
      if (json === lastEmittedJsonRef.current) return;

      lastEmittedJsonRef.current = json;
      onChange(json, ed.getHTML());
    },
    [onChange]
  );

  const editor = useEditor({
    extensions,
    content: (content ? tryParseJson(content) : undefined) as Content | undefined,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: ed }) => handleUpdate(ed),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none cb-advanced-richtext focus:outline-none",
        "data-placeholder": placeholder ? `${placeholder} — type / for commands` : "Write content… — type / for commands",
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter(isImageFile);
        if (!files.length) return false;
        event.preventDefault();
        void insertImageFiles(files, (url, alt) => {
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          if (pos != null && view.state.schema.nodes.image) {
            view.dispatch(view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src: url, alt })));
          } else {
            editorRef.current?.chain().focus().setImage({ src: url, alt }).run();
          }
        });
        return true;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(isImageFile);
        if (!files.length) return false;
        event.preventDefault();
        void insertImageFiles(files, (url, alt) => {
          editorRef.current?.chain().focus().setImage({ src: url, alt }).run();
        });
        return true;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const refresh = () => {
      setEditorRevision((r) => r + 1);
      setStats({
        words: editor.storage.characterCount?.words?.() ?? 0,
        chars: editor.storage.characterCount?.characters?.() ?? 0,
      });
    };

    refresh();
    editor.on("selectionUpdate", refresh);
    editor.on("update", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("update", refresh);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (content === lastEmittedJsonRef.current) return;

    const parsed = content ? tryParseJson(content) : null;
    if (!parsed) return;

    const currentJson = JSON.stringify(editor.getJSON());
    const parsedJson = JSON.stringify(parsed);
    if (currentJson === parsedJson) {
      lastEmittedJsonRef.current = content;
      return;
    }

    isApplyingExternalContentRef.current = true;
    editor.commands.setContent(parsed as Content, { emitUpdate: false });
    lastEmittedJsonRef.current = JSON.stringify(editor.getJSON());
    isApplyingExternalContentRef.current = false;
    setEditorRevision((r) => r + 1);
  }, [content, editor]);

  if (!editor) return null;

  void editorRevision;

  const { words, chars } = stats;

  return (
    <div className="cb-advanced-richtext-editor rounded-lg border bg-card shadow-sm overflow-hidden">
      <AdvancedRichTextToolbar
        editor={editor}
        onOpenLink={() => setLinkOpen(true)}
        onOpenImage={() => setImageOpen(true)}
      />

      <div className="cb-editor-scroll relative max-h-[min(70vh,600px)] overflow-auto">
        <AdvancedRichTextBubbleMenu
          editor={editor}
          onOpenLink={() => setLinkOpen(true)}
          onOpenImage={() => setImageOpen(true)}
        />
        <AdvancedRichTextSlashMenu editor={editor} onOpenImage={() => setImageOpen(true)} />
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
        <span>{words} words · {chars} characters</span>
        <span>WYSIWYG</span>
      </div>

      <AdvancedRichTextLinkDialog editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
      <AdvancedRichTextImageDialog editor={editor} open={imageOpen} onOpenChange={setImageOpen} />
    </div>
  );
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw.startsWith("<") ? raw : `<p>${raw}</p>`;
  }
}
