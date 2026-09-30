import type {
  EntityType,
  GraphEntity,
  GraphRelationship,
  PublicEntityId,
  RelationshipType,
} from "../types";

export type EntityFilter = {
  type?: EntityType | EntityType[];
  slug?: string;
  publicIds?: PublicEntityId[];
};

export type RelationshipFilter = {
  type?: RelationshipType | RelationshipType[];
  fromPublicId?: PublicEntityId;
  toPublicId?: PublicEntityId;
};

export interface EntityRepository {
  getByPublicId(publicId: PublicEntityId): Promise<GraphEntity | null>;
  getByUuid(uuid: string): Promise<GraphEntity | null>;
  list(filter?: EntityFilter): Promise<GraphEntity[]>;
  upsert(entity: GraphEntity): Promise<GraphEntity>;
  deleteByPublicId(publicId: PublicEntityId): Promise<boolean>;
}

export interface RelationshipRepository {
  list(filter?: RelationshipFilter): Promise<GraphRelationship[]>;
  upsert(relationship: GraphRelationship): Promise<GraphRelationship>;
  deleteByUuid(uuid: string): Promise<boolean>;
}

export interface EntityStore {
  entities: EntityRepository;
  relationships: RelationshipRepository;
  clear?(): Promise<void>;
}

export type TraversalDirection = "out" | "in" | "both";

export type TraversalStep = {
  entity: GraphEntity;
  via?: GraphRelationship;
  depth: number;
};

export interface GraphQueryService {
  getEntity(publicId: PublicEntityId): Promise<GraphEntity | null>;
  getNeighbors(
    publicId: PublicEntityId,
    options?: {
      types?: RelationshipType[];
      direction?: TraversalDirection;
      limit?: number;
    },
  ): Promise<Array<{ relationship: GraphRelationship; entity: GraphEntity }>>;
  findByType(type: EntityType): Promise<GraphEntity[]>;
}

export interface GraphTraversalService {
  traverse(
    startPublicId: PublicEntityId,
    options?: {
      maxDepth?: number;
      relationshipTypes?: RelationshipType[];
      direction?: TraversalDirection;
      limit?: number;
    },
  ): Promise<TraversalStep[]>;
}
