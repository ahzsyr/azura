"use client";

import { useEffect, useState } from "react";
import type { TranslationStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TranslationStatusBadge } from "./translation-status-badge";
import {
  getCellStateClass,
  getEditorConfig,
  resolveCellState,
  type MessageSemanticRole,
} from "@/features/translation/ui-message-meta";
import { cn } from "@/lib/utils";

type Props = {
  namespace: string;
  messageKey: string;
  fullKey: string;
  role: MessageSemanticRole;
  localeCode: string;
  englishValue: string;
  value: string;
  fileFallback: string;
  dbStatus?: TranslationStatus;
  density: "compact" | "normal";
  disabled?: boolean;
  onSave: (
    namespace: string,
    key: string,
    languageCode: string,
    value: string,
    status: TranslationStatus,
  ) => void;
};

export function UiMessageCell({
  namespace,
  messageKey,
  fullKey,
  role,
  localeCode,
  englishValue,
  value,
  fileFallback,
  dbStatus,
  density,
  disabled,
  onSave,
}: Props) {
  const [status, setStatus] = useState<TranslationStatus>(dbStatus ?? "PUBLISHED");

  useEffect(() => {
    setStatus(dbStatus ?? "PUBLISHED");
  }, [dbStatus]);

  const editor = getEditorConfig(role, value || fileFallback || englishValue);
  const cellState = resolveCellState({
    localeCode,
    englishValue,
    dbValue: value,
    dbStatus: dbStatus ?? (value ? status : undefined),
    fileFallback,
  });
  const hasDbRow = Boolean(value.trim()) || Boolean(dbStatus);
  const placeholder = String(fileFallback ?? "") || "—";

  const handleBlur = (next: string) => {
    if (next === value && status === (dbStatus ?? "PUBLISHED")) return;
    onSave(namespace, messageKey, localeCode, next, status);
  };

  const inputClass = cn(
    "text-xs",
    density === "compact" ? "min-h-7" : "min-h-8",
    editor.kind === "input" && (density === "compact" ? "h-7" : "h-8"),
    !value && fileFallback && "text-muted-foreground",
  );

  return (
    <div className={cn("rounded-md p-1.5 space-y-1.5", getCellStateClass(cellState))}>
      {hasDbRow && (
        <div className="flex items-center justify-between gap-1">
          <TranslationStatusBadge status={status} />
          <select
            className="border rounded h-6 px-1 text-[10px] bg-background"
            value={status}
            disabled={disabled}
            onChange={(e) => {
              const nextStatus = e.target.value as TranslationStatus;
              setStatus(nextStatus);
              if (value.trim()) {
                onSave(namespace, messageKey, localeCode, value, nextStatus);
              }
            }}
            aria-label={`Status for ${fullKey} (${localeCode})`}
          >
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      )}

      {editor.kind === "textarea" ? (
        <Textarea
          defaultValue={value}
          placeholder={placeholder}
          rows={editor.rows}
          disabled={disabled}
          className={cn(inputClass, "min-h-[72px] resize-y")}
          onBlur={(e) => handleBlur(e.target.value)}
        />
      ) : (
        <Input
          defaultValue={value}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
          onBlur={(e) => handleBlur(e.target.value)}
        />
      )}

      {!hasDbRow && value.trim() === "" && (
        <select
          className="border rounded h-6 px-1 text-[10px] bg-background w-full"
          value={status}
          disabled={disabled}
          onChange={(e) => setStatus(e.target.value as TranslationStatus)}
          aria-label={`Default status for new ${fullKey} (${localeCode})`}
        >
          <option value="PUBLISHED">Save as Published</option>
          <option value="DRAFT">Save as Draft</option>
        </select>
      )}
    </div>
  );
}
