"use client";

import { useState } from "react";
import { WorkspaceLocalizedField } from "@/features/translation/components/workspace-localized-field";
import { makeMenuItemEntityId } from "@/features/translation/workspace-entity-ids";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  menuKey: string;
  itemId: string;
  defaultLabel: string;
  defaultBadgeText: string;
  defaultCardSubtitle: string;
  onDefaultLabelChange: (value: string) => void;
  onDefaultBadgeTextChange: (value: string) => void;
  onDefaultCardSubtitleChange: (value: string) => void;
  className?: string;
};

/** Dense localization for Inspector — primary fields first; extras behind "Show more". */
export function CompactLocalizedMenuFields({
  menuKey,
  itemId,
  defaultLabel,
  defaultBadgeText,
  defaultCardSubtitle,
  onDefaultLabelChange,
  onDefaultBadgeTextChange,
  onDefaultCardSubtitleChange,
  className,
}: Props) {
  const entityId = makeMenuItemEntityId(menuKey, itemId);
  const [showMore, setShowMore] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      <WorkspaceLocalizedField
        entityType="MenuItem"
        entityId={entityId}
        field="label"
        legacyEntity={{ label: defaultLabel }}
        onDefaultLocaleChange={onDefaultLabelChange}
      />
      <WorkspaceLocalizedField
        entityType="MenuItem"
        entityId={entityId}
        field="badgeText"
        legacyEntity={{ badgeText: defaultBadgeText }}
        onDefaultLocaleChange={onDefaultBadgeTextChange}
      />
      {showMore ? (
        <>
          <WorkspaceLocalizedField
            entityType="MenuItem"
            entityId={entityId}
            field="description"
            multiline
            rows={2}
          />
          <WorkspaceLocalizedField
            entityType="MenuItem"
            entityId={entityId}
            field="cardSubtitle"
            legacyEntity={{ cardSubtitle: defaultCardSubtitle }}
            onDefaultLocaleChange={onDefaultCardSubtitleChange}
          />
        </>
      ) : (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowMore(true)}>
          Show more fields
        </Button>
      )}
    </div>
  );
}
