import type { Prisma } from "@prisma/client";

export type JsonStoreRecord = {
  id: string;
  namespace: string;
  key: string;
  data: Prisma.JsonValue;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DatabaseOverview = {
  jsonEntries: number;
  namespaces: { name: string; count: number }[];
  relationalCounts: Record<string, number>;
};

export type SchemaModelInfo = {
  name: string;
  kind: "relational" | "json";
  note: string;
  count?: number;
};
