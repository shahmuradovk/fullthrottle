import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// DATABASE_URL everywhere; NETLIFY_DATABASE_URL is what Netlify DB (Neon)
// injects when the database is provisioned from the Netlify dashboard.
const datasourceUrl = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
