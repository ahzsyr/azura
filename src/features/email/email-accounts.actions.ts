"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { ok, fail, type ActionResult } from "@/types/api";
import type {
  EmailAccountPublic,
  UpsertEmailAccountInput,
} from "@/features/email/email-accounts.types";

export async function listEmailAccountsAction(): Promise<
  ActionResult<{ accounts: EmailAccountPublic[] }>
> {
  await requireAdmin();
  try {
    const { listEmailAccounts } = await import("@/features/email/email-accounts.service");
    const accounts = await listEmailAccounts();
    return ok({ accounts });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to list email accounts");
  }
}

export async function upsertEmailAccountAction(
  input: UpsertEmailAccountInput,
): Promise<ActionResult<{ account: EmailAccountPublic }>> {
  await requireAdmin();
  try {
    const { upsertEmailAccount } = await import("@/features/email/email-accounts.service");
    const account = await upsertEmailAccount(input);
    revalidatePath("/admin/settings/email-accounts");
    return ok({ account });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save email account");
  }
}

export async function deleteEmailAccountAction(
  id: string,
): Promise<ActionResult<{ referencingFormCount: number }>> {
  await requireAdmin();
  try {
    const { deleteEmailAccount } = await import("@/features/email/email-accounts.service");
    const result = await deleteEmailAccount(id);
    revalidatePath("/admin/settings/email-accounts");
    return ok(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete email account");
  }
}

export async function countFormsReferencingEmailAccountAction(
  id: string,
): Promise<ActionResult<{ count: number }>> {
  await requireAdmin();
  try {
    const { countFormsReferencingAccount } = await import(
      "@/features/email/email-accounts.service"
    );
    const count = await countFormsReferencingAccount(id);
    return ok({ count });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to check form references");
  }
}

export async function sendEmailAccountTestAction(input: {
  accountId: string;
  to: string;
}): Promise<ActionResult<{ sent: boolean }>> {
  await requireAdmin();
  try {
    const to = input.to.trim();
    if (!to.includes("@")) return fail("Enter a valid test recipient email.");
    const { resolveEmailProviderConfig } = await import(
      "@/features/email/email-accounts.service"
    );
    const { sendEmail } = await import("@/features/email/email.service");
    const providerConfig = await resolveEmailProviderConfig(input.accountId);
    if (!providerConfig) {
      return fail("Account is missing credentials or was not found.");
    }
    const result = await sendEmail({
      to,
      subject: "Test email account",
      html: `<p>This is a test from your <strong>${providerConfig.provider}</strong> email account.</p><p>From: ${providerConfig.from}</p>`,
      text: `Test from ${providerConfig.provider} account (${providerConfig.from}).`,
      providerConfig,
    });
    if (!result.sent) {
      return fail(result.errorMessage ?? "Email delivery failed.");
    }
    return ok({ sent: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to send test email");
  }
}
