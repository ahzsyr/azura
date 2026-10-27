import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const t = await p.siteTheme.findUnique({ where: { id: "published" } });
console.log({
  textEffect: t?.textEffect,
  textEffectEnabled: t?.textEffectEnabled,
  animationsEnabled: t?.animationsEnabled,
});
await p.$disconnect();
