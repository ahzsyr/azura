import type {
  FormDestinationConfig,
  FormNotificationsConfig,
  FormTemplateDefinition,
} from "@/features/forms/types";

/** Legacy Destinations → Email addresses (read-only fallback; never mutate stored JSON). */
export function extractLegacyDestinationEmails(
  destinations: FormDestinationConfig[] | undefined,
): string[] {
  if (!destinations?.length) return [];
  const emails: string[] = [];
  for (const dest of destinations) {
    if (dest.type === "email" && dest.emails?.length) {
      for (const email of dest.emails) {
        if (email.includes("@") && !emails.includes(email)) emails.push(email);
      }
    }
  }
  return emails;
}

/**
 * Canonical receiver list for form submission notifications.
 * Prefer receiverEmails; fall back to legacy adminEmails, then Destinations email.
 * Does not rewrite stored definitions.
 */
export function resolveReceiverEmails(
  definition: Pick<FormTemplateDefinition, "notifications" | "destinations">,
): string[] {
  const notifications = definition.notifications;
  if (notifications?.receiverEmails?.length) return notifications.receiverEmails;
  if (notifications?.adminEmails?.length) return notifications.adminEmails;
  return extractLegacyDestinationEmails(definition.destinations);
}

export function defaultNotificationsConfig(
  partial?: Partial<FormNotificationsConfig>,
): FormNotificationsConfig {
  return {
    receiverEmails: partial?.receiverEmails ?? [],
    sendToSubmitter: partial?.sendToSubmitter ?? false,
    ...(partial?.adminEmails?.length ? { adminEmails: partial.adminEmails } : {}),
  };
}
