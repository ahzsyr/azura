"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ToggleField } from "@/components/admin/settings-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { preflightModuleToggle, setSiteFeatureEnabled } from "@/modules/module-screen-actions";
import {
  applyThemePackage,
  closeExtensionOverlay,
  deactivateThemePackage,
  exportInstalledPackage,
  importInstalledPackage,
  openExtensionOverlay,
  removeInstalledPackage,
  runPackagePreflight,
  uninstallInstalledPackage,
  updateInstalledPackage,
} from "@/platform/packages/actions";
import type { PackagePreflightResult } from "@/platform/packages/package-preflight-core";
import type { ModuleScreenModel, ModuleScreenRow } from "@/modules/module-screen-types";
import {
  applyThemeButtonLabel,
  applyThemeDescription,
  closeOverlayButtonLabel,
  closeOverlayDescription,
  deactivateThemeButtonLabel,
  deactivateThemeDescription,
  formatModuleActionError,
  moduleControlsForState,
  moduleLifecycleLabel,
  moduleLockedReason,
  moduleOverlayBadgeLabel,
  moduleOverlayBadges,
  openOverlayButtonLabel,
  openOverlayDescription,
  resolveModuleLifecycleState,
} from "@/modules/module-screen-ui";
import {
  builtinPackageHint,
  exportZipButtonLabel,
  exportZipDescription,
  importResultMessage,
  importZipDescription,
  importZipHeading,
  packageOriginBadge,
  packageUiOrigin,
  pendingPackageExplanation,
  profileOmittedGuidance,
  profileUngeneratedBanner,
  purgeUnavailableNote,
  removePackageButtonLabel,
  removePackageConfirmBody,
  removePackageConfirmTitle,
  uninstallBuiltinConfirmBody,
  uninstallBuiltinConfirmTitle,
  uninstallButtonLabel,
  uninstallPendingConfirmBody,
  uninstallPendingConfirmTitle,
  updatePackageButtonLabel,
  updatePackageDescription,
} from "@/platform/packages/package-ui-copy";

type PendingMutation =
  | { kind: "toggle"; next: boolean }
  | { kind: "update" }
  | { kind: "applyTheme" }
  | { kind: "openOverlay" };

