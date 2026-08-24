"use client";

import { ColorPickerField } from "@/components/settings";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  searchTerms?: string[];
};

export function ThemeColorPicker({ label, value, onChange, searchTerms = [] }: Props) {
  return (
    <div data-theme-search={[label, "color", ...searchTerms].join(" ").toLowerCase()}>
      <ColorPickerField label={label} value={value} onChange={onChange} />
    </div>
  );
}
