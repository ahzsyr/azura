import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesRoutingRule } from "@/features/forms/lib/routing";
import { parseAutomationRules } from "@/features/forms/lib/automation-rules";

describe("form automation", () => {
  it("parses automation rules from raw JSON", () => {
    const rules = parseAutomationRules([
      {
        id: "a1",
        condition: "score >= 10",
        actions: [{ type: "tag", tags: ["hot"] }],
      },
    ]);
    assert.equal(rules?.length, 1);
    assert.equal(rules?.[0].actions[0].type, "tag");
  });

  it("matches routing conditions for automation-like rules", () => {
    assert.equal(matchesRoutingRule({ id: "r", condition: "score >= 10" }, { score: 12 }), true);
  });
});
