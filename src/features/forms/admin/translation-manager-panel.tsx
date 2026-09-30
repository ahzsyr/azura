"use client";

import { Card } from "@/components/ui/card";
import { FormFieldLabelEditor } from "@/features/forms/admin/form-field-label-editor";
import type { FormTemplateDefinition } from "@/features/forms/types";

const PREVIEW_LOCALES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
];

type Props = {
  templateId: string | null;
  definition: FormTemplateDefinition;
  previewLocale: string;
  onPreviewLocaleChange: (locale: string) => void;
  onFieldLegacyChange: (index: number, patch: Partial<FormTemplateDefinition["fields"][number]>) => void;
};

export function TranslationManagerPanel({
  templateId,
  definition,
  previewLocale,
  onPreviewLocaleChange,
  onFieldLegacyChange,
}: Props) {
  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-medium text-sm">Translations</h3>
        <p className="text-xs text-muted-foreground">
          Edit copy per locale. Preview switch updates the designer canvas overlay.
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {PREVIEW_LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`text-xs px-2 py-1 rounded border ${previewLocale === l.code ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => onPreviewLocaleChange(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>
      {!templateId ? (
        <p className="text-sm text-muted-foreground">Save the form to edit translations.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-auto">
          {(definition.fields ?? []).map((field, index) => (
            <FormFieldLabelEditor
              key={field.id}
              templateId={templateId}
              field={field}
              index={index}
              onLegacyChange={onFieldLegacyChange}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
