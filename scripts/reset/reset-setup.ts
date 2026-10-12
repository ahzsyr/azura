#!/usr/bin/env tsx
/**
 * Wipe website data and return the site to the setup wizard.
 * CMS, catalog, media, and admin accounts are removed. Visitors see coming soon
 * until /setup is completed again.
 */
import { resetSetupWizard } from "../../src/features/setup/reset-setup.service";

async function main() {
  await resetSetupWizard();
  console.log("Setup reset complete. Website content, catalog, media, and admin accounts were removed.");
  console.log("Next: visit /setup and create a new admin account.");
  console.log("Visitors see the coming soon page until setup is completed again.");
  console.log("If SETUP_COMPLETE=true is set in the environment, remove it or reset will not stay incomplete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