function PreflightBody({ result }: { result: PackagePreflightResult }) {
  return (
    <div className="space-y-3 text-sm">
      {result.blockers.length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium text-destructive">Blockers</p>
          <ul className="list-disc space-y-1 pl-5 text-destructive">
            {result.blockers.map((issue) => (
              <li key={issue.code + issue.message}>
                {issue.message}
                {issue.recoveryHint ? ` — ${issue.recoveryHint}` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.warnings.length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium">Warnings</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {result.warnings.map((issue) => (
              <li key={issue.code + issue.message}>
                {issue.message}
                {issue.recoveryHint ? ` — ${issue.recoveryHint}` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.profileNotes.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {result.profileNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {result.migrations.pendingUpFilenames.length > 0 ? (
        <p className="text-muted-foreground">
          Pending up SQL: {result.migrations.pendingUpFilenames.join(", ")}
        </p>
      ) : null}
      {result.ok && result.blockers.length === 0 && result.warnings.length === 0 ? (
        <p className="text-muted-foreground">Preflight checks passed. Confirm to continue.</p>
      ) : null}
    </div>
  );
}

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
  const errorId = useId();
  const [checked, setChecked] = useState(committed);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [preflight, setPreflight] = useState<PackagePreflightResult | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);

  async function commitToggle(next: boolean) {
    setPending(true);
    setError(null);
    const previous = checked;
    setChecked(next);
    const result = await setSiteFeatureEnabled(kind, id, next);
    setPending(false);
    if (!result.ok) {
      setChecked(previous);
      setError(formatModuleActionError(result.error));
      return;
    }
    setError(null);
    router.refresh();
  }

  async function onChange(next: boolean) {
    if (!writable || pending) return;
    if (kind !== "module") {
      await commitToggle(next);
      return;
    }
    setPending(true);
    setError(null);
    const result = await preflightModuleToggle(id, next);
    setPending(false);
    setPreflight(result);
    setPendingMutation({ kind: "toggle", next });
  }

  async function onConfirmPreflight() {
    if (!pendingMutation || pendingMutation.kind !== "toggle") return;
    if (preflight && !preflight.ok) return;
    const next = pendingMutation.next;
    setPreflight(null);
    setPendingMutation(null);
    await commitToggle(next);
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
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Dialog
        open={Boolean(preflight)}
        onOpenChange={(open) => {
          if (!open) {
            setPreflight(null);
            setPendingMutation(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm package change</DialogTitle>
            <DialogDescription>
              Review preflight results before {pendingMutation?.kind === "toggle" && pendingMutation.next
                ? "enabling"
                : "disabling"}{" "}
              this Module.
            </DialogDescription>
          </DialogHeader>
          {preflight ? <PreflightBody result={preflight} /> : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPreflight(null);
                setPendingMutation(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={() => void onConfirmPreflight()} disabled={pending || !preflight?.ok}>
              {pending ? "Working…" : preflight?.ok ? "Confirm" : "Blocked"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModuleLifecycleActions({
  row,
  controls,
}: {
  row: ModuleScreenRow;
  controls: ReturnType<typeof moduleControlsForState>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uninstallOpen, setUninstallOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [preflight, setPreflight] = useState<PackagePreflightResult | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);

  const state = resolveModuleLifecycleState(row);
  const isPending = state === "pending";
  const uninstallKind = isPending ? "pending" : row.builtin ? "builtin" : "other";

  async function runPreflight(
    operation: "update" | "applyTheme" | "openExtension",
    mutation: PendingMutation,
  ) {
    setBusy(true);
    setError(null);
    const result = await runPackagePreflight(row.id, operation);
    setBusy(false);
    setPreflight(result);
    setPendingMutation(mutation);
  }

  async function executeMutation(mutation: PendingMutation) {
    setBusy(true);
    setError(null);
    let result: { ok: true } | { ok: false; error: string };
    if (mutation.kind === "update") result = await updateInstalledPackage(row.id);
    else if (mutation.kind === "applyTheme") result = await applyThemePackage(row.id);
    else if (mutation.kind === "openOverlay") result = await openExtensionOverlay(row.id);
    else {
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!result.ok) {
      setError(formatModuleActionError(result.error));
      return;
    }
    router.refresh();
  }

  async function onConfirmPreflight() {
    if (!pendingMutation || !preflight?.ok) return;
    const mutation = pendingMutation;
    setPreflight(null);
    setPendingMutation(null);
    await executeMutation(mutation);
  }

  async function onCloseOverlay() {
    setBusy(true);
    setError(null);
    const result = await closeExtensionOverlay(row.id);
    setBusy(false);
    if (!result.ok) {
      setError(formatModuleActionError(result.error));
      return;
    }
    router.refresh();
  }

  async function onDeactivateTheme() {
    setBusy(true);
    setError(null);
    const result = await deactivateThemePackage(row.id);
    setBusy(false);
    if (!result.ok) {
      setError(formatModuleActionError(result.error));
      return;
    }
    router.refresh();
  }

  async function onConfirmUninstall() {
    setBusy(true);
    setError(null);
    const result = await uninstallInstalledPackage(row.id);
    setBusy(false);
    if (!result.ok) {
      setError(formatModuleActionError(result.error));
      return;
    }
    setUninstallOpen(false);
    router.refresh();
  }

  async function onConfirmRemove() {
    setBusy(true);
    setError(null);
    const result = await removeInstalledPackage(row.id, confirmPhrase);
    setBusy(false);
    if (!result.ok) {
      setError(formatModuleActionError(result.error));
      return;
    }
    setRemoveOpen(false);
    setConfirmPhrase("");
    router.refresh();
  }

  if (
    !controls.update &&
    !controls.uninstall &&
    !controls.remove &&
    !controls.openOverlay &&
    !controls.closeOverlay &&
    !controls.applyTheme &&
    !controls.deactivateTheme
  ) {
    return null;
  }

  return (
    <div className="space-y-2 border-t pt-3">
      {controls.applyTheme ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{applyThemeDescription()}</p>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void runPreflight("applyTheme", { kind: "applyTheme" })}
          >
            {applyThemeButtonLabel()}
          </button>
        </div>
      ) : null}
      {controls.deactivateTheme ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{deactivateThemeDescription()}</p>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void onDeactivateTheme()}
          >
            {deactivateThemeButtonLabel()}
          </button>
        </div>
      ) : null}
      {controls.openOverlay ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{openOverlayDescription()}</p>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void runPreflight("openExtension", { kind: "openOverlay" })}
          >
            {openOverlayButtonLabel()}
          </button>
        </div>
      ) : null}
      {controls.closeOverlay ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{closeOverlayDescription()}</p>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void onCloseOverlay()}
          >
            {closeOverlayButtonLabel()}
          </button>
        </div>
      ) : null}
      {controls.update ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{updatePackageDescription()}</p>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void runPreflight("update", { kind: "update" })}
          >
            {updatePackageButtonLabel()}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {controls.uninstall ? (
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => setUninstallOpen(true)}
          >
            {uninstallButtonLabel(uninstallKind)}
          </button>
        ) : null}
        {controls.remove ? (
          <button
            type="button"
            className="text-sm text-destructive underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setConfirmPhrase("");
              setRemoveOpen(true);
            }}
          >
            {removePackageButtonLabel()}
          </button>
        ) : null}
      </div>

      {controls.remove ? (
        <p className="text-xs text-muted-foreground">{purgeUnavailableNote()}</p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Dialog
        open={Boolean(preflight)}
        onOpenChange={(open) => {
          if (!open) {
            setPreflight(null);
            setPendingMutation(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm package operation</DialogTitle>
            <DialogDescription>
              Review preflight results before continuing. Blockers must be cleared first.
            </DialogDescription>
          </DialogHeader>
          {preflight ? <PreflightBody result={preflight} /> : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPreflight(null);
                setPendingMutation(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={() => void onConfirmPreflight()} disabled={busy || !preflight?.ok}>
              {busy ? "Working…" : preflight?.ok ? "Confirm" : "Blocked"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uninstallOpen} onOpenChange={setUninstallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {row.builtin && !isPending ? uninstallBuiltinConfirmTitle() : uninstallPendingConfirmTitle()}
            </DialogTitle>
            <DialogDescription>
              {row.builtin && !isPending
                ? uninstallBuiltinConfirmBody(row.label)
                : uninstallPendingConfirmBody(row.label)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUninstallOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onConfirmUninstall()} disabled={busy}>
              {busy ? "Working…" : uninstallButtonLabel(uninstallKind)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeOpen}
        onOpenChange={(open) => {
          setRemoveOpen(open);
          if (!open) setConfirmPhrase("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{removePackageConfirmTitle()}</DialogTitle>
            <DialogDescription>{removePackageConfirmBody(row.id)}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{purgeUnavailableNote()}</p>
          <div className="space-y-1.5">
            <Label htmlFor={`remove-confirm-${row.id}`}>Type {row.id} to confirm</Label>
            <Input
              id={`remove-confirm-${row.id}`}
              value={confirmPhrase}
              onChange={(event) => setConfirmPhrase(event.target.value)}
              autoComplete="off"
              placeholder={row.id}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void onConfirmRemove()}
              disabled={busy || confirmPhrase.trim() !== row.id}
            >
              {busy ? "Removing…" : removePackageButtonLabel()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModuleCard({
  row,
  profileGenerated,
}: {
  row: ModuleScreenRow;
  profileGenerated: boolean;
}) {
  const origin = packageUiOrigin({ status: row.status, builtin: row.builtin });
  const state = resolveModuleLifecycleState(row);
  const controls = moduleControlsForState(state, { profileGenerated });
  const statusLabel = moduleLifecycleLabel(state);
  const lockedReason = moduleLockedReason(state, profileGenerated);
  const isPending = state === "pending";
  const overlays = moduleOverlayBadges({
    builtin: row.builtin,
    included: row.included,
    status: row.status,
    compatibilityOk: row.compatibility.ok,
    dependencyBlockers: row.dependencyBlockers,
    pendingMigrationCount: row.migrationSummary.pendingUpFilenames.length,
  });

  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{row.label}</h2>
          <p className="text-xs text-muted-foreground">
            {row.packageKind} · Version {row.version} ·{" "}
            <span aria-label={`Status: ${statusLabel}`}>{statusLabel}</span>
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{packageOriginBadge(origin)}</p>
      </div>

      {overlays.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Package overlays">
          {overlays.map((badge) => (
            <li
              key={badge}
              className="rounded border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {moduleOverlayBadgeLabel(badge)}
            </li>
          ))}
        </ul>
      ) : null}

      {row.dependencyBlockers.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Requires active: {row.dependencyBlockers.join(", ")}
        </p>
      ) : null}
      {row.dependentBlockers.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Required by: {row.dependentBlockers.join(", ")}
        </p>
      ) : null}
      {!row.compatibility.ok && row.compatibility.detail ? (
        <p className="text-sm text-destructive">{row.compatibility.detail}</p>
      ) : null}
      {row.migrationSummary.pendingUpFilenames.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Migrations pending: {row.migrationSummary.pendingUpFilenames.join(", ")}
        </p>
      ) : null}
      {row.lastFailureHint ? (
        <p className="text-sm text-destructive" role="status">
          Last failure: {formatModuleActionError(row.lastFailureHint)}
        </p>
      ) : null}

      {isPending ? (
        <p className="text-sm text-muted-foreground">{pendingPackageExplanation()}</p>
      ) : state === "unavailable" ? (
        <p className="text-sm text-muted-foreground">{lockedReason}</p>
      ) : state.startsWith("extension-overlay") ? (
        <p className="text-sm text-muted-foreground">{lockedReason}</p>
      ) : state === "profile-omitted" ? (
        <p className="text-sm text-muted-foreground">{profileOmittedGuidance(row.label)}</p>
      ) : row.builtin ? (
        <p className="text-xs text-muted-foreground">{builtinPackageHint()}</p>
      ) : null}

      {controls.enableToggle ? (
        <FeatureToggle
          key={`${row.id}-enabled-${row.enabled}`}
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
      ) : lockedReason && state !== "unavailable" && state !== "profile-omitted" && !isPending ? (
        <p className="text-sm text-muted-foreground">{lockedReason}</p>
      ) : null}

      {row.builtin && row.requiredCapabilities.length > 0 ? (
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
      {row.builtin && controls.requiredPresetToggles && row.requiredPresets.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Required presets</h3>
          <p className="text-xs text-muted-foreground">
            Turning a required preset off also turns off this app.
          </p>
          {row.requiredPresets.map((preset) => (
            <FeatureToggle
              key={`${preset.id}-${preset.enabled}`}
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
      {row.settingsHref ? (
        <p className="text-sm">
          <a className="underline underline-offset-2" href={row.settingsHref}>
            Module settings
          </a>
        </p>
      ) : null}
      {controls.exportZip ? <PackageTransfer packageId={row.id} /> : null}
      <ModuleLifecycleActions row={row} controls={controls} />
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
      setError(formatModuleActionError(result.error));
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
      <p className="text-xs text-muted-foreground">{exportZipDescription()}</p>
      <button
        type="button"
        className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
        disabled={pending}
        aria-busy={pending}
        onClick={() => void onExport()}
      >
        {exportZipButtonLabel()}
      </button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
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
      setError(formatModuleActionError(result.error));
      return;
    }
    setMessage(importResultMessage(result.packageId, result.status));
    form.reset();
    router.refresh();
  }

  return (
    <form className="space-y-2 rounded-lg border p-4" onSubmit={onSubmit}>
      <h2 className="text-base font-semibold">{importZipHeading()}</h2>
      <p className="text-sm text-muted-foreground">{importZipDescription()}</p>
      <input
        name="package"
        type="file"
        accept=".zip,application/zip"
        required
        className="text-sm"
        aria-label="Package ZIP file"
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        Import ZIP
      </button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function ModuleScreen({ model }: { model: ModuleScreenModel }) {
  const builtin = model.modules.filter((row) => row.builtin);
  const other = model.modules.filter((row) => !row.builtin);

  return (
    <div className="space-y-4">
      {model.profileGenerated ? null : (
        <p className="text-sm text-muted-foreground" role="status">
          {profileUngeneratedBanner()}
        </p>
      )}
      <PackageImport />
      {builtin.map((row) => (
        <ModuleCard key={row.id} row={row} profileGenerated={model.profileGenerated} />
      ))}
      {other.length > 0 ? (
        <section className="space-y-3" aria-labelledby="pending-packages-heading">
          <h2 id="pending-packages-heading" className="text-sm font-semibold">
            Pending and non-build packages
          </h2>
          <p className="text-sm text-muted-foreground">{pendingPackageExplanation()}</p>
          {other.map((row) => (
            <ModuleCard key={row.id} row={row} profileGenerated={model.profileGenerated} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
