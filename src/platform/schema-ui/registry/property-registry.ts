import type { UIComponentManifest } from "../manifests/types";
import { hasCapability } from "../schema/capabilities";

class PropertyRegistry {
  private readonly entries = new Map<string, UIComponentManifest>();

  register(manifest: UIComponentManifest): void {
    this.entries.set(`${manifest.id}@${manifest.version}`, manifest);
    const latest = this.entries.get(`${manifest.id}@latest`);
    if (!latest || manifest.version >= latest.version) {
      this.entries.set(`${manifest.id}@latest`, manifest);
    }
  }

  getPropertyGroups(id: string, version?: number) {
    const manifest = version != null ? this.entries.get(`${id}@${version}`) : this.entries.get(`${id}@latest`);
    if (!manifest) return [];
    return manifest.properties.groups.filter((group) => {
      if (group.id === "validation") return hasCapability(manifest.capabilities, "supportsValidation");
      if (group.id === "data") return hasCapability(manifest.capabilities, "supportsDataSource");
      return true;
    });
  }

  get(id: string, version?: number): UIComponentManifest | undefined {
    if (version != null) return this.entries.get(`${id}@${version}`);
    return this.entries.get(`${id}@latest`);
  }
}

export const propertyRegistry = new PropertyRegistry();
