# Workflow capability (stub)

Owner: `src/capabilities/workflow/`

Thin status transition facade over `TranslationStatus` — no approval queues yet.

```ts
import { canTransition, transitionEntityTranslation } from "@/capabilities/workflow";

if (canTransition("DRAFT", "REVIEW")) {
  await transitionEntityTranslation(translationId, "REVIEW");
}
```
