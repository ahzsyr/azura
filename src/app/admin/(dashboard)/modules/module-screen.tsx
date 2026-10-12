"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ToggleField } from "@/components/admin/settings-fields";
import { setSiteFeatureEnabled } from "@/modules/module-screen-actions";
import { exportInstalledPackage, importInstalledPackage } from "@/platform/packages/actions";
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
          <p className="text-xs text-muted-foreground">
            {row.packageKind} · Version {row.version} · {row.status}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {row.included ? "Included" : "Not in this deployment"}
        </p>
      </div>
      <FeatureToggle
        kind="module"
        id={row.id}
        label="Enabled for this installation"
        description={
          row.included
            ? row.requiredPresets.length > 0
              ? `Enabling ${row.label} also enables ${row.requiredPresets.map((preset) => preset.label).join(", ")}.`
              : row.id
            : "This module is not included in the deployment profile."
        }
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
          <p className="text-xs text-muted-foreground">
            Turning a required preset off also turns off this app.
          </p>
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
      <PackageTransfer packageId={row.id} />
    </article>
  );
}

function PackageTransfer({ packageId }: { packageId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onExport() {
    setPending(true);
    setError(null);
    const result = await exportInstalledPackage(packageId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const bytes = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
        disabled={pending}
        onClick={() => void onExport()}
      >
        Export ZIP
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function PackageImport() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await importInstalledPackage(new FormData(form));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(
      result.status === "pending"
        ? `${result.packageId} was stored and will activate after its code is deployed.`
        : `${result.packageId} was imported.`,
    );
    form.reset();
    router.refresh();
  }

  return (
    <form className="space-y-2 rounded-lg border p-4" onSubmit={onSubmit}>
      <h2 className="text-base font-semibold">Import package</h2>
      <p className="text-sm text-muted-foreground">
        Upload an app, extension, or theme ZIP. Packages already in this build can be installed. Others stay pending until a deploy includes their code.
      </p>
      <input name="package" type="file" accept=".zip,application/zip" required className="text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        Import ZIP
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
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
      <PackageImport />
      {model.modules.map((row) => (
        <ModuleCard key={row.id} row={row} />
      ))}
    </div>
  );
}
