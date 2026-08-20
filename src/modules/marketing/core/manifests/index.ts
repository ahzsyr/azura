import type { ProviderManifest } from "./types";

const manifests = new Map<string, ProviderManifest>();

export function registerProviderManifest(manifest: ProviderManifest): void {
  if (manifests.has(manifest.id)) return;
  manifests.set(manifest.id, Object.freeze({ ...manifest }));
}

export function getProviderManifest(providerId: string): ProviderManifest | undefined {
  return manifests.get(providerId);
}

export function listProviderManifests(): ProviderManifest[] {
  return Array.from(manifests.values());
}

export function clearProviderManifests(): void {
  manifests.clear();
}

export type {
  CanonicalAssetKind,
  MarketingProviderRuntime,
  ProviderLifecycleState,
  ProviderManifest,
  ProviderOAuthConfig,
  ProviderVersionInfo,
  SupportedMediaKind,
} from "./types";
