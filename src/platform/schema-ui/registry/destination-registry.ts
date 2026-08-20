import type { DestinationDefinition } from "../manifests/types";

class DestinationRegistry {
  private readonly entries = new Map<string, DestinationDefinition>();

  register(def: DestinationDefinition): void {
    this.entries.set(def.id, def);
  }

  get(id: string): DestinationDefinition | undefined {
    return this.entries.get(id);
  }

  list(): DestinationDefinition[] {
    return [...this.entries.values()];
  }
}

export const destinationRegistry = new DestinationRegistry();

export const inboxDestination: DestinationDefinition = {
  id: "inbox",
  name: "Save to inbox",
  async dispatch() {
    // Persist handled by pipeline persist handler
  },
};

export function registerBuiltinDestinations(): void {
  destinationRegistry.register(inboxDestination);
}
