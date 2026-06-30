/** Phase 3 cutover flags — see docs/entity-migration-runbook.md */

export function isEntityDualWriteEnabled(): boolean {
  return process.env.AZURA_ENTITY_DUAL_WRITE === "1";
}

export function isEntityWritePrimaryEnabled(): boolean {
  return process.env.AZURA_ENTITY_WRITE_PRIMARY === "1";
}

export function isEntityReadContentEnabled(): boolean {
  return (
    process.env.AZURA_ENTITY_READ_CONTENT === "1" ||
    process.env.AZURA_ENTITY_WRITE_PRIMARY === "1"
  );
}

export function isProductTableReadOnly(): boolean {
  return process.env.AZURA_PRODUCT_TABLE_READONLY === "1";
}
