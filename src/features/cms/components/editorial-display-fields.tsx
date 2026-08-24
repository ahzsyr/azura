"use client";

import { ToggleField } from "@/components/admin/settings-fields";

type Props = {
  showAuthor: boolean;
  showPublishedAt: boolean;
  onShowAuthorChange: (value: boolean) => void;
  onShowPublishedAtChange: (value: boolean) => void;
};

export function EditorialDisplayFields({
  showAuthor,
  showPublishedAt,
  onShowAuthorChange,
  onShowPublishedAtChange,
}: Props) {
  return (
    <div className="space-y-3 col-span-full">
      <p className="text-sm font-medium">Byline display</p>
      <p className="text-xs text-muted-foreground -mt-2">
        Choose whether the author name and publish date appear on the public page.
      </p>
      <ToggleField
        label="Show author"
        description="Display the assigned author on the live page."
        checked={showAuthor}
        onChange={onShowAuthorChange}
      />
      <ToggleField
        label="Show publish date"
        description="Display the publishing date on the live page."
        checked={showPublishedAt}
        onChange={onShowPublishedAtChange}
      />
    </div>
  );
}
