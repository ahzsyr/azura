import type { UIComponentManifest } from "../manifests/types";
import { nodeRegistry } from "./node-registry";
import { propertyRegistry } from "./property-registry";
import { rendererRegistry } from "./renderer-registry";

class SchemaRegistry {
  register(manifest: UIComponentManifest): void {
    nodeRegistry.register(manifest);
    rendererRegistry.register(manifest);
    propertyRegistry.register(manifest);
  }

  registerAll(manifests: UIComponentManifest[]): void {
    for (const manifest of manifests) {
      this.register(manifest);
    }
  }

  getComponent(id: string, version?: number): UIComponentManifest | undefined {
    return nodeRegistry.get(id, version);
  }

  listComponents(): UIComponentManifest[] {
    return nodeRegistry.list();
  }

  byCategory(category: UIComponentManifest["category"]): UIComponentManifest[] {
    return nodeRegistry.byCategory(category);
  }
}

export const schemaRegistry = new SchemaRegistry();
