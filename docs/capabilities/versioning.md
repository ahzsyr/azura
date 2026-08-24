# Versioning capability

Owner: `src/capabilities/versioning/`

Field-level history for `EntityTranslation` writes:

```ts
import { versioningCapability } from "@/capabilities/versioning";

await versioningCapability.onFieldWrite({ translationId, value, status });
await versioningCapability.listVersions(translationId);
await versioningCapability.restoreVersion(translationId, versionId);
```

`features/translation/translation.service` delegates version snapshots to this capability.
