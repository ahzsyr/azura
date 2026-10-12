"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ToggleField } from "@/components/admin/settings-fields";
import { setSiteFeatureEnabled } from "@/modules/module-screen-actions";
import type { ModuleScreenModel, ModuleScreenRow } from "@/modules/module-screen-types";

function FeatureToggle({
  kind,
  id,
  label,
  description,
  committed,
  writable,
}: {
  kind: "module" | "preset";
  id: string;
  label: string;
  description: string;
  committed: boolean;
  writable: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(committed);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setChecked(committed);
  }, [committed]);

  async function onChange(next: boolean) {
    if (!writable || pending) return;
    const previous = checked;
    setChecked(next);
    setError(null);
    setPending(true);
    const result = await setSiteFeatureEnabled(kind, id, next);
    setPending(false);
    if (!result.ok) {
      setChecked(previous);
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <ToggleField
        label={label}
        description={description}
        checked={writable ? checked : committed}
        disabled={!writable || pending}
        onChange={onChange}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ModuleCard({ row }: { row: ModuleScreenRow }) {
  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{row.label}</h2>
          <p className="text-xs text-muted-foreground">Version {row.version}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {row.included ? "Included" : "Not in this deployment"}
        </p>
      </div>
      <FeatureToggle
        kind="module"
        id={row.id}
        label="Enabled for this installation"
        description={row.included ? row.id : "This module is not included in the deployment profile."}
        committed={row.enabled}
        writable={row.writable}
      />
      {row.requiredCapabilities.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Required capabilities</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {row.requiredCapabilities.map((capability) => (
              <li key={capability.id}>
                {capability.label}
                {capability.included ? "" : " — not in this deployment"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {row.requiredPresets.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Required presets</h3>
          {row.requiredPresets.map((preset) => (
            <FeatureToggle
              key={preset.id}
              kind="preset"
              id={preset.id}
              label={preset.label}
              description={preset.included ? "Included preset" : "Not in this deployment"}
              committed={preset.enabled}
              writable={preset.writable}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ModuleScreen({ model }: { model: ModuleScreenModel }) {
  return (
    <div className="space-y-4">
      {model.profileGenerated ? null : (
        <p className="text-sm text-muted-foreground">
          A deployment profile has not been generated. Modules are shown as enabled and cannot be changed.
        </p>
      )}
      {model.modules.map((row) => (
        <ModuleCard key={row.id} row={row} />
      ))}
    </div>
  );
}
