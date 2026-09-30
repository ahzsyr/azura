import type { DataSourceDefinition } from "../manifests/types";

class DataSourceRegistry {
  private readonly entries = new Map<string, DataSourceDefinition>();

  register(def: DataSourceDefinition): void {
    this.entries.set(def.id, def);
  }

  get(id: string): DataSourceDefinition | undefined {
    return this.entries.get(id);
  }

  getOrThrow(id: string): DataSourceDefinition {
    const entry = this.get(id);
    if (!entry) throw new Error(`Unknown data source: ${id}`);
    return entry;
  }

  list(): DataSourceDefinition[] {
    return [...this.entries.values()];
  }
}

export const dataSourceRegistry = new DataSourceRegistry();

export const staticDataSource: DataSourceDefinition = {
  id: "static",
  name: "Static options",
  resolve(config) {
    const options = (config?.options as Array<{ value: string; label: string }>) ?? [];
    return options;
  },
};

export const countriesDataSource: DataSourceDefinition = {
  id: "countries",
  name: "Countries",
  resolve() {
    return [
      { value: "AE", label: "United Arab Emirates" },
      { value: "US", label: "United States" },
      { value: "GB", label: "United Kingdom" },
      { value: "SA", label: "Saudi Arabia" },
    ];
  },
};

export const citiesDataSource: DataSourceDefinition = {
  id: "cities",
  name: "Cities",
  resolve(_config, ctx) {
    const country = String(ctx.parentValue ?? "");
    const map: Record<string, Array<{ value: string; label: string }>> = {
      AE: [
        { value: "dubai", label: "Dubai" },
        { value: "abudhabi", label: "Abu Dhabi" },
      ],
      US: [
        { value: "nyc", label: "New York" },
        { value: "la", label: "Los Angeles" },
      ],
    };
    return map[country] ?? [];
  },
};

export function registerBuiltinDataSources(): void {
  for (const ds of [staticDataSource, countriesDataSource, citiesDataSource]) {
    dataSourceRegistry.register(ds);
  }
}
