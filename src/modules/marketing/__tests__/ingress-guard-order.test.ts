/**
 * Static guard-order check: P0 Marketing route modules must resolve ingress
 * access before body parse / webhook challenge / OAuth bootstrap side effects.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function readRoute(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function indexOfFirst(source: string, patterns: RegExp[]): number {
  let best = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (!match) continue;
    if (best < 0 || match.index < best) best = match.index;
  }
  return best;
}

describe("Marketing P0 route guard ordering (static)", () => {
  it("events resolves ingress before request.json", () => {
    const source = readRoute("src/app/api/marketing/events/route.ts");
    const access = source.indexOf("resolveMarketingIngressAccess");
    const json = source.indexOf("request.json");
    assert.ok(access >= 0, "must call resolveMarketingIngressAccess");
    assert.ok(json >= 0, "must parse JSON");
    assert.ok(access < json, "ingress resolve must precede request.json");
  });

  it("attribution resolves ingress before request.json", () => {
    const source = readRoute("src/app/api/marketing/attribution/capture/route.ts");
    const access = source.indexOf("resolveMarketingIngressAccess");
    const json = source.indexOf("request.json");
    assert.ok(access >= 0);
    assert.ok(json >= 0);
    assert.ok(access < json, "ingress resolve must precede request.json");
  });

  it("webhooks resolve access before completeChallenge / ingest side-effect markers", () => {
    const source = readRoute("src/app/api/marketing/webhooks/[provider]/route.ts");
    const access = indexOfFirst(source, [
      /resolveMarketingIngressAccess/,
      /handleMarketingWebhookGetIngress/,
      /handleMarketingWebhookPostIngress/,
    ]);
    assert.ok(access >= 0, "must wire ingress resolve or handlers");
    // Handler modules own ordering; route must not call completeChallenge directly.
    assert.doesNotMatch(source, /completeChallenge\s*\(/);
  });

  it("OAuth start resolves access before bootstrapMarketingModule", () => {
    const route = readRoute("src/app/api/marketing/oauth/[provider]/start/route.ts");
    const handleCall = route.indexOf("return handleMarketingOAuthStartIngress");
    const bootstrapCall = route.indexOf("await bootstrapMarketingModule()");
    assert.ok(handleCall >= 0, "must return handleMarketingOAuthStartIngress");
    assert.ok(bootstrapCall >= 0, "must call bootstrapMarketingModule inside start");
    assert.ok(
      handleCall < bootstrapCall,
      "handler invoke must precede bootstrap call (bootstrap only inside start callback)",
    );

    const handlerSrc = readRoute("src/modules/marketing/ingress/handlers.ts");
    const startFn = handlerSrc.indexOf("handleMarketingOAuthStartIngress");
    const accessInStart = handlerSrc.indexOf("resolveAccess", startFn);
    const startCallback = handlerSrc.indexOf("deps.start()", startFn);
    assert.ok(accessInStart >= 0 && startCallback >= 0);
    assert.ok(
      accessInStart < startCallback,
      "OAuth start handler must resolveAccess before deps.start()",
    );
  });

  it("short-link route resolves marketing ingress before campaign work", () => {
    const source = readRoute("src/app/a/route.ts");
    assert.match(source, /resolveMarketingIngressAccess|handleMarketingShortLink/);
    const shortLink = readRoute("src/modules/marketing/ingress/short-link.ts");
    const access = shortLink.indexOf("resolveAccess");
    const findCampaign = shortLink.indexOf("findCampaignByInternalId");
    assert.ok(access >= 0 && findCampaign >= 0);
    assert.ok(access < findCampaign, "short-link must resolve access before campaign lookup");
  });
});
