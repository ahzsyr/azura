import "server-only";

import { platformEventBus } from "@/platform/schema-ui/events/event-bus";
import { runFormAutomationForEvent } from "@/features/forms/automation/forms-automation";

let registered = false;

export function registerFormsAutomationSubscriber(): void {
  if (registered) return;
  registered = true;

  platformEventBus.on("interaction.submitted", async (event) => {
    try {
      await runFormAutomationForEvent(event);
    } catch (err) {
      console.error("Form automation failed:", err);
    }
  });
}

registerFormsAutomationSubscriber();
