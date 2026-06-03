"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { upsertTranslationAction } from "@/features/translation/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicLocale } from "@/i18n/locale-config";
import { cn } from "@/lib/utils";

type Props = {
  entityType: string;
  entityId: string;
  field: string;
  label: string;
  englishItems: string[];
  activeLocale: string;
  locales: PublicLocale[];
  defaultLocaleCode: string;
  translationValue?: string;
  onTranslationSaved?: (value: string) => void;
};

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

export function TranslatableStringList({
  entityType,
  entityId,
  field,
  label,
  englishItems,
  activeLocale,
  locales,
  defaultLocaleCode,
  translationValue,
  onTranslationSaved,
}: Props) {
  const adminForm = useAdminFormOptional();
  const [items, setItems] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedRef = useRef("");

  const localeMeta = locales.find((l) => l.code === activeLocale);
  const isRtl = localeMeta?.dir === "rtl";

  useEffect(() => {
    if (!activeLocale || activeLocale === defaultLocaleCode) return;
    const raw = translationValue ?? "";
    const parsed = parseItems(raw);
    setItems(parsed.length > 0 ? parsed : englishItems.map(() => ""));
    savedRef.current = raw;
    setSaveState("idle");
  }, [activeLocale, translationValue, englishItems, defaultLocaleCode]);

  const save = useCallback(async () => {
    if (!activeLocale || activeLocale === defaultLocaleCode) return;
    const value = JSON.stringify(items.filter((s) => s.trim()));
    if (value === savedRef.current) return;

    setSaveState("saving");
    try {
      await upsertTranslationAction({
        entityType,
        entityId,
        field,
        languageCode: activeLocale,
        value,
        status: "PUBLISHED",
      });
      savedRef.current = value;
      onTranslationSaved?.(value);
      setSaveState("saved");
      adminForm?.showToast("Translation saved", "success");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      adminForm?.showToast("Failed to save translation", "error");
    }
  }, [activeLocale, defaultLocaleCode, entityId, entityType, field, items, onTranslationSaved, adminForm]);

  if (!activeLocale || activeLocale === defaultLocaleCode) return null;

  const count = Math.max(englishItems.length, items.length);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <SaveIndicator state={saveState} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn("grid gap-3 md:grid-cols-2", isRtl && "md:[direction:rtl]")}>
            <div className={cn("space-y-1", isRtl && "md:[direction:ltr]")}>
              <span className="text-xs text-muted-foreground">EN #{i + 1}</span>
              <Input value={englishItems[i] ?? ""} readOnly className="bg-muted/50 text-muted-foreground" />
            </div>
            <div className={cn("space-y-1", isRtl && "md:text-right")}>
              <span className="text-xs text-muted-foreground">{localeMeta?.label} #{i + 1}</span>
              <Input
                value={items[i] ?? ""}
                dir={isRtl ? "rtl" : undefined}
                className={isRtl ? "text-right" : undefined}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  while (next.length < count) next.push("");
                  setItems(next);
                  setSaveState("unsaved");
                }}
                onBlur={() => void save()}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function parseItems(raw: string): string[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* fall through */
  }
  return [];
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
