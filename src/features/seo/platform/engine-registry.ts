import type { SeoEngine, SeoEngineLayer } from "./types";

const engines = new Map<string, SeoEngine>();
const defaultByLayer = new Map<SeoEngineLayer, string>();

export function registerEngine(id: string, engine: SeoEngine, options?: { default?: boolean }) {
  engines.set(id, engine);
  if (options?.default ?? !defaultByLayer.has(engine.layer)) {
    defaultByLayer.set(engine.layer, id);
  }
}

export function resolveEngine(layer: SeoEngineLayer): SeoEngine | undefined {
  const id = defaultByLayer.get(layer);
  return id ? engines.get(id) : undefined;
}

export function getEngine(id: string): SeoEngine | undefined {
  return engines.get(id);
}

export function listEngines(): SeoEngine[] {
  return [...engines.values()];
}

export function clearEngineRegistry(): void {
  engines.clear();
  defaultByLayer.clear();
}
