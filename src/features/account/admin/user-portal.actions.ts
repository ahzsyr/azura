"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/features/auth/guards";
import {
  parseAdminSectionGrants,
  type AdminSectionId,
} from "@/features/auth/admin-section-grants";
import { sendEmail, resolveSendProviderConfig } from "@/features/email/email.service";
import { getTrustedClientIp } from "@/lib/client-ip";
import { writeSecurityAuditLog } from "@/lib/security-audit";

export type ContactEmailResult =
  | { success: true }
  | { success: false; error: string; mailto: boolean };

function revalidateUser(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/settings/users");
  revalidatePath(`/admin/settings/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/settings/staff");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function saveAdminSectionGrantsAction(
  userId: string,
  grants: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireSuperAdmin();
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target || target.role !== "ADMIN") {
      return { success: false, error: "Section permissions apply to ADMIN accounts only" };
    }
    const parsed = parseAdminSectionGrants(grants);
    const stored: AdminSectionId[] = parsed ?? [];
    await prisma.user.update({
      where: { id: target.id },
      data: { adminSectionGrants: stored },
    });
    const h = await headers();
    await writeSecurityAuditLog({
      action: "admin.permissions.updated",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip: getTrustedClientIp(new Request("http://local", { headers: h })),
      meta: { targetUserId: target.id, sections: stored },
    });
    revalidateUser(target.id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not save permissions" };
  }
}

export async function sendUserEmailAction(input: {
  userId: string;
  subject: string;
  message: string;
}): Promise<ContactEmailResult> {
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!subject || !message) {
    return { success: false, error: "Subject and message are required", mailto: false };
  }
  if (subject.length > 160 || message.length > 5000) {
    return { success: false, error: "Message is too long", mailto: false };
  }
  try {
    const session = await requireAdmin();
    const target = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, role: true },
    });
    if (!target?.email) return { success: false, error: "User not found", mailto: false };
    const providerConfig = await resolveSendProviderConfig(null);
    if (!providerConfig) {
      return {
        success: false,
        error: "No Email Account is configured. Use the mail link, or add one under Settings → Email Accounts.",
        mailto: true,
      };
    }
    const result = await sendEmail({
      to: target.email,
      subject,
      text: message,
      html: `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
      providerConfig,
    });
    if (!result.sent) {
      return {
        success: false,
        error: result.errorMessage ?? "Email could not be sent",
        mailto: result.errorCode === "not_configured",
      };
    }
    const h = await headers();
    await writeSecurityAuditLog({
      action: "admin.user.contacted",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip: getTrustedClientIp(new Request("http://local", { headers: h })),
      meta: { targetUserId: target.id, channel: "email", subject },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not send email",
      mailto: false,
    };
  }
}

export async function logUserContactAction(input: {
  userId: string;
  channel: "whatsapp" | "phone";
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAdmin();
    const target = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!target) return { success: false, error: "User not found" };
    const h = await headers();
    await writeSecurityAuditLog({
      action: "admin.user.contacted",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip: getTrustedClientIp(new Request("http://local", { headers: h })),
      meta: { targetUserId: target.id, channel: input.channel },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not record contact" };
  }
}
