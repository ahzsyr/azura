"use client";

import { MediaPickerField } from "@/features/media/components/media-picker-field";

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  previewSize?: { width: number; height: number };
};

export function ThemeBrandUpload({ label, hint, value, onChange, previewSize }: Props) {
  return (
    <MediaPickerField
      label={label}
      hint={hint}
      url={value}
      trackMediaId={false}
      idFieldName=""
      onChange={({ url }) => onChange(url)}
      previewSize={previewSize}
      mediaTypes={["IMAGE", "SVG"]}
    />
  );
}
