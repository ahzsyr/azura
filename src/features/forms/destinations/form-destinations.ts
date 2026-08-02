import "server-only";

import type { FormDestinationConfig } from "@/features/forms/types";

/**
 * Dispatch non-email destinations only.
 * Legacy `type: "email"` destinations are ignored (receiver emails use notifications.receiverEmails).
 */
export async function dispatchFormDestinations(
  destinations: FormDestinationConfig[] | undefined,
  input: {
    templateName: string;
    payload: Record<string, unknown>;
    submissionId: string;
    score: number;
  },
): Promise<void> {
  if (!destinations?.length) return;

  for (const dest of destinations.filter((d) => d.type !== "email")) {
    if (dest.type === "slack" && dest.webhookUrl) {
      await dispatchSlackDestination(dest.webhookUrl, input);
    }
  }
}

async function dispatchSlackDestination(
  webhookUrl: string,
  input: {
    templateName: string;
    payload: Record<string, unknown>;
    submissionId: string;
    score: number;
  },
): Promise<void> {
  const text = [
    `*New form submission: ${input.templateName}*`,
    `Score: ${input.score}`,
    `ID: ${input.submissionId}`,
    "```",
    JSON.stringify(input.payload, null, 2).slice(0, 2000),
    "```",
  ].join("\n");

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("Slack destination failed:", err);
  }
}
