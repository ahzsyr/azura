"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Table } from "lucide-react";

type Props = {
  editor: Editor;
  onOpenTableProperties?: () => void;
};

export function AdvancedRichTextTableMenu({ editor }: Props) {
  const [open, setOpen] = useState(false);

  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-label="Insert table"
      >
        <Table className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute top-full start-0 z-50 mt-1 rounded-md border bg-popover p-2 shadow-md">
            <p className="text-[10px] text-muted-foreground mb-1 px-1">Insert table</p>
            <div className="grid grid-cols-6 gap-0.5">
              {Array.from({ length: 36 }, (_, i) => {
                const row = Math.floor(i / 6) + 1;
                const col = (i % 6) + 1;
                return (
                  <button
                    key={i}
                    type="button"
                    className="h-4 w-4 border border-border/60 hover:bg-primary/20"
                    title={`${row}×${col}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertTable(row, col);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
