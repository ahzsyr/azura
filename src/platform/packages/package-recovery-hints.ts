/** Map known installer/preflight failures to short recovery guidance (pure). */

export function recoveryHintForPackageError(message: string): string | null {
  const m = message.trim();
  if (/requires .+ to be active/i.test(m)) {
    return "Enable the required packages first, then try again.";
  }
  if (/is required by/i.test(m)) {
    return "Turn those modules off before disabling this one.";
  }
  if (/pending until/i.test(m)) {
    return "Deploy a build that includes this package’s code and registry entry.";
  }
  if (/not included in the deployment profile/i.test(m)) {
    return "Add the Module to the profile YAML, run profile:generate, and redeploy.";
  }
  if (/profile has not been generated/i.test(m)) {
    return "Edit profile YAML → npm run profile:generate → redeploy. Modules Manager cannot generate profiles.";
  }
  if (/checksum mismatch/i.test(m)) {
    return "Ship a new migration filename or reconcile the PackageMigration ledger, then update again.";
  }
  if (/not compatible with AZURA/i.test(m)) {
    return "Upgrade AZURA core or use a package with a compatible azuraCompatibility range.";
  }
  return null;
}
