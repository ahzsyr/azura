"use client";

import type { MegaMenuPanelViewModel } from "@/features/navigation/mega-menu-resolver";
import { MegaMenuCarousel } from "./MegaMenuCarousel";
import {
  CardGridRenderer,
  ColumnRenderer,
  FeaturedRenderer,
  IconGridRenderer,
  LinkListRenderer,
  MixedRenderer,
  ProductGridRenderer,
} from "./renderers/panel-layout-renderers";

type Props = {
  panel: MegaMenuPanelViewModel;
  onLinkClick?: () => void;
};

export function MegaMenuPanelRenderer({ panel, onLinkClick }: Props) {
  const carousel = panel.carousel?.enabled === true;
  const body = (() => {
    switch (panel.layout) {
      case "links":
        return <LinkListRenderer children={panel.children} onLinkClick={onLinkClick} />;
      case "cards":
        return (
          <CardGridRenderer
            children={panel.children}
            columns={panel.columns}
            gap={panel.gap}
            onLinkClick={onLinkClick}
          />
        );
      case "featured":
        return (
          <FeaturedRenderer
            children={panel.children}
            columns={panel.columns}
            gap={panel.gap}
            onLinkClick={onLinkClick}
          />
        );
      case "columns":
        return (
          <ColumnRenderer
            columnGroups={panel.columnGroups}
            children={panel.children}
            onLinkClick={onLinkClick}
          />
        );
      case "iconGrid":
        return (
          <IconGridRenderer
            children={panel.children}
            columns={panel.columns}
            gap={panel.gap}
            onLinkClick={onLinkClick}
          />
        );
      case "productGrid":
        return (
          <ProductGridRenderer
            children={panel.children}
            columns={panel.columns}
            gap={panel.gap}
            onLinkClick={onLinkClick}
          />
        );
      case "mixed":
        return (
          <MixedRenderer
            featured={panel.featured}
            featuredCtaLabel={panel.featuredCtaLabel}
            children={panel.children}
            columnGroups={panel.columnGroups}
            onLinkClick={onLinkClick}
          />
        );
      default:
        return <LinkListRenderer children={panel.children} onLinkClick={onLinkClick} />;
    }
  })();

  return (
    <div className="hb-mega-v2-panel" data-panel-layout={panel.layout} data-panel-id={panel.id}>
      <MegaMenuCarousel enabled={carousel} arrows={panel.carousel?.arrows !== false}>
        {body}
      </MegaMenuCarousel>
    </div>
  );
}
