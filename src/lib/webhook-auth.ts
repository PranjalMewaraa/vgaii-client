import Client from "@/models/Client";

export const extractWebhookKey = (req: Request): string | null => {
  const headerKey = req.headers.get("x-webhook-key");
  if (headerKey) return headerKey;
  const url = new URL(req.url);
  return url.searchParams.get("key");
};

export const getClientByWebhookKey = async (req: Request) => {
  const key = extractWebhookKey(req);
  if (!key) return { client: null, key: null, reason: "missing-key" as const };
  const client = await Client.findOne({ webhookKey: key });
  if (!client) return { client: null, key, reason: "invalid-key" as const };
  return { client, key, reason: null };
};
