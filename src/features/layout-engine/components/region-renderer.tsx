import type { ReactNode } from "react";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import type { RegionPolicy } from "@/features/layout-engine/types";
import type { PageBlocks } from "@/types/builder";
import type { BlockParentType } from "@/features/translation/block-translation";
import type { ThemeTokens } from "@/types/theme";

type Props = {
  regionId: string;
  blocks: PageBlocks;
  locale: string;
  parentType?: BlockParentType;
  parentId?: string;
  translationBundle?: TranslationBundle;
  pageHeaderOverlay?: Parameters<typeof BlockRenderer>[0]["pageHeaderOverlay"];
  theme?: ThemeTokens | null;
  siteTextEffect?: string | null;
  pageAnimationsEnabled?: boolean;
  discoveryAnchor?: Parameters<typeof BlockRenderer>[0]["discoveryAnchor"];
  previewMode?: boolean;
  previewDevice?: Parameters<typeof BlockRenderer>[0]["previewDevice"];
  policy?: RegionPolicy;
  orderTablet?: number;
  orderMobile?: number;
  className?: string;
};

export async function RegionRenderer({
  regionId,
  blocks,
  locale,
  parentType,
  parentId,
  translationBundle,
  pageHeaderOverlay,
  theme = null,
  siteTextEffect = null,
  pageAnimationsEnabled,
  discoveryAnchor = null,
  previewMode = false,
  previewDevice,
  policy,
  orderTablet,
  orderMobile,
  className,
}: Props): Promise<ReactNode> {
  const content = await BlockRenderer({
    blocks,
    locale,
    parentType,
    parentId,
    translationBundle,
    pageHeaderOverlay,
    theme,
    siteTextEffect,
    pageAnimationsEnabled,
    discoveryAnchor,
    previewMode,
    previewDevice,
  });

  return (
    <div
      className={className}
      data-layout-region={regionId}
      data-policy={policy ? "true" : undefined}
      data-order-tablet={orderTablet}
      data-order-mobile={orderMobile}
    >
      {content}
    </div>
  );
}
