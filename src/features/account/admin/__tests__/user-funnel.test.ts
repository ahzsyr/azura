import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildUserFunnel } from "@/features/account/admin/user-funnel";

describe("buildUserFunnel", () => {
  it("marks stages from the earliest matching event", () => {
    const stages = buildUserFunnel({
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      events: [
        { name: "PageView", path: "/products", at: "2026-01-02T00:00:00.000Z" },
        { name: "ProductViewed", path: "/products/radio", at: "2026-01-03T00:00:00.000Z" },
        { name: "FormSubmitted", path: "/contact", at: "2026-01-04T00:00:00.000Z" },
        { name: "Login", path: "/account/login", at: "2026-01-05T00:00:00.000Z" },
      ],
    });
    const byId = Object.fromEntries(stages.map((stage) => [stage.id, stage]));
    assert.equal(byId.first_seen?.reached, true);
    assert.equal(byId.landing?.detail, "/products");
    assert.equal(byId.product?.reached, true);
    assert.equal(byId.cta?.reached, true);
    assert.equal(byId.registration?.reached, false);
    assert.equal(byId.login?.at, "2026-01-05T00:00:00.000Z");
    assert.deepEqual(
      stages.map((stage) => stage.id),
      ["first_seen", "landing", "product", "cta", "registration", "login"],
    );
  });

  it("stays empty when the browser has not been seen", () => {
    const stages = buildUserFunnel({ firstSeenAt: null, events: [] });
    assert.equal(stages.every((stage) => !stage.reached), true);
  });
});
