import { randomUUID } from "node:crypto";

/**
 * In-memory stand-in for the Prisma model delegates used by the auth/account
 * services. Deliberately tiny: it supports the query shapes those services use
 * (equality filters, `gt`/`in`, `increment`, plain `updateMany`, `createMany`,
 * `deleteMany`) and nothing else, so an unsupported query fails loudly.
 */
function matches(row, where) {
  return Object.entries(where ?? {}).every(([key, expected]) => {
    if (expected && typeof expected === "object" && !(expected instanceof Date) && !Array.isArray(expected)) {
      if ("gt" in expected) return row[key] > expected.gt;
      if ("in" in expected) return expected.in.includes(row[key]);
      if ("increment" in expected) return true;
      // Relation/select-shaped filters are not part of these queries.
      return true;
    }
    return row[key] === expected;
  });
}

/**
 * Resolve `include: { relation: true | { select } }`. Only the owning side of
 * the relations the services read is modelled (e.g. token → user).
 */
const RELATIONS = {
  passwordResetToken: { user: { table: "user", foreignKey: "userId" } },
  emailOtpToken: { user: { table: "user", foreignKey: "userId" } },
  adminInviteToken: { user: { table: "user", foreignKey: "userId" } },
  emailVerificationToken: { user: { table: "user", foreignKey: "userId" } },
};

function withInclude(tables, name, row, include) {
  const result = { ...row };
  for (const [relation, spec] of Object.entries(include)) {
    if (!spec) continue;
    const mapping = RELATIONS[name]?.[relation];
    if (!mapping) throw new Error(`[test] include ${name}.${relation} is not modelled`);
    const related = (tables[mapping.table] ?? []).find(
      (candidate) => candidate.id === row[mapping.foreignKey],
    );
    result[relation] = related ? { ...related } : null;
  }
  return result;
}

function createDelegate(tables, name) {
  const rows = () => tables[name];
  return {
    async findUnique({ where, include }) {
      const row = rows().find((candidate) => matches(candidate, where));
      if (!row) return null;
      return include ? withInclude(tables, name, row, include) : row;
    },
    async findFirst({ where = {}, include } = {}) {
      const row = rows().find((candidate) => matches(candidate, where));
      if (!row) return null;
      return include ? withInclude(tables, name, row, include) : row;
    },
    async findMany({ where = {} } = {}) {
      return rows().filter((row) => matches(row, where));
    },
    async count({ where = {} } = {}) {
      return rows().filter((row) => matches(row, where)).length;
    },
    async create({ data }) {
      const row = { createdAt: new Date(), usedAt: null, ...data, id: data.id ?? randomUUID() };
      rows().push(row);
      return row;
    },
    async createMany({ data }) {
      for (const entry of data) {
        rows().push({ createdAt: new Date(), usedAt: null, ...entry, id: entry.id ?? randomUUID() });
      }
      return { count: data.length };
    },
    async update({ where, data }) {
      const row = rows().find((candidate) => matches(candidate, where));
      if (!row) throw new Error(`[test] ${name}.update could not find a row`);
      applyUpdate(row, data);
      return row;
    },
    async updateMany({ where, data }) {
      const found = rows().filter((row) => matches(row, where));
      for (const row of found) applyUpdate(row, data);
      return { count: found.length };
    },
    async deleteMany({ where = {} } = {}) {
      const before = rows().length;
      tables[name] = rows().filter((row) => !matches(row, where));
      return { count: before - tables[name].length };
    },
  };
}

function applyUpdate(row, data) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "increment" in value) {
      row[key] = Number(row[key] ?? 0) + Number(value.increment);
    } else {
      row[key] = value;
    }
  }
}

export function createFakePrisma(initial = {}) {
  const tables = {};
  for (const name of [
    "user",
    "emailOtpToken",
    "passwordResetToken",
    "mfaRecoveryCode",
    "securityAuditLog",
    "rateLimitBucket",
  ]) {
    tables[name] = (initial[name] ?? []).map((row) => ({ ...row }));
  }

  const client = {
    tables,
    async $transaction(arg) {
      if (typeof arg === "function") return arg(client);
      return Promise.all(arg);
    },
  };
  for (const name of Object.keys(tables)) {
    client[name] = createDelegate(tables, name);
  }
  return client;
}

/** The client every service sees (replaced per test file via reset()). */
let current = createFakePrisma();

export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const value = current[prop];
      if (value === undefined) {
        throw new Error(`[test] prisma.${String(prop)} is not modelled by the fake client`);
      }
      return typeof value === "function" ? value.bind(current) : value;
    },
  },
);

/** Reset the in-memory database between tests. */
export function __resetFakePrisma(initial = {}) {
  current = createFakePrisma(initial);
  return current;
}

/** Inspect rows written by the code under test. */
export function __table(name) {
  const rows = current.tables[name];
  if (!rows) throw new Error(`[test] unknown table ${name}`);
  return rows;
}

export default prisma;
