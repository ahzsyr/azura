import type { PrismaClient } from "@prisma/client";
import { importDemoProfile } from "../src/features/setup/demo-import/demo-import.service";

/** Import Safar Al-Madina Travel Agency demo profile. */
export async function seedSafarWebsite(prisma: PrismaClient) {
  console.log("Importing Safar Al-Madina demo profile…");
  await importDemoProfile(prisma, "demo-safar");
  console.log("Safar Al-Madina demo profile imported.");
}
