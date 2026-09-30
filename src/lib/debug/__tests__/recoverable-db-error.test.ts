import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isRecoverableDbError } from "@/lib/debug/recoverable-db-error";

describe("isRecoverableDbError", () => {
  it("treats missing marketing tables as recoverable", () => {
    const error = Object.assign(new Error("Invalid `prisma.marketingVisitor.upsert()` invocation"), {
      code: "P2021",
    });
    error.message += "\nThe table `MarketingVisitor` does not exist in the current database.";
    assert.equal(isRecoverableDbError(error), true);
  });

  it("treats Turbopack-wrapped Prisma invocations as recoverable", () => {
    const error = new Error(
      'Invalid `__TURBOPACK__imported__module__["prisma"].marketingVisitor.upsert()` invocation',
    );
    assert.equal(isRecoverableDbError(error), true);
  });

  it("does not swallow unrelated failures", () => {
    assert.equal(isRecoverableDbError(new Error("visitorToken and sessionToken required")), false);
  });
});
