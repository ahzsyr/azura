export type SpecMatchConfidence =
  | "EXACT"
  | "CONTEXT_MATCH"
  | "ALIAS_MATCH"
  | "AMBIGUOUS"
  | "UNMAPPED";

export interface CanonicalSpecRecord {
  value: string;
  display?: string;
  unit?: string | null;
  source_group?: string;
  source_label?: string;
  confidence?: SpecMatchConfidence;
  score?: number;
  name?: string;
}

export interface ProductSpecSource {
  group?: string;
  label?: string;
  shopUid?: string;
}

export interface UnmappedSpecDiagnostic {
  source_group: string;
  source_label: string;
  value: string;
  reason: SpecMatchConfidence;
  candidates?: string[];
}

export interface RegistrySpecDefinition {
  id: string;
  name: string;
  domain?: string;
  type?: string;
  unit?: string | null;
  aliases?: string[];
  contexts?: {
    source_groups?: string[];
    product_domains?: string[];
  };
  value_patterns?: string[];
  display?: { group?: string; order?: number };
}
