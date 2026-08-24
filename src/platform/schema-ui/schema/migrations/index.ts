import type { SchemaDocument } from "../schema-document";
import type { SchemaMigration } from "../../manifests/types";
import { migration001V1ToV2 } from "./001-v1-to-v2";

const MIGRATIONS: SchemaMigration[] = [migration001V1ToV2];

export function runSchemaMigrations(raw: unknown): SchemaDocument {
  let current: Record<string, unknown> =
    raw != null && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {};

  if (current.definitionVersion == null && Array.isArray(current.fields)) {
    current.definitionVersion = 1;
  }

  if (current.definitionVersion == null) {
    current.definitionVersion = 2;
  }

  let version = Number(current.definitionVersion);
  let safety = 0;

  while (safety < MIGRATIONS.length + 2) {
    const migration = MIGRATIONS.find((m) => m.from === version);
    if (!migration) break;
    current = migration.migrate(current);
    version = migration.to;
    current.definitionVersion = version;
    safety += 1;
  }

  return {
    definitionVersion: Number(current.definitionVersion ?? 2),
    nodes: Array.isArray(current.nodes) ? current.nodes : [],
    bindings: Array.isArray(current.bindings) ? current.bindings : [],
    steps: Array.isArray(current.steps) ? current.steps : undefined,
    rules: Array.isArray(current.rules) ? current.rules : undefined,
    stateMachineId: typeof current.stateMachineId === "string" ? current.stateMachineId : undefined,
    theme: current.theme as SchemaDocument["theme"],
  };
}

export { MIGRATIONS };
