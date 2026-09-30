"use client";

import { useEffect, useRef } from "react";
import type { FormFieldDefinition } from "@/features/forms/types";
import { useLocalizedField } from "@/features/translation/hooks/use-localized-field";
import { makeFormFieldEntityId } from "@/features/translation/workspace-entity-ids";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";

type Props = {
  templateId: string;
  field: FormFieldDefinition;
  index: number;
  onLegacyChange: (index: number, patch: Partial<FormFieldDefinition>) => void;
};

/** Form designer field label bound to EntityTranslation for the active admin locale. */
export function FormFieldLabelEditor({ templateId, field, index, onLegacyChange }: Props) {
  const entityId = makeFormFieldEntityId(templateId, field.id);
  const { value, onChange, loading, activeLocaleCode, englishFallback } = useLocalizedField({
    entityType: "FormField",
    entityId,
    field: "label",
    autoSave: true,
  });

  const onLegacyChangeRef = useRef(onLegacyChange);
  onLegacyChangeRef.current = onLegacyChange;

  useEffect(() => {
    if (loading) return;
    const shouldSync =
      activeLocaleCode === "en" ||
      activeLocaleCode.startsWith("en") ||
      isArabicLocale(activeLocaleCode);
    if (!shouldSync) return;

    const nextLabel = value || field.label;
    // Guard: never push parent updates when nothing changed — unstable
    // onLegacyChange identities previously caused Maximum update depth (#185).
    if (nextLabel === field.label) return;

    onLegacyChangeRef.current(index, { label: nextLabel });
  }, [value, loading, activeLocaleCode, index, field.id, field.label]);

  const displayValue = value || field.label || "";

  return (
    <div className="space-y-1">
      <Label>Label ({activeLocaleCode})</Label>
      <Input
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={englishFallback || "Field label"}
      />
    </div>
  );
}
