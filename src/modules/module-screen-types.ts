export type ModuleScreenDependency = {
  id: string;
  label: string;
  included: boolean;
  enabled: boolean;
  /** A switch is offered only for a generated profile's included module or preset. */
  writable: boolean;
};

export type ModuleScreenRow = {
  id: string;
  label: string;
  version: string;
  included: boolean;
  enabled: boolean;
  writable: boolean;
  requiredPresets: ModuleScreenDependency[];
  requiredCapabilities: ModuleScreenDependency[];
  packageKind: string;
  status: string;
};

export type ModuleScreenModel = {
  profileGenerated: boolean;
  modules: ModuleScreenRow[];
};
