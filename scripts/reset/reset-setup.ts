#!/usr/bin/env tsx
/**
 * Reset setup wizard state — marks setup incomplete and removes admin users.
 * Visit /setup after running to create a new admin account.
 */
import { resetSetupWizard } from "../../src/features/setup/reset-setup.service";

async function main() {
  await resetSetupWizard();
  console.log("Setup reset complete.");
  console.log("Next: visit /setup on your site (clear azura_setup_complete cookie if needed).");
  console.log("Note: SETUP_COMPLETE env no longer blocks /setup when DB says incomplete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
