"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";

const SPECIAL_CHARS = [
  "©", "®", "™", "–", "—", "•", "→", "←", "↑", "↓",
  "°", "±", "×", "÷", "½", "¼", "¾", "€", "£", "¥",
  "§", "¶", "†", "‡", "…", "«", "»", "‘", "’", "“", "”",
];

const EMOJIS = ["😀", "😊", "👍", "🎉", "✅", "❤️", "⭐", "🔥", "💡", "📌", "🚀", "✨"];

type Props = {
  editor: Editor;
  mode: "chars" | "emoji";
};

export function AdvancedRichTextSpecialChars({ editor, mode }: Props) {
  const [open, setOpen] = useState(false);
  const items = mode === "chars" ? SPECIAL_CHARS : EMOJIS;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-xs"
        onClick={() => setOpen((v) => !v)}
        aria-label={mode === "chars" ? "Special characters" : "Emoji"}
      >
        {mode === "chars" ? "Ω" : "😀"}
      </Button>
      {open && (
        <div className="absolute top-full start-0 z-50 mt-1 max-h-40 w-48 overflow-auto rounded-md border bg-popover p-2 shadow-md grid grid-cols-6 gap-1">
          {items.map((ch) => (
            <button
              key={ch}
              type="button"
              className="h-7 rounded hover:bg-accent text-sm"
              onClick={() => {
                editor.chain().focus().insertContent(ch).run();
                setOpen(false);
              }}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
