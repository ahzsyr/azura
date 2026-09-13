import type { UIComponentManifest } from "../manifests/types";

class NodeRegistry {
  private readonly entries = new Map<string, UIComponentManifest>();

  register(manifest: UIComponentManifest): void {
    this.entries.set(`${manifest.id}@${manifest.version}`, manifest);
    const latest = this.entries.get(`${manifest.id}@latest`);
    if (!latest || manifest.version >= latest.version) {
      this.entries.set(`${manifest.id}@latest`, manifest);
    }
  }

  get(id: string, version?: number): UIComponentManifest | undefined {
    if (version != null) return this.entries.get(`${id}@${version}`);
    return this.entries.get(`${id}@latest`);
  }

  getOrThrow(id: string, version?: number): UIComponentManifest {
    const entry = this.get(id, version);
    if (!entry) throw new Error(`Unknown component: ${id}${version != null ? `@${version}` : ""}`);
    return entry;
  }

  list(): UIComponentManifest[] {
    const seen = new Set<string>();
    const out: UIComponentManifest[] = [];
    for (const [key, manifest] of this.entries) {
      if (!key.endsWith("@latest")) continue;
      if (seen.has(manifest.id)) continue;
      seen.add(manifest.id);
      out.push(manifest);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  byCategory(category: UIComponentManifest["category"]): UIComponentManifest[] {
    return this.list().filter((m) => m.category === category);
  }
}

export const nodeRegistry = new NodeRegistry();
