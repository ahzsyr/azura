import "server-only";

import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { resolveModuleIngressAccess } from "@/config/deployment-profile/site-features";
import { requireModulePermission } from "@/features/auth/guards";
import { ADVANCED_SEO_BOUNDARY_MARKER } from "@/modules/advanced-seo/boundary-marker";
import { ADVANCED_SEO_MODULE_ID } from "@/modules/advanced-seo/manifest";
import { decideAdvancedSeoMutation } from "@/modules/advanced-seo/ingress-decision";

void ADVANCED_SEO_BOUNDARY_MARKER;

export class AdvancedSeoMutationDeniedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Advanced SEO is not available (${reason})`);
    this.name = "AdvancedSeoMutationDeniedError";
    this.reason = reason;
  }
}

async function resolveDecision() {
  const access = await resolveModuleIngressAccess(ADVANCED_SEO_MODULE_ID);
  return decideAdvancedSeoMutation(access);
}

/** Admin Advanced page — 404 when omitted / inactive / ledger unavailable / missing read. */
export async function requireAdvancedSeoPage(): Promise<void> {
  const decision = await resolveDecision();
  if (!decision.allow) notFound();
  try {
    await requireModulePermission(ADVANCED_SEO_MODULE_ID, "read");
  } catch {
    notFound();
  }
}

/** Server actions / write services — refuse before side effects, then Module manage ACL. */
export async function assertAdvancedSeoMutationAllowed(): Promise<void> {
  const decision = await resolveDecision();
  if (!decision.allow) throw new AdvancedSeoMutationDeniedError(decision.reason);
  await requireModulePermission(ADVANCED_SEO_MODULE_ID, "manage");
}

/** Node API routes — 403 JSON (ingress + manage). */
export async function advancedSeoApiGuardResponse(): Promise<NextResponse | null> {
  const decision = await resolveDecision();
  if (!decision.allow) {
    return NextResponse.json({ ok: false, reason: decision.reason }, { status: 403 });
  }
  try {
    await requireModulePermission(ADVANCED_SEO_MODULE_ID, "manage");
  } catch {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  return null;
}

/** Soft-disable Advanced configure UI on the shared integrations page. */
export async function isAdvancedSeoMutationAllowed(): Promise<boolean> {
  const decision = await resolveDecision();
  return decision.allow;
}
