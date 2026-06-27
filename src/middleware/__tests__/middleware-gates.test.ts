import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAccountPath } from "@/features/account/account-middleware";
import { profileDisabledResponse } from "@/middleware/profile-gate";

describe("account-middleware", () => {
  it("parseAccountPath matches locale account routes", () => {
    assert.deepEqual(parseAccountPath("/en/account", ["en", "ar"]), {
      locale: "en",
      sub: "",
    });
    assert.deepEqual(parseAccountPath("/en/account/login", ["en", "ar"]), {
      locale: "en",
      sub: "login",
    });
    assert.equal(parseAccountPath("/admin", ["en"]), null);
  });
});

describe("profile-gate", () => {
  it("profileDisabledResponse returns 404", () => {
    const res = profileDisabledResponse();
    assert.equal(res.status, 404);
  });
});
