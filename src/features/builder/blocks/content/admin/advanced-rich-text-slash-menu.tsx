"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { Editor } from "@tiptap/react";
import {
  AlignLeft,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Table,
} from "lucide-react";

type SlashCommand = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  run: (editor: Editor) => void;
};

type Props = {
  editor: Editor;
  onOpenImage: () => void;
};

export function AdvancedRichTextSlashMenu({ editor, onOpenImage }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const commands = useMemo<SlashCommand[]>(
    () => [
      {
        id: "h1",
        label: "Heading 1",
        description: "Large section heading",
        icon: Heading1,
        keywords: ["heading", "h1", "title"],
        run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: "h2",
        label: "Heading 2",
        description: "Medium section heading",
        icon: Heading2,
        keywords: ["heading", "h2", "subtitle"],
        run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: "h3",
        label: "Heading 3",
        description: "Small section heading",
        icon: Heading3,
        keywords: ["heading", "h3"],
        run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: "paragraph",
        label: "Paragraph",
        description: "Plain body text",
        icon: AlignLeft,
        keywords: ["text", "paragraph", "body"],
        run: (e) => e.chain().focus().setParagraph().run(),
      },
      {
        id: "list",
        label: "Bulleted list",
        description: "Create an unordered list",
        icon: List,
        keywords: ["bullet", "list", "ul"],
        run: (e) => e.chain().focus().toggleBulletList().run(),
      },
      {
        id: "ordered",
        label: "Numbered list",
        description: "Create a numbered list",
        icon: ListOrdered,
        keywords: ["numbered", "ordered", "ol"],
        run: (e) => e.chain().focus().toggleOrderedList().run(),
      },
      {
        id: "image",
        label: "Image",
        description: "Insert an image from the media library",
        icon: ImageIcon,
        keywords: ["photo", "picture", "media"],
        run: () => onOpenImage(),
      },
      {
        id: "table",
        label: "Table",
        description: "Insert a structured data table",
        icon: Table,
        keywords: ["grid", "spreadsheet", "data"],
        run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ],
    [onOpenImage]
  );

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return cmd.label.toLowerCase().includes(q) || cmd.keywords.some((k) => k.includes(q));
  });

  useEffect(() => {
    const sync = () => {
      const { $from, empty } = editor.state.selection;
      if (!empty) {
        setOpen(false);
        return;
      }
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
      const match = textBefore.match(/(?:^|\s)\/([a-z0-9]*)$/i);
      if (!match) {
        setOpen(false);
        return;
      }
      setQuery(match[1] ?? "");
      setSelected(0);

      const coords = editor.view.coordsAtPos($from.pos);
      const scrollEl = editor.view.dom.closest(".cb-editor-scroll") as HTMLElement | null;
      const scrollRect = scrollEl?.getBoundingClientRect() ?? { top: 0, left: 0 };
      const scrollTop = scrollEl?.scrollTop ?? 0;

      setPosition({
        top: coords.bottom - scrollRect.top + scrollTop + 6,
        left: coords.left - scrollRect.left,
      });
      setOpen(true);
    };

    editor.on("selectionUpdate", sync);
    editor.on("update", sync);
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("update", sync);
    };
  }, [editor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        applyCommand(filtered[selected]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, selected]);

  const applyCommand = (cmd: SlashCommand) => {
    const { $from } = editor.state.selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
    const match = textBefore.match(/(?:^|\s)\/([a-z0-9]*)$/i);
    if (match) {
      const slashPart = `/${match[1] ?? ""}`;
      const deleteFrom = $from.pos - slashPart.length;
      editor.chain().focus().deleteRange({ from: deleteFrom, to: $from.pos }).run();
    }
    cmd.run(editor);
    setOpen(false);
    setQuery("");
  };

  if (!open || filtered.length === 0) return null;

  return (
    <div
      className="absolute z-[60] w-56 max-h-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
      role="listbox"
    >
      <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Insert</p>
      {filtered.map((cmd, index) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.id}
            type="button"
            role="option"
            aria-selected={index === selected}
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent ${
              index === selected ? "bg-accent" : ""
            }`}
            onMouseEnter={() => setSelected(index)}
            onClick={() => applyCommand(cmd)}
          >
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex flex-col min-w-0">
              <span className="text-xs font-medium leading-tight">{cmd.label}</span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight">{cmd.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
