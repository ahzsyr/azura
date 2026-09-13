"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireSuperAdmin } from "@/features/auth/guards";
import {
  disableAdminAccount,
  enableAdminAccount,
  forceAdminPasswordChange,
  inviteAdmin,
  revokeAdminSessions,
} from "@/features/auth/admin-invite.service";
import { getTrustedClientIp } from "@/lib/client-ip";
import { fail, ok, type ActionResult } from "@/types/api";

async function actorIp() {
  const h = await headers();
  return getTrustedClientIp(new Request("http://local", { headers: h }));
}

export async function inviteAdminAction(input: {
  email: string;
  name: string;
  locale?: string;
}): Promise<ActionResult<{ userId: string }>> {
  try {
    const session = await requireSuperAdmin();
    const result = await inviteAdmin({
      email: input.email,
      name: input.name,
      locale: input.locale,
      invitedBy: { id: session.user.id, role: session.user.role },
      ip: await actorIp(),
    });
    if ("error" in result) return fail(result.error);
    revalidatePath("/admin/settings/staff");
    return ok({ userId: result.userId });
  } catch {
    return fail("Forbidden or invite failed");
  }
}

export async function disableAdminAction(userId: string): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireSuperAdmin();
    const result = await disableAdminAccount({
      targetUserId: userId,
      actor: { id: session.user.id, role: session.user.role },
      ip: await actorIp(),
    });
    if ("error" in result) return fail(result.error);
    revalidatePath("/admin/settings/staff");
    return ok({ ok: true });
  } catch {
    return fail("Forbidden or action failed");
  }
}

export async function enableAdminAction(userId: string): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireSuperAdmin();
    const result = await enableAdminAccount({
      targetUserId: userId,
      actor: { id: session.user.id, role: session.user.role },
      ip: await actorIp(),
    });
    if ("error" in result) return fail(result.error);
    revalidatePath("/admin/settings/staff");
    return ok({ ok: true });
  } catch {
    return fail("Forbidden or action failed");
  }
}

export async function forceAdminPasswordAction(
  userId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireSuperAdmin();
    const result = await forceAdminPasswordChange({
      targetUserId: userId,
      actor: { id: session.user.id, role: session.user.role },
      ip: await actorIp(),
    });
    if ("error" in result) return fail(result.error);
    revalidatePath("/admin/settings/staff");
    return ok({ ok: true });
  } catch {
    return fail("Forbidden or action failed");
  }
}

export async function revokeAdminSessionsAction(
  userId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireSuperAdmin();
    const result = await revokeAdminSessions({
      targetUserId: userId,
      actor: { id: session.user.id, role: session.user.role },
      ip: await actorIp(),
    });
    if ("error" in result) return fail(result.error);
    revalidatePath("/admin/settings/staff");
    return ok({ ok: true });
  } catch {
    return fail("Forbidden or action failed");
  }
}
