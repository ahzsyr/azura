"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormFieldDefinition } from "@/features/forms/types";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
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
  const adminLocale = useAdminEditingLocaleContextOptional();
  const entityId = makeFormFieldEntityId(templateId, field.id);
  const { value, onChange, loading, activeLocaleCode, englishFallback } = useLocalizedField({
    entityType: "FormField",
    entityId,
    field: "label",
    autoSave: true,
  });

  useEffect(() => {
    if (loading) return;
    if (activeLocaleCode === "en" || activeLocaleCode.startsWith("en")) {
      onLegacyChange(index, { label: value || field.label });
    }
    if (isArabicLocale(activeLocaleCode)) {
      onLegacyChange(index, { label: value || field.label });
    }
  }, [value, loading, activeLocaleCode, index, onLegacyChange, field.label, field.label]);

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
