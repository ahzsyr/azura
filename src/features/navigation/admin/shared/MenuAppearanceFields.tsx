"use client";

import type { HeaderBuilderCatalog, MenuIconPlacement, MenuItem } from "@/features/navigation/types";
import {
  childMediaChoiceShowsImagePicker,
  sourceDisplayOptionsForItem,
  type SourceDisplay,
} from "@/features/navigation/menu-item-appearance";
import { IconPickerField } from "@/features/icons";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { HeaderField, OptionButtonGroup } from "../header-builder-ui";

type ItemRef = Pick<
  MenuItem,
  | "type"
  | "label"
  | "icon"
  | "collectionId"
  | "packageCategoryId"
  | "brandSlug"
  | "productId"
  | "packageId"
  | "postId"
  | "url"
  | "imageUrl"
  | "megaMenuImageUrl"
  | "sourceDisplay"
>;

export function MenuAppearanceFields({
  catalog,
  item,
  choice,
  icon,
  iconPlacement,
  megaMenuImageUrl,
  onChoice,
  onIcon,
  onPlacement,
  onImage,
}: {
  catalog: HeaderBuilderCatalog;
  item: ItemRef;
  choice: SourceDisplay;
  icon: string;
  iconPlacement: MenuIconPlacement;
  megaMenuImageUrl: string;
  onChoice: (value: SourceDisplay) => void;
  onIcon: (iconId: string) => void;
  onPlacement: (value: MenuIconPlacement) => void;
  onImage: (url: string) => void;
}) {
  const options = sourceDisplayOptionsForItem({ ...item, sourceDisplay: choice, icon }, catalog);
  const selected = options.some((option) => option.value === choice) ? choice : "none";
  const columns: 1 | 2 | 3 | 4 = options.length <= 1 ? 1 : options.length === 2 ? 2 : options.length === 3 ? 3 : 4;

  return (
    <div className="space-y-4">
      <HeaderField label="Show in menu">
        <OptionButtonGroup
          value={selected}
          columns={columns}
          options={options.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(value) => onChoice(value as SourceDisplay)}
        />
      </HeaderField>
      <p className="text-xs text-muted-foreground">
        Text only, or the logo, icon, or image on this destination. A brand with a logo can show that logo. Another destination, such as a company page, offers whatever assets it has.
      </p>
      {selected === "icon" ? (
        <>
          <IconPickerField label="Icon" value={icon} onChange={onIcon} />
          <HeaderField label="Placement">
            <OptionButtonGroup
              value={iconPlacement}
              columns={3}
              options={[
                { value: "desktop", label: "Desktop" },
                { value: "mobile", label: "Mobile" },
                { value: "both", label: "Both" },
              ]}
              onChange={(value) => onPlacement(value as MenuIconPlacement)}
            />
          </HeaderField>
          <p className="text-xs text-muted-foreground">
            Uses the destination icon, or the icon you pick here. Placement controls the header and the menu.
          </p>
        </>
      ) : null}
      {childMediaChoiceShowsImagePicker(selected) ? (
        <UrlPrimaryMediaPickerField
          label="Image"
          url={megaMenuImageUrl}
          onChange={onImage}
          mediaTypes={["IMAGE", "SVG"]}
        />
      ) : null}
    </div>
  );
}
