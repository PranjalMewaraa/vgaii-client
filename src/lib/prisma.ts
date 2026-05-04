import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 requires either a driver adapter or a Prisma Accelerate URL.
// We're on Railway MySQL, so the MariaDB adapter (it speaks the MySQL
// wire protocol) is the right pick. The connection string lives in
// DATABASE_URL — same one the migrate CLI reads via prisma.config.ts.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy MYSQL_PUBLIC_URL from Railway into .env.",
  );
}

// Reuse a single PrismaClient across HMR reloads in dev. Without this,
// each save in `next dev` would spin up a new connection pool and quickly
// hit Railway's connection cap.
declare global {
  var __prisma: PrismaClient | undefined;
}

// Parse the URL into a config object so we can tune mariadb-driver
// options. Railway's TCP proxy can take 1–3 s to accept a fresh
// connection (especially on free-tier wakeup), and the driver's default
// connectTimeout of 1000 ms is too tight for that.
const parsed = new URL(databaseUrl);
const adapterConfig = {
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, "") || undefined,
  connectionLimit: 10,
  connectTimeout: 15_000,
};

const buildClient = () =>
  new PrismaClient({
    adapter: new PrismaMariaDb(adapterConfig),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

export const prisma = globalThis.__prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
