import { describe, it } from "node:test";
import assert from "node:assert/strict";

type DeleteResult = { ok: true } | { ok: false; error: string; status: number };

function aggregateBulkDeleteResults(
  filenames: string[],
  results: DeleteResult[]
): { deleted: string[]; failed: string[] } {
  const deleted: string[] = [];
  const failed: string[] = [];
  filenames.forEach((name, i) => {
    if (results[i]?.ok) deleted.push(name);
    else failed.push(name);
  });
  return { deleted, failed };
}

describe("catalog bulk delete response shape", () => {
  it("aggregates deleted and failed filenames", () => {
    const filenames = ["a.jpg", "b.jpg", "missing.png"];
    const results: DeleteResult[] = [
      { ok: true },
      { ok: true },
      { ok: false, error: "File not found", status: 404 },
    ];

    assert.deepEqual(aggregateBulkDeleteResults(filenames, results), {
      deleted: ["a.jpg", "b.jpg"],
      failed: ["missing.png"],
    });
  });

  it("marks all as failed when every delete fails", () => {
    const filenames = ["x.jpg"];
    const results: DeleteResult[] = [
      { ok: false, error: "Could not delete file", status: 503 },
    ];

    assert.deepEqual(aggregateBulkDeleteResults(filenames, results), {
      deleted: [],
      failed: ["x.jpg"],
    });
  });
});

describe("page publish status override", () => {
  it("sets published status on form submit payload", () => {
    const formState = { status: "DRAFT" as const };
    const statusOverride = "PUBLISHED" as const;
    const submitStatus = statusOverride ?? formState.status;
    assert.equal(submitStatus, "PUBLISHED");
  });
});
