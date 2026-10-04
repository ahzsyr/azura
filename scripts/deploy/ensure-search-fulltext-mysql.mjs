/**
 * Ensure MySQL FULLTEXT on SearchDocument for database-scale global search.
 *
 * Prisma migrate history can drop this index (e.g. 20260601133653_azura_migration)
 * and Prisma schema cannot declare FULLTEXT. Blank imports and update-existing SQL
 * recreate it; this patch is the deploy-time safety net for Hostinger / migrate lag.
 *
 * Idempotent — safe to re-run on every start.
 *
 * Index: SearchDocument_fulltext_idx ON SearchDocument(title, body)
 * Matches src/repositories/search.repository.ts MATCH(title, body) AGAINST (...).
 */

async function mysqlTableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function mysqlIndexExists(prisma, table, indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    table,
    indexName,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 */
export async function ensureSearchFulltextMysql(prisma) {
  if (!(await mysqlTableExists(prisma, "SearchDocument"))) {
    console.log("[db-migrate] MySQL: SearchDocument missing — skip FULLTEXT ensure");
    return;
  }

  const indexName = "SearchDocument_fulltext_idx";
  if (await mysqlIndexExists(prisma, "SearchDocument", indexName)) {
    console.log(`[db-migrate] MySQL: ${indexName} already exists`);
    return;
  }

  await prisma.$executeRawUnsafe(
    `CREATE FULLTEXT INDEX \`${indexName}\` ON \`SearchDocument\`(\`title\`, \`body\`)`,
  );
  console.log(
    `[db-migrate] MySQL: created FULLTEXT ${indexName} on SearchDocument(title, body)`,
  );
}
