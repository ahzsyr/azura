"use client";

import type { SearchModalElementsSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import {
  SettingsSection,
  ToggleField,
  NumberField,
} from "@/capabilities/search/admin/search-settings-fields";

type Props = {
  modalElements: SearchModalElementsSettings;
  onChange: (modalElements: SearchModalElementsSettings) => void;
};

export function SearchModalElementsPanel({ modalElements, onChange }: Props) {
  const patch = <K extends keyof SearchModalElementsSettings>(
    key: K,
    value: SearchModalElementsSettings[K],
  ) => {
    onChange({ ...modalElements, [key]: value });
  };

  return (
    <SettingsSection
      title="Modal content"
      description="Control which blocks appear in the header search modal (Cmd+K)."
    >
      <ToggleField
        label="Recent queries"
        checked={modalElements.showRecent}
        onChange={(v) => patch("showRecent", v)}
      />
      <ToggleField
        label="Popular queries"
        checked={modalElements.showPopular}
        onChange={(v) => patch("showPopular", v)}
      />
      <ToggleField
        label="Trending queries"
        checked={modalElements.showTrending}
        onChange={(v) => patch("showTrending", v)}
      />
      <ToggleField
        label="Search history entries"
        checked={modalElements.showHistory}
        onChange={(v) => patch("showHistory", v)}
      />
      <ToggleField
        label="Group results by type"
        checked={modalElements.showEntityGroups}
        onChange={(v) => patch("showEntityGroups", v)}
      />
      <ToggleField
        label="Result snippets"
        checked={modalElements.showResultSnippets}
        onChange={(v) => patch("showResultSnippets", v)}
      />
      <ToggleField
        label="View all results footer"
        checked={modalElements.showViewAllFooter}
        onChange={(v) => patch("showViewAllFooter", v)}
      />
      <ToggleField
        label="Filter bar (discovery mode)"
        checked={modalElements.showFilterBar}
        onChange={(v) => patch("showFilterBar", v)}
      />
      <ToggleField
        label="Keyboard hints"
        checked={modalElements.showKeyboardHints}
        onChange={(v) => patch("showKeyboardHints", v)}
      />
      <NumberField
        label="Max results per type"
        description="Quick results cap in command modal (3–8)."
        value={modalElements.maxResultsPerType}
        min={3}
        max={8}
        onChange={(v) => patch("maxResultsPerType", v)}
      />
    </SettingsSection>
  );
}
