import type { UIComponentManifest } from "../manifests/types";

class RendererRegistry {
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
    if (!entry) throw new Error(`Unknown renderer: ${id}${version != null ? `@${version}` : ""}`);
    return entry;
  }
}

export const rendererRegistry = new RendererRegistry();
