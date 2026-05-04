import { prisma } from "@/lib/prisma";

export const extractWebhookKey = (req: Request): string | null => {
  const headerKey = req.headers.get("x-webhook-key");
  if (headerKey) return headerKey;
  const url = new URL(req.url);
  return url.searchParams.get("key");
};

// Returns the Prisma Client row matching the request's webhook key, or
// `null` with a discriminator explaining why. Webhook routes use this to
// authenticate cross-system traffic without going through the JWT path.
export const getClientByWebhookKey = async (req: Request) => {
  const key = extractWebhookKey(req);
  if (!key) return { client: null, key: null, reason: "missing-key" as const };
  const client = await prisma.client.findUnique({ where: { webhookKey: key } });
  if (!client) return { client: null, key, reason: "invalid-key" as const };
  return { client, key, reason: null };
};
