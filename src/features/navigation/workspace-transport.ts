import type { BrandingState, HeaderWorkspace } from "./types";

const DATA_URL_PREFIX = "data:";

function stripDataUrl(value: string | undefined): string {
  if (!value?.startsWith(DATA_URL_PREFIX)) return value ?? "";
  return "";
}

/** Shrink admin/API payloads — inline base64 logos can be 1MB+ each. */
export function stripInlineImagesFromBranding(branding: BrandingState): BrandingState {
  return {
    ...branding,
    logoImageUrl: stripDataUrl(branding.logoImageUrl),
    logoImageLightUrl: stripDataUrl(branding.logoImageLightUrl),
    logoImageDarkUrl: stripDataUrl(branding.logoImageDarkUrl),
  };
}

export function stripInlineImagesFromWorkspace(workspace: HeaderWorkspace): HeaderWorkspace {
  return {
    ...workspace,
    branding: stripInlineImagesFromBranding(workspace.branding),
  };
}
