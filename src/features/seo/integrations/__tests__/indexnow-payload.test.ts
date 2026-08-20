import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alignIndexNowStoredConfig,
  buildIndexNowPayload,
  resolveIndexNowCanonicalOrigin,
  resolveIndexNowKeyLocation,
} from "../indexnow-payload";
import {
  clearIndexNowProbeCacheForTests,
  probeIndexNowVerifiedOrigin,
} from "../indexnow-verify-origin";

describe("buildIndexNowPayload", () => {
  it("keeps the live apex page host and rewrites a www keyLocation onto it", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      const payload = buildIndexNowPayload(
        { apiKey: "abc123", keyLocation: "https://www.brt-me.com/abc123.txt" },
        "https://brt-me.com/en/products/mikrotik-hap",
      );

      assert.equal(payload.host, "brt-me.com");
      assert.deepEqual(payload.urlList, ["https://brt-me.com/en/products/mikrotik-hap"]);
      assert.equal(payload.keyLocation, "https://brt-me.com/abc123.txt");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("does not flip apex URLs onto www when a www origin is probed", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      const payload = buildIndexNowPayload(
        { apiKey: "abc123", keyLocation: "https://www.brt-me.com/abc123.txt" },
        "https://brt-me.com/en/products/mikrotik-hap",
        "https://www.brt-me.com",
      );

      assert.equal(payload.host, "brt-me.com");
      assert.deepEqual(payload.urlList, ["https://brt-me.com/en/products/mikrotik-hap"]);
      assert.equal(payload.keyLocation, "https://brt-me.com/abc123.txt");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("rewrites www page URLs onto the public apex origin", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      const payload = buildIndexNowPayload(
        { apiKey: "abc123", keyLocation: "https://www.brt-me.com/abc123.txt" },
        "https://www.brt-me.com/en/products/mikrotik-hap",
        "https://www.brt-me.com",
      );

      assert.equal(payload.host, "brt-me.com");
      assert.deepEqual(payload.urlList, ["https://brt-me.com/en/products/mikrotik-hap"]);
      assert.equal(payload.keyLocation, "https://brt-me.com/abc123.txt");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("defaults key location onto the page origin", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      const payload = buildIndexNowPayload({ apiKey: "deadbeef" }, "https://brt-me.com/en/about");
      assert.equal(payload.keyLocation, "https://brt-me.com/deadbeef.txt");
      assert.equal(payload.host, "brt-me.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("replaces a Media upload keyLocation with /{key}.txt", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      const payload = buildIndexNowPayload(
        {
          apiKey: "abc123key",
          keyLocation: "https://brt-me.com/uploads/documents/1786959488935-indexnow-key.txt",
        },
        "https://brt-me.com/en/products/mikrotik-knot-lr8g-kit",
      );
      assert.equal(payload.keyLocation, "https://brt-me.com/abc123key.txt");
      assert.equal(payload.host, "brt-me.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});

describe("resolveIndexNowCanonicalOrigin", () => {
  it("prefers NEXT_PUBLIC_SITE_URL over a www verified origin", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      assert.equal(
        resolveIndexNowCanonicalOrigin(
          "https://brt-me.com/en/products/x",
          { keyLocation: "https://www.brt-me.com/key.txt" },
          "https://www.brt-me.com",
        ),
        "https://brt-me.com",
      );
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("keeps apex when no verified origin is passed", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      assert.equal(
        resolveIndexNowCanonicalOrigin("https://brt-me.com/en/products/x", {
          keyLocation: "https://www.brt-me.com/key.txt",
        }),
        "https://brt-me.com",
      );
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});

describe("resolveIndexNowKeyLocation", () => {
  it("rewrites www key files onto the submission origin when the filename is the key", () => {
    assert.equal(
      resolveIndexNowKeyLocation("https://www.brt-me.com/abc.txt", "https://brt-me.com", "abc"),
      "https://brt-me.com/abc.txt",
    );
  });

  it("rejects uploaded document paths that are not {key}.txt", () => {
    assert.equal(
      resolveIndexNowKeyLocation(
        "https://brt-me.com/uploads/documents/1786959488935-indexnow-key.txt",
        "https://brt-me.com",
        "abc123key",
      ),
      "https://brt-me.com/abc123key.txt",
    );
  });

  it("replaces a different host with the submission-origin key file", () => {
    assert.equal(
      resolveIndexNowKeyLocation("https://cdn.example.com/abc.txt", "https://brt-me.com", "abc"),
      "https://brt-me.com/abc.txt",
    );
  });
});

describe("alignIndexNowStoredConfig", () => {
  it("rewrites www keyLocation onto the public apex origin", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      const aligned = alignIndexNowStoredConfig({
        apiKey: "abc123",
        keyLocation: "https://www.brt-me.com/abc123.txt",
        siteUrl: "https://www.brt-me.com",
      });
      assert.equal(aligned.keyLocation, "https://brt-me.com/abc123.txt");
      assert.equal(aligned.siteUrl, "https://brt-me.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});

describe("probeIndexNowVerifiedOrigin", () => {
  it("skips a www host that 308s and uses the apex host that serves the key", async () => {
    clearIndexNowProbeCacheForTests();
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      const origin = await probeIndexNowVerifiedOrigin({
        pageUrl: "https://www.brt-me.com/en/products/mikrotik-hap",
        config: { apiKey: "probe-key-308", keyLocation: "https://www.brt-me.com/probe-key-308.txt" },
        preferredOrigin: "https://www.brt-me.com",
        fetchImpl: async (url) => {
          if (url.startsWith("https://www.brt-me.com/")) {
            return { ok: false, status: 308, text: async () => "" };
          }
          if (url === "https://brt-me.com/probe-key-308.txt") {
            return { ok: true, status: 200, text: async () => "probe-key-308\n" };
          }
          return { ok: false, status: 404, text: async () => "" };
        },
      });
      assert.equal(origin, "https://brt-me.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("ignores an internal 200 on www when NEXT_PUBLIC_SITE_URL is apex", async () => {
    clearIndexNowProbeCacheForTests();
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://brt-me.com";
    try {
      const origin = await probeIndexNowVerifiedOrigin({
        pageUrl: "https://brt-me.com/en",
        config: { apiKey: "probe-key-www200", keyLocation: "https://www.brt-me.com/probe-key-www200.txt" },
        preferredOrigin: "https://www.brt-me.com",
        fetchImpl: async (url) => {
          if (url.startsWith("https://www.brt-me.com/")) {
            return { ok: true, status: 200, text: async () => "probe-key-www200\n" };
          }
          if (url === "https://brt-me.com/probe-key-www200.txt") {
            return { ok: false, status: 404, text: async () => "" };
          }
          return { ok: false, status: 404, text: async () => "" };
        },
      });
      assert.equal(origin, "https://brt-me.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});
