import {
  resolveCapabilityAvailability,
  type CapabilityAvailability,
  type MarketingCapabilityId,
} from "@/modules/marketing/core/capabilities";
import { isMarketingCapabilityEnabled } from "@/modules/marketing/feature-flags";
import type { ProviderManifest } from "@/modules/marketing/core/manifests/types";
import type { MarketingProviderAdapter } from "./types";

const adapters = new Map<string, MarketingProviderAdapter>();

export function registerProvider(adapter: MarketingProviderAdapter): void {
  if (adapters.has(adapter.id)) {
    throw new Error(`Marketing provider already registered: ${adapter.id}`);
  }
  adapters.set(adapter.id, adapter);
}

export function clearProviders(): void {
  adapters.clear();
}

export function listProviders(): MarketingProviderAdapter[] {
  return Array.from(adapters.values());
}

export function listCapabilities(): MarketingCapabilityId[] {
  const set = new Set<MarketingCapabilityId>();
  for (const adapter of adapters.values()) {
    for (const cap of adapter.capabilities()) set.add(cap);
  }
  return Array.from(set);
}

export function findProvider(providerId: string): MarketingProviderAdapter | undefined {
  return adapters.get(providerId);
}

export function findByCapability(capability: MarketingCapabilityId): MarketingProviderAdapter[] {
  return listProviders().filter((p) => p.capabilities().includes(capability));
}

export function supports(providerId: string, capability: MarketingCapabilityId): boolean {
  const provider = findProvider(providerId);
  if (!provider) return false;
  return provider.capabilities().includes(capability);
}

export function getProviderManifest(providerId: string): ProviderManifest | undefined {
  return findProvider(providerId)?.manifest;
}

export function resolveProviderCapability(
  providerId: string,
  capability: MarketingCapabilityId,
): CapabilityAvailability {
  const provider = findProvider(providerId);
  if (!provider) {
    return { capability, available: false, reason: "providerUnavailable" };
  }
  const supported = provider.capabilities();
  const enabled = supported.filter((c) => isMarketingCapabilityEnabled(c));
  return resolveCapabilityAvailability({ capability, supported, enabled });
}

export type { MarketingProviderAdapter } from "./types";
