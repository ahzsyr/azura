import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/** MariaDB driver options for a `mysql://` URL. MySQL 8.4 needs public-key retrieval. */
export function mariaDbPoolConfig(connectionString: string) {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !database) {
    throw new Error("DATABASE_URL must include a host and database name");
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
  };
}

/** Prisma 7 opens MySQL through a driver adapter instead of a schema `url`. */
export function createPrismaClient(url = process.env.DATABASE_URL): PrismaClient {
  const connectionString = url?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  return new PrismaClient({
    adapter: new PrismaMariaDb(mariaDbPoolConfig(connectionString)),
  });
}
