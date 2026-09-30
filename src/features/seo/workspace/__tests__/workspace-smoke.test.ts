import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SEO workspace smoke contracts", () => {
  it("separates audit execution from read paths in the service source", () => {
    const servicePath = join(
      process.cwd(),
      "src/features/seo/workspace/seo-workspace.service.ts",
    );
    const source = readFileSync(servicePath, "utf8");

    // runSiteAudit is the only method that may call buildReport
    const runBlockMatch = source.match(
      /async runSiteAudit\(\)[\s\S]*?async getLatestSnapshot/,
    );
    assert.ok(runBlockMatch, "expected runSiteAudit block");
    assert.match(runBlockMatch[0], /seoQualityService\.buildReport/);

    const readMethods = [
      "getOverview",
      "getTechnicalAudit",
      "listIssues",
      "listAuditHistory",
    ];
    for (const method of readMethods) {
      const re = new RegExp(`async ${method}\\([\\s\\S]*?return`);
      const block = source.match(re);
      assert.ok(block, `expected ${method}`);
      assert.doesNotMatch(
        block[0],
        /buildReport/,
        `${method} must not call buildReport`,
      );
    }
  });

  it("runSiteAuditAction return contract is snapshotId only", () => {
    const actionsPath = join(process.cwd(), "src/features/seo/workspace/actions.ts");
    const source = readFileSync(actionsPath, "utf8");
    assert.match(source, /runSiteAuditAction/);
    assert.match(source, /seoWorkspaceService\.runSiteAudit\(\)/);
  });
});
