"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NamedColor } from "@/features/builder/blocks/content/admin/advanced-rich-text-toolbar-groups";
import { HIGHLIGHT_COLORS, TEXT_COLORS } from "@/features/builder/blocks/content/admin/advanced-rich-text-toolbar-groups";

type Props = {
  editor: Editor;
  mode: "text" | "highlight";
};

export function AdvancedRichTextColorPicker({ editor, mode }: Props) {
  const [open, setOpen] = useState(false);
  const colors: NamedColor[] = mode === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS;

  const apply = (color: string) => {
    if (mode === "text") {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
    setOpen(false);
  };

  const clear = () => {
    if (mode === "text") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setOpen(false);
  };

  const cols = mode === "text" ? 6 : 4;
  const panelWidth = mode === "text" ? "w-[196px]" : "w-[148px]";

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-xs font-bold"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-label={mode === "text" ? "Text color" : "Highlight color"}
      >
        <span
          className="font-bold text-sm"
          style={
            mode === "text"
              ? { color: "var(--primary)" }
              : {
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                  padding: "0 2px",
                  borderRadius: "2px",
                }
          }
        >
          A
        </span>
      </Button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close color picker"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute top-full start-0 z-50 mt-1 rounded-md border bg-popover p-2 shadow-md",
              panelWidth
            )}
          >
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">
              {mode === "text" ? "Text color" : "Highlight"}
            </p>
            <div className={cn("grid gap-1", `grid-cols-${cols}`)}>
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="h-6 w-6 rounded border border-border/60 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    apply(c.value);
                  }}
                  title={c.label}
                  aria-label={c.label}
                />
              ))}
            </div>
            <button
              type="button"
              className="mt-1.5 w-full text-[10px] text-muted-foreground hover:text-foreground py-0.5 text-center"
              onMouseDown={(e) => {
                e.preventDefault();
                clear();
              }}
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
