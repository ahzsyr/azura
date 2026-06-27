"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import type { Content } from "@tiptap/core";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CalloutNode,
  ButtonNode,
  ColumnsNode,
} from "@/features/builder/blocks/content/admin/advanced-rich-text-extensions";

type Props = {
  content: string;
  onChange: (json: string, html: string) => void;
  placeholder?: string;
};

export function AdvancedRichTextEditor({ content, onChange, placeholder = "Write content…" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Placeholder.configure({ placeholder }),
      CalloutNode,
      ButtonNode,
      ColumnsNode,
    ],
    content: (content ? tryParseJson(content) : undefined) as Content | undefined,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(JSON.stringify(ed.getJSON()), ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] rounded-md border bg-background p-3 prose prose-sm max-w-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const parsed = content ? tryParseJson(content) : null;
    if (parsed && JSON.stringify(editor.getJSON()) !== JSON.stringify(parsed)) {
      editor.commands.setContent(parsed as Content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 border rounded-md p-1 bg-muted/30">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} label="• List" />
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().insertContent({ type: "callout", content: [{ type: "paragraph" }] }).run()
          }
          label="Callout"
        />
        <ToolbarBtn
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent({
                type: "cbButton",
                attrs: { href: "/contact", label: "Learn more" },
              })
              .run()
          }
          label="Button"
        />
        <ToolbarBtn
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent({
                type: "cbColumns",
                attrs: { cols: "2" },
                content: [{ type: "paragraph" }, { type: "paragraph" }],
              })
              .run()
          }
          label="2 Cols"
        />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} label="Center" />
        <ToolbarBtn
          onClick={() => {
            const url = window.prompt("Image URL");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          label="Image"
        />
        <ToolbarBtn
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          label="Link"
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClick}>
      {label}
    </Button>
  );
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw.startsWith("<") ? raw : `<p>${raw}</p>`;
  }
}
