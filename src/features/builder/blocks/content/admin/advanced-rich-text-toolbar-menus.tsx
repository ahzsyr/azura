"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { runWithRestoredSelection } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-commands";

type SavedSelection = { from: number; to: number } | null;

type PopoverMenuProps = {
  label: string;
  icon?: LucideIcon;
  /** Receives a `close` callback and the saved selection at the moment the menu opened */
  children: (close: () => void, saved: SavedSelection) => React.ReactNode;
  editor: Editor;
  className?: string;
};

export function ToolbarPopoverMenu({ label, icon: Icon, children, editor, className }: PopoverMenuProps) {
  const [open, setOpen] = useState(false);
  const savedSelRef = useRef<SavedSelection>(null);

  const openMenu = () => {
    const { from, to } = editor.state.selection;
    savedSelRef.current = { from, to };
    setOpen(true);
  };

  const close = useCallback(() => {
    setOpen(false);
    savedSelRef.current = null;
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-xs font-normal"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? close() : openMenu())}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onMouseDown={(e) => {
              e.preventDefault();
              close();
            }}
          />
          <div className="absolute top-full start-0 z-50 mt-1 min-w-[10rem] rounded-md border bg-popover p-1 shadow-md">
            {children(close, savedSelRef.current)}
          </div>
        </>
      )}
    </div>
  );
}

export function ToolbarMenuItem({
  label,
  onClick,
  active,
  destructive,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-left hover:bg-accent disabled:opacity-40 disabled:pointer-events-none",
        active && "bg-accent",
        destructive && "text-destructive"
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
    >
      {label}
    </button>
  );
}

export function AlignMenu({ editor }: { editor: Editor }) {
  const items = [
    { label: "Align left", icon: AlignLeft, value: "left" as const },
    { label: "Align center", icon: AlignCenter, value: "center" as const },
    { label: "Align right", icon: AlignRight, value: "right" as const },
    { label: "Justify", icon: AlignJustify, value: "justify" as const },
  ];

  const active = items.find((i) => editor.isActive({ textAlign: i.value }));

  return (
    <ToolbarPopoverMenu
      label={active?.label.replace("Align ", "") ?? "Align"}
      icon={active?.icon ?? AlignLeft}
      editor={editor}
    >
      {(close, saved) =>
        items.map((item) => (
          <ToolbarMenuItem
            key={item.value}
            label={item.label}
            active={editor.isActive({ textAlign: item.value })}
            onClick={() => {
              runWithRestoredSelection(editor, saved, (ed) =>
                ed.chain().focus().setTextAlign(item.value).run()
              );
              close();
            }}
          />
        ))
      }
    </ToolbarPopoverMenu>
  );
}

export function ListsMenu({ editor }: { editor: Editor }) {
  return (
    <ToolbarPopoverMenu label="Lists" icon={List} editor={editor}>
      {(close, saved) => (
        <>
          <ToolbarMenuItem
            label="Bulleted list"
            active={editor.isActive("bulletList")}
            onClick={() => {
              runWithRestoredSelection(editor, saved, (ed) =>
                ed.chain().focus().toggleBulletList().run()
              );
              close();
            }}
          />
          <ToolbarMenuItem
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => {
              runWithRestoredSelection(editor, saved, (ed) =>
                ed.chain().focus().toggleOrderedList().run()
              );
              close();
            }}
          />
        </>
      )}
    </ToolbarPopoverMenu>
  );
}
