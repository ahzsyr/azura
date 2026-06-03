"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranslationStatus } from "@prisma/client";
import { Check, Circle, Loader2 } from "lucide-react";
import { upsertTranslationAction } from "@/features/translation/actions";
import { getTranslatableFields } from "@/features/translation/entity-registry";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublicLocale } from "@/i18n/locale-config";
import {
  completionTierClass,
  getCompletionTier,
} from "@/features/translation/completion-utils";

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

export interface UniversalTranslationEditorProps {
  entityType: string;
  entityId: string;
  field: string;
  englishValue: string;
  label?: string;
  multiline?: boolean;
  richText?: boolean;
  activeLocale?: string;
  hideLocaleTabs?: boolean;
  locales?: PublicLocale[];
  defaultLocaleCode?: string;
  /** Controlled translation value from parent (avoids duplicate fetches) */
  translationValue?: string;
  onTranslationSaved?: (value: string) => void;
}

function parseStringList(value: string): string[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* fall through */
  }
  return value.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function UniversalTranslationEditor({
  entityType,
  entityId,
  field,
  englishValue,
  label,
  multiline,
  richText,
  activeLocale,
  defaultLocaleCode = "en",
  translationValue,
  onTranslationSaved,
}: UniversalTranslationEditorProps) {
  const adminForm = useAdminFormOptional();
  const fieldDef = getTranslatableFields(entityType).find((f) => f.field === field);
  const isMultiline =
    multiline ?? (fieldDef?.type === "textarea" || fieldDef?.type === "richtext" || !!richText);
  const isStringList = fieldDef?.type === "stringList";

  const [draft, setDraft] = useState(translationValue ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedValueRef = useRef(translationValue ?? "");

  useEffect(() => {
    const stored = translationValue ?? "";
    setDraft(isStringList ? parseStringList(stored).join("\n") : stored);
    savedValueRef.current = stored;
    setSaveState("idle");
  }, [translationValue, activeLocale, field, isStringList]);

  const save = useCallback(async () => {
    if (!activeLocale || activeLocale === defaultLocaleCode) return;
    if (draft === savedValueRef.current || (isStringList && JSON.stringify(parseStringList(draft)) === savedValueRef.current)) {
      setSaveState("idle");
      return;
    }

    setSaveState("saving");
    try {
      const value = isStringList ? JSON.stringify(parseStringList(draft)) : draft;
      await upsertTranslationAction({
        entityType,
        entityId,
        field,
        languageCode: activeLocale,
        value,
        status: "PUBLISHED",
      });
      savedValueRef.current = value;
      onTranslationSaved?.(value);
      setSaveState("saved");
      adminForm?.showToast("Translation saved", "success");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      adminForm?.showToast("Failed to save translation", "error");
    }
  }, [
    activeLocale,
    defaultLocaleCode,
    draft,
    entityId,
    entityType,
    field,
    isStringList,
    onTranslationSaved,
    adminForm,
  ]);

  const handleBlur = () => {
    void save();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isMultiline && !e.shiftKey) {
      e.preventDefault();
      void save();
    }
    if (e.key === "Escape") {
      setDraft(
        isStringList ? parseStringList(savedValueRef.current).join("\n") : savedValueRef.current
      );
      setSaveState("idle");
    }
  };

  if (!activeLocale || activeLocale === defaultLocaleCode) {
    return null;
  }

  const displayEnglish = isStringList
    ? parseStringList(englishValue).join("\n")
    : englishValue;

  const localeMeta = undefined; // label shown by parent tabs
  const isRtl = false; // RTL applied via parent locale meta when needed

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label ?? fieldDef?.label ?? field}</Label>
        <SaveIndicator state={saveState} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            English (source)
          </span>
          {isMultiline ? (
            <Textarea
              value={displayEnglish}
              readOnly
              rows={richText || fieldDef?.type === "richtext" ? 8 : 4}
              className="bg-muted/50 resize-none text-muted-foreground"
            />
          ) : (
            <Input value={displayEnglish} readOnly className="bg-muted/50 text-muted-foreground" />
          )}
        </div>

        <div className={cn("space-y-1", isRtl && "text-right")}>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Translation
          </span>
          {isMultiline ? (
            <Textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaveState("unsaved");
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              rows={richText || fieldDef?.type === "richtext" ? 8 : 4}
              dir={isRtl ? "rtl" : undefined}
              className={isRtl ? "text-right" : undefined}
              placeholder="Enter translation…"
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaveState("unsaved");
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              dir={isRtl ? "rtl" : undefined}
              className={isRtl ? "text-right" : undefined}
              placeholder="Enter translation…"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (state === "unsaved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <Circle className="h-2 w-2 fill-current" /> Unsaved
      </span>
    );
  }
  if (state === "error") {
    return <span className="text-xs text-destructive">Save failed</span>;
  }
  return null;
}

export function LocaleCompletionTabs({
  locales,
  defaultLocaleCode,
  completionByLocale,
  activeLocale,
  onLocaleChange,
}: {
  locales: PublicLocale[];
  defaultLocaleCode: string;
  completionByLocale: Record<string, number>;
  activeLocale: string;
  onLocaleChange: (code: string) => void;
}) {
  const targets = locales.filter((l) => l.code !== defaultLocaleCode);

  return (
    <div className="flex flex-wrap gap-1">
      {targets.map((locale) => {
        const pct = completionByLocale[locale.code] ?? 0;
        const tier = getCompletionTier(pct);
        const active = activeLocale === locale.code;
        return (
          <button
            key={locale.code}
            type="button"
            onClick={() => onLocaleChange(locale.code)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
              active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
            )}
          >
            <span>{locale.flag}</span>
            <span className="font-medium">{locale.code.toUpperCase()}</span>
            <Badge className={cn("text-[10px] px-1 py-0 tabular-nums", completionTierClass(tier))}>
              {pct}%
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
