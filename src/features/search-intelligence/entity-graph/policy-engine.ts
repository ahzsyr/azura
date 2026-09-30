import type { DataSourceKind } from "../types";

/** Global source precedence (higher index = lower priority). Overridable per property. */
export const DEFAULT_SOURCE_PRECEDENCE: readonly DataSourceKind[] = [
  "manual_admin",
  "company_profile",
  "google_business",
  "cms",
  "product_catalog",
  "api",
  "social",
  "media",
  "importer",
  "forms",
  "crawler",
  "ai",
] as const;

export type PropertyPolicy = {
  property: string;
  /** Ordered from highest to lowest priority. */
  precedence: DataSourceKind[];
};

export type PolicyEngineConfig = {
  defaultPrecedence?: DataSourceKind[];
  propertyPolicies?: PropertyPolicy[];
};

const DEFAULT_PROPERTY_POLICIES: PropertyPolicy[] = [
  { property: "logo", precedence: ["manual_admin", "company_profile", "cms", "media", "api", "importer", "ai"] },
  {
    property: "reviewCount",
    precedence: ["google_business", "api", "manual_admin", "cms", "importer", "crawler", "ai"],
  },
  {
    property: "aggregateRating",
    precedence: ["google_business", "api", "manual_admin", "cms", "importer", "crawler", "ai"],
  },
  {
    property: "phone",
    precedence: ["manual_admin", "company_profile", "google_business", "cms", "importer", "api", "crawler", "ai"],
  },
  {
    property: "address",
    precedence: ["manual_admin", "company_profile", "google_business", "cms", "importer", "api", "crawler", "ai"],
  },
  {
    property: "sameAs",
    precedence: ["manual_admin", "company_profile", "social", "cms", "api", "importer", "crawler", "ai"],
  },
  {
    property: "description",
    precedence: ["manual_admin", "company_profile", "cms", "product_catalog", "ai", "importer", "crawler"],
  },
];

export function createPolicyEngine(config: PolicyEngineConfig = {}) {
  const defaultPrecedence = config.defaultPrecedence ?? [...DEFAULT_SOURCE_PRECEDENCE];
  const policies = new Map<string, DataSourceKind[]>();
  for (const policy of [...DEFAULT_PROPERTY_POLICIES, ...(config.propertyPolicies ?? [])]) {
    policies.set(policy.property, policy.precedence);
  }

  function precedenceFor(property: string): DataSourceKind[] {
    return policies.get(property) ?? defaultPrecedence;
  }

  function rank(property: string, source: DataSourceKind): number {
    const list = precedenceFor(property);
    const idx = list.indexOf(source);
    return idx === -1 ? list.length + 1 : idx;
  }

  /** Returns true if incoming source should replace current source for this property. */
  function shouldReplace(
    property: string,
    currentSource: DataSourceKind,
    incomingSource: DataSourceKind,
  ): boolean {
    return rank(property, incomingSource) <= rank(property, currentSource);
  }

  return {
    precedenceFor,
    rank,
    shouldReplace,
    listPolicies(): PropertyPolicy[] {
      return [...policies.entries()].map(([property, precedence]) => ({ property, precedence }));
    },
  };
}

export type PolicyEngine = ReturnType<typeof createPolicyEngine>;
