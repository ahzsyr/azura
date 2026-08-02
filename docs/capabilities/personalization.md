# Personalization capability

Owner: `src/capabilities/personalization/`

```ts
import { personalizationCapability } from "@/capabilities/personalization";

const settings = await personalizationCapability.getSettings();
personalizationCapability.applyRecentlyViewedBoost(hits, locale);
```

UI shells remain under `src/components/personalization/` and import capability settings only.
