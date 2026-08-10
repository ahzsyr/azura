"use client";

import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HtmlElement } from "../types";
import { TAG_LABELS } from "../defaults";
import { getElementForm } from "./element-forms";
import { AdvancedAttributesPanel } from "./element-forms/advanced-attributes-panel";

type Props = {
  element: HtmlElement;
  index: number;
  total: number;
  onChange: (patch: Partial<HtmlElement>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHidden: () => void;
  onInsertLineBreakAfter: () => void;
  onRemove: () => void;
  open: boolean;
  onToggleOpen: () => void;
  dragHandle?: React.ReactNode;
};

export function ElementCard({
  element,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
  onInsertLineBreakAfter,
  onRemove,
  open,
  onToggleOpen,
  dragHandle,
}: Props) {
  const tagLabel = TAG_LABELS[element.tag] ?? `<${element.tag}>`;
  const hasRaw = element.rawHtml !== undefined;
  const FormComponent = getElementForm(element);

  return (
    <div className={cn("rounded-md border bg-card overflow-hidden", element.hidden && "opacity-50")}>
      {/* Header */}
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1">
        {dragHandle}
        <span className="w-5 shrink-0 text-[10px] font-medium text-muted-foreground text-center">
          {index + 1}.
        </span>
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 min-w-0 text-start"
          onClick={onToggleOpen}
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
          <span className="truncate text-[11px] font-medium text-muted-foreground">
            {tagLabel}
            {hasRaw && (
              <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px]">raw</span>
            )}
            {element.hidden && (
              <span className="ml-1 text-[9px] text-muted-foreground">(hidden)</span>
            )}
          </span>
          {element.text && (
            <span className="truncate text-[11px] text-foreground/60 min-w-0">
              — {element.text.slice(0, 40)}{element.text.length > 40 ? "…" : ""}
            </span>
          )}
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
            disabled={index === 0} onClick={onMoveUp} aria-label="Move up">
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
            disabled={index === total - 1} onClick={onMoveDown} aria-label="Move down">
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
            onClick={onToggleHidden} aria-label={element.hidden ? "Show" : "Hide"}>
            {element.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onInsertLineBreakAfter}
            aria-label="Insert line break after"
            title="Insert line break after"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button type="button" variant="ghost" size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Form body */}
      {open && (
        <>
          <FormComponent element={element} onChange={onChange} />
          {!element.rawHtml && (
            <AdvancedAttributesPanel element={element} onChange={onChange} />
          )}
        </>
      )}
    </div>
  );
}
