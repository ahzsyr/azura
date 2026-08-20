import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isMissingEditorialDisplayColumn,
  missingScalarColumnsFromPrismaError,
  withoutEditorialDisplayColumns,
  withoutScalarColumns,
} from "@/lib/prisma-editorial-column-compat";

describe("prisma missing column compat", () => {
  it("parses Hostinger P2022 column paths", () => {
    assert.deepEqual(
      missingScalarColumnsFromPrismaError({
        code: "P2022",
        message:
          "The column u842701143_safeermedina.Post.featuredImageSettings does not exist in the current database.",
      }),
      ["featuredImageSettings"],
    );
    assert.deepEqual(
      missingScalarColumnsFromPrismaError({
        code: "P2022",
        message: "The column `CmsPage.showAuthor` does not exist in the current database.",
      }),
      ["showAuthor"],
    );
    assert.deepEqual(
      missingScalarColumnsFromPrismaError({
        message: "Unknown column 'showPublishedAt' in 'field list'",
      }),
      ["showPublishedAt"],
    );
    assert.deepEqual(
      missingScalarColumnsFromPrismaError(new Error("connection pool timeout")),
      [],
    );
  });

  it("detects Prisma P2022 for the reverted display columns", () => {
    assert.equal(
      isMissingEditorialDisplayColumn({
        code: "P2022",
        message: "The column `CmsPage.showAuthor` does not exist in the current database.",
      }),
      true,
    );
    assert.equal(isMissingEditorialDisplayColumn(new Error("connection pool timeout")), false);
  });

  it("omits missing columns on full-row reads", () => {
    const next = withoutScalarColumns(
      { where: { id: "p1" }, include: { author: true } },
      ["featuredImageSettings"],
    );
    assert.deepEqual(next.omit, { featuredImageSettings: true });
    assert.deepEqual(next.include, { author: true });
  });

  it("omits display columns on full-row reads", () => {
    const next = withoutEditorialDisplayColumns({
      where: { id: "p1" },
      include: { author: true },
    });
    assert.deepEqual(next.omit, { showAuthor: true, showPublishedAt: true });
    assert.deepEqual(next.include, { author: true });
  });

  it("strips display columns from an explicit select instead of mixing omit", () => {
    const next = withoutEditorialDisplayColumns({
      select: { id: true, slug: true, showAuthor: true, showPublishedAt: true },
    });
    assert.deepEqual(next.select, { id: true, slug: true });
    assert.equal("omit" in next, false);
  });

  it("strips display columns from write payloads", () => {
    const next = withoutEditorialDisplayColumns({
      data: { slug: "home", showAuthor: true, showPublishedAt: false },
    });
    assert.deepEqual(next.data, { slug: "home" });
  });
});
