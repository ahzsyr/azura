import type { PrismaClient } from "@prisma/client";

function stubModelDelegate() {
  return new Proxy(
    {},
    {
      get(_target, method) {
        return async () => {
          switch (String(method)) {
            case "findMany":
            case "groupBy":
              return [];
            case "findFirst":
            case "findUnique":
              return null;
            case "count":
              return 0;
            case "aggregate":
              return { _count: { _all: 0 } };
            case "updateMany":
            case "deleteMany":
            case "createMany":
              return { count: 0 };
            case "create":
            case "update":
            case "upsert":
            case "delete":
              return {};
            default:
              return null;
          }
        };
      },
    },
  );
}

/** In-memory Prisma stand-in when BUILD_WITHOUT_DB (avoids auth during `next build` workers). */
export function createBuildStubPrismaClient(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const key = String(prop);
      if (key === "then") return undefined;
      if (key.startsWith("$")) {
        return async () => (key === "$transaction" ? [] : undefined);
      }
      return stubModelDelegate();
    },
  });
}
