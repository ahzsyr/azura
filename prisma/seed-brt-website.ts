import type { PrismaClient } from "@prisma/client";
import { importDemoProfile } from "../src/features/setup/demo-import/demo-import.service";

/** Import BRT TRADING LLC demo profile (pages, blocks, media, sample data). */
export async function seedBrtWebsite(prisma: PrismaClient) {
  console.log("Importing BRT TRADING LLC demo profile…");
  await importDemoProfile(prisma, "demo-brt");
  console.log("BRT demo profile imported.");
}
