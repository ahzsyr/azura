export type ModuleScreenDependency = {
  id: string;
  label: string;
  included: boolean;
  enabled: boolean;
  /** A switch is offered only for a generated profile's included module or preset. */
  writable: boolean;
};

export type ModuleScreenPackageDep = {
  id: string;
  label: string;
  included: boolean;
  /** Ledger/runtime active. */
  active: boolean;
};

export type ModuleCompatibility = {
  ok: boolean;
  range: string;
  detail: string | null;
};

export type ModuleMigrationSummary = {
  appliedUps: number;
  pendingUpFilenames: string[];
};

export type ModuleScreenRow = {
  id: string;
  label: string;
  version: string;
  included: boolean;
  enabled: boolean;
  /** False for pending / non-builtin rows — no enable toggle. */
  writable: boolean;
  /** True when the package id is registered in this server build's module manifests. */
  builtin: boolean;
  requiredPresets: ModuleScreenDependency[];
  requiredCapabilities: ModuleScreenDependency[];
  requiredPackages: ModuleScreenPackageDep[];
  /** Required packages that are inactive or missing — blocks activate. */
  dependencyBlockers: string[];
  /** Active packages that require this one — blocks deactivate. */
  dependentBlockers: string[];
  compatibility: ModuleCompatibility;
  migrationSummary: ModuleMigrationSummary;
  packageKind: string;
  status: string;
  /** Phase 3 — Modules Manager deep-link when Module registers settings adminPath. */
  settingsHref: string | null;
  /** Latest lifecycle failure hint from audit (if any). */
  lastFailureHint: string | null;
};

export type ModuleScreenModel = {
  profileGenerated: boolean;
  modules: ModuleScreenRow[];
};
