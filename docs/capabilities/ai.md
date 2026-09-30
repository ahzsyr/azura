# AI capability

Owner: `src/capabilities/ai/`

Translation AI (batch translate, jobs, memory) lives here. Entity translation storage remains in `features/translation/`.

```ts
import { aiCapability } from "@/capabilities/ai";

await aiCapability.queueTranslationJob(localeCode, entityType);
await aiCapability.processJobs();
await aiCapability.lookupMemory(sourceText, sourceLocale, targetLocale);
```

`generateContent()` is registered as a planned stub.
