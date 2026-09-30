import fs from "node:fs";
import path from "node:path";

import type { RegistrySpecDefinition } from "./types";

type DomainFile = {
  domain?: string;
  display?: { name?: string; order?: number };
  specifications?: RegistrySpecDefinition[];
};

let cache: {
  specifications: Record<string, RegistrySpecDefinition>;
  domainOrder: string[];
  displayGroups: Record<string, string>;
} | null = null;

function domainsDir(): string {
  return path.join(process.cwd(), "Converter", "specifications", "domains");
}

export function loadSpecificationRegistry(force = false) {
  if (cache && !force) return cache;

  const dir = domainsDir();
  const specifications: Record<string, RegistrySpecDefinition> = {};
  const domainOrder: { domain: string; order: number }[] = [];
  const displayGroups: Record<string, string> = {};

  if (!fs.existsSync(dir)) {
    cache = { specifications, domainOrder: [], displayGroups };
    return cache;
  }

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const data = JSON.parse(raw) as DomainFile;
    const domain = data.domain || file.replace(/\.json$/, "");
    domainOrder.push({ domain, order: data.display?.order ?? 999 });
    for (const spec of data.specifications || []) {
      if (!spec.id) continue;
      specifications[spec.id] = spec;
      const group = spec.display?.group || domain;
      displayGroups[spec.id] = group;
    }
  }

  domainOrder.sort((a, b) => a.order - b.order);
  cache = {
    specifications,
    domainOrder: domainOrder.map((d) => d.domain),
    displayGroups,
  };
  return cache;
}

export function getRegistrySpec(id: string): RegistrySpecDefinition | undefined {
  return loadSpecificationRegistry().specifications[id];
}

export function canonicalSpecDisplayName(id: string): string {
  return getRegistrySpec(id)?.name || id.split(".").pop() || id;
}

export function canonicalSpecGroup(id: string): string {
  const registry = loadSpecificationRegistry();
  return registry.displayGroups[id] || id.split(".")[0] || "Specifications";
}

export function canonicalSpecSortKey(id: string): number {
  const registry = loadSpecificationRegistry();
  const spec = registry.specifications[id];
  const domain = spec?.domain || id.split(".")[0] || "";
  const domainIndex = registry.domainOrder.indexOf(domain);
  const itemOrder = spec?.display?.order ?? 999;
  return (domainIndex < 0 ? 999 : domainIndex) * 1000 + itemOrder;
}
