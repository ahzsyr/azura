import type {
  GraphEntity,
  GraphRelationship,
  PublicEntityId,
} from "../types";
import type {
  EntityFilter,
  EntityRepository,
  EntityStore,
  GraphQueryService,
  GraphTraversalService,
  RelationshipFilter,
  RelationshipRepository,
  TraversalStep,
} from "./interfaces";

function matchesEntityFilter(entity: GraphEntity, filter?: EntityFilter): boolean {
  if (!filter) return true;
  if (filter.slug && entity.slug !== filter.slug) return false;
  if (filter.publicIds && !filter.publicIds.includes(entity.publicId)) return false;
  if (filter.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
    if (!types.includes(entity.type)) return false;
  }
  return true;
}

function matchesRelationshipFilter(
  rel: GraphRelationship,
  filter?: RelationshipFilter,
): boolean {
  if (!filter) return true;
  if (filter.fromPublicId && rel.fromPublicId !== filter.fromPublicId) return false;
  if (filter.toPublicId && rel.toPublicId !== filter.toPublicId) return false;
  if (filter.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
    if (!types.includes(rel.type)) return false;
  }
  return true;
}

export function createInMemoryEntityStore(): EntityStore {
  const entities = new Map<PublicEntityId, GraphEntity>();
  const entitiesByUuid = new Map<string, PublicEntityId>();
  const relationships = new Map<string, GraphRelationship>();

  const entityRepo: EntityRepository = {
    async getByPublicId(publicId) {
      return entities.get(publicId) ?? null;
    },
    async getByUuid(uuid) {
      const publicId = entitiesByUuid.get(uuid);
      return publicId ? entities.get(publicId) ?? null : null;
    },
    async list(filter) {
      return [...entities.values()].filter((e) => matchesEntityFilter(e, filter));
    },
    async upsert(entity) {
      const existing = entities.get(entity.publicId);
      const next: GraphEntity = {
        ...entity,
        uuid: existing?.uuid ?? entity.uuid,
        createdAt: existing?.createdAt ?? entity.createdAt,
        updatedAt: new Date().toISOString(),
      };
      entities.set(next.publicId, next);
      entitiesByUuid.set(next.uuid, next.publicId);
      return next;
    },
    async deleteByPublicId(publicId) {
      const existing = entities.get(publicId);
      if (!existing) return false;
      entities.delete(publicId);
      entitiesByUuid.delete(existing.uuid);
      for (const [uuid, rel] of relationships) {
        if (rel.fromPublicId === publicId || rel.toPublicId === publicId) {
          relationships.delete(uuid);
        }
      }
      return true;
    },
  };

  const relationshipRepo: RelationshipRepository = {
    async list(filter) {
      return [...relationships.values()].filter((r) => matchesRelationshipFilter(r, filter));
    },
    async upsert(relationship) {
      const key = `${relationship.type}:${relationship.fromPublicId}->${relationship.toPublicId}`;
      const existing = [...relationships.values()].find(
        (r) =>
          r.type === relationship.type &&
          r.fromPublicId === relationship.fromPublicId &&
          r.toPublicId === relationship.toPublicId,
      );
      const next: GraphRelationship = {
        ...relationship,
        uuid: existing?.uuid ?? relationship.uuid,
        createdAt: existing?.createdAt ?? relationship.createdAt,
        updatedAt: new Date().toISOString(),
      };
      if (existing) relationships.delete(existing.uuid);
      relationships.set(next.uuid, next);
      void key;
      return next;
    },
    async deleteByUuid(uuid) {
      return relationships.delete(uuid);
    },
  };

  return {
    entities: entityRepo,
    relationships: relationshipRepo,
    async clear() {
      entities.clear();
      entitiesByUuid.clear();
      relationships.clear();
    },
  };
}

export function createGraphQueryService(store: EntityStore): GraphQueryService {
  return {
    async getEntity(publicId) {
      return store.entities.getByPublicId(publicId);
    },
    async findByType(type) {
      return store.entities.list({ type });
    },
    async getNeighbors(publicId, options) {
      const direction = options?.direction ?? "out";
      const types = options?.types;
      const limit = options?.limit ?? 100;
      const rels = await store.relationships.list();
      const matched = rels.filter((rel) => {
        if (types && !types.includes(rel.type)) return false;
        if (direction === "out") return rel.fromPublicId === publicId;
        if (direction === "in") return rel.toPublicId === publicId;
        return rel.fromPublicId === publicId || rel.toPublicId === publicId;
      });

      const results: Array<{ relationship: GraphRelationship; entity: GraphEntity }> = [];
      for (const relationship of matched.slice(0, limit)) {
        const otherId =
          relationship.fromPublicId === publicId
            ? relationship.toPublicId
            : relationship.fromPublicId;
        const entity = await store.entities.getByPublicId(otherId);
        if (entity) results.push({ relationship, entity });
      }
      return results;
    },
  };
}

export function createGraphTraversalService(
  store: EntityStore,
  query: GraphQueryService,
): GraphTraversalService {
  return {
    async traverse(startPublicId, options) {
      const maxDepth = options?.maxDepth ?? 2;
      const limit = options?.limit ?? 200;
      const visited = new Set<PublicEntityId>();
      const steps: TraversalStep[] = [];
      const queue: Array<{ id: PublicEntityId; depth: number; via?: GraphRelationship }> = [
        { id: startPublicId, depth: 0 },
      ];

      while (queue.length > 0 && steps.length < limit) {
        const current = queue.shift()!;
        if (visited.has(current.id)) continue;
        visited.add(current.id);
        const entity = await query.getEntity(current.id);
        if (!entity) continue;
        steps.push({ entity, via: current.via, depth: current.depth });
        if (current.depth >= maxDepth) continue;

        const neighbors = await query.getNeighbors(current.id, {
          types: options?.relationshipTypes,
          direction: options?.direction ?? "out",
        });
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.entity.publicId)) {
            queue.push({
              id: neighbor.entity.publicId,
              depth: current.depth + 1,
              via: neighbor.relationship,
            });
          }
        }
      }

      return steps;
    },
  };
}
