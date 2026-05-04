import { prisma } from "@/lib/prisma";

/**
 * Resolve a public landing-page identifier (cuid id or profileSlug) into a
 * Client. Used by the public profile page and the public lead-capture
 * endpoint so either form of URL works the same way.
 *
 * Migration note: in the Mongoose era this also accepted ObjectId hex via
 * `mongoose.Types.ObjectId.isValid`. Post-migration, the `id` PK is a
 * cuid (string), so we just try id first and fall back to slug.
 */
export const resolveClientByPublicIdentifier = async (identifier: string) => {
  if (!identifier) return null;
  const byId = await prisma.client.findUnique({ where: { id: identifier } });
  if (byId) return byId;
  return prisma.client.findUnique({
    where: { profileSlug: identifier.toLowerCase() },
  });
};

export const resolveClientByCustomDomain = async (host: string) => {
  if (!host) return null;
  return prisma.client.findUnique({
    where: { customDomain: host.toLowerCase() },
  });
};
