"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type ToolbarButtonProps = {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
};

export function ToolbarButton({
  onClick,
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0 shrink-0", active && "bg-accent text-accent-foreground")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut ? ` (${shortcut})` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function ToolbarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-0.5 shrink-0", className)}>{children}</div>;
}

export function ToolbarDivider({ className }: { className?: string }) {
  return <div className={cn("h-6 w-px bg-border/80 mx-1 shrink-0", className)} aria-hidden />;
}

export function ToolbarSelect({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onMouseDown={(e) => e.preventDefault()}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded-md border bg-background px-2 text-xs text-foreground",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export const FORMAT_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "1", label: "Heading 1" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
];

export const FONT_FAMILY_OPTIONS = [
  { value: "", label: "Default" },
  { value: "Georgia, serif", label: "Serif" },
  { value: "system-ui, sans-serif", label: "Sans" },
  { value: "ui-monospace, monospace", label: "Monospace" },
];

export const FONT_SIZE_OPTIONS = [
  { value: "", label: "Size" },
  { value: "12px", label: "12px" },
  { value: "14px", label: "14px" },
  { value: "16px", label: "16px" },
  { value: "18px", label: "18px" },
  { value: "24px", label: "24px" },
  { value: "32px", label: "32px" },
];

export type NamedColor = { value: string; label: string };

/** Text colors — all theme CSS variables so they adapt with the active preset. */
export const TEXT_COLORS: NamedColor[] = [
  { value: "var(--foreground)", label: "Default" },
  { value: "var(--muted-foreground)", label: "Muted" },
  { value: "var(--primary)", label: "Primary" },
  { value: "var(--accent)", label: "Accent" },
  { value: "var(--destructive)", label: "Destructive" },
  { value: "var(--secondary-foreground)", label: "Secondary" },
  { value: "#dc2626", label: "Red" },
  { value: "#ea580c", label: "Orange" },
  { value: "#ca8a04", label: "Yellow" },
  { value: "#16a34a", label: "Green" },
  { value: "#2563eb", label: "Blue" },
  { value: "#7c3aed", label: "Purple" },
];

/** Highlight colors — theme-aware surface variants + fixed pastels. */
export const HIGHLIGHT_COLORS: NamedColor[] = [
  { value: "var(--primary)", label: "Primary" },
  { value: "var(--accent)", label: "Accent" },
  { value: "#fef08a", label: "Yellow" },
  { value: "#bbf7d0", label: "Green" },
  { value: "#bfdbfe", label: "Blue" },
  { value: "#fbcfe8", label: "Pink" },
  { value: "#fed7aa", label: "Orange" },
  { value: "#e5e7eb", label: "Gray" },
];

export function getActiveFormat(editor: Editor): string {
  for (const level of [1, 2, 3, 4] as const) {
    if (editor.isActive("heading", { level })) return String(level);
  }
  return "paragraph";
}

export function applyFormat(editor: Editor, value: string): void {
  if (value === "paragraph") {
    editor.chain().focus().setParagraph().run();
    return;
  }
  const level = Number(value) as 1 | 2 | 3 | 4;
  editor.chain().focus().toggleHeading({ level }).run();
}
