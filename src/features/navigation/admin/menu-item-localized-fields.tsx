"use client";

import { WorkspaceLocalizedField } from "@/features/translation/components/workspace-localized-field";
import { makeMenuItemEntityId } from "@/features/translation/workspace-entity-ids";

type Props = {
  menuKey: string;
  itemId: string;
  defaultLabel: string;
  defaultBadgeText: string;
  defaultCardSubtitle: string;
  onDefaultLabelChange: (value: string) => void;
  onDefaultBadgeTextChange: (value: string) => void;
  onDefaultCardSubtitleChange: (value: string) => void;
  /** When false, omits the section heading (e.g. inline in Menu Builder inspector). */
  showHeading?: boolean;
};

export function MenuItemLocalizedFields({
  menuKey,
  itemId,
  defaultLabel,
  defaultBadgeText,
  defaultCardSubtitle,
  onDefaultLabelChange,
  onDefaultBadgeTextChange,
  onDefaultCardSubtitleChange,
  showHeading = true,
}: Props) {
  const entityId = makeMenuItemEntityId(menuKey, itemId);

  return (
    <section className="space-y-4">
      {showHeading ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Translations</h3>
          <p className="text-xs text-muted-foreground">
            Values for the active editing locale save on Header Save. Default locale also syncs to menu JSON.
          </p>
        </div>
      ) : null}
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
    </section>
  );
}
