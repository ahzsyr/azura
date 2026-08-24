/**
 * Enterprise controls surface: versioning, multilingual views,
 * indexation lifecycle, schema version governance, and audit logs.
 */
import { createRevisionStore, type RevisionStore } from "../versioning";
import { createAuditLog, type AuditLog } from "../observability";
import {
  createIndexationLifecycleService,
  type IndexationLifecycleService,
} from "../indexing";
import {
  createSchemaVersionRegistry,
  type SchemaVersionRegistry,
} from "../schema/version-registry";

export { createRevisionStore } from "../versioning";
export type { RevisionStore } from "../versioning";
export { createAuditLog } from "../observability";
export type { AuditLog } from "../observability";
export { createIndexationLifecycleService } from "../indexing";
export type { IndexationLifecycleService } from "../indexing";
export { createSchemaVersionRegistry } from "../schema/version-registry";
export type { SchemaVersionRegistry } from "../schema/version-registry";
export {
  upsertLocaleView,
  readLocalizedProperty,
  listEntityLocales,
} from "../entity-graph/i18n";

export type EnterpriseControls = {
  revisions: RevisionStore;
  auditLog: AuditLog;
  indexation: IndexationLifecycleService;
  schemaVersions: SchemaVersionRegistry;
};

export function createEnterpriseControls(): EnterpriseControls {
  return {
    revisions: createRevisionStore(),
    auditLog: createAuditLog(),
    indexation: createIndexationLifecycleService(),
    schemaVersions: createSchemaVersionRegistry(),
  };
}
