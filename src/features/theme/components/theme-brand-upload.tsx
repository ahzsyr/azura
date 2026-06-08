"use client";

import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  previewSize?: { width: number; height: number };
};

export function ThemeBrandUpload({ label, hint, value, onChange, previewSize }: Props) {
  return (
    <UrlPrimaryMediaPickerField
      label={label}
      hint={hint}
      value={value}
      onChange={onChange}
      previewSize={previewSize}
      mediaTypes={["IMAGE", "SVG"]}
    />
  );
}
