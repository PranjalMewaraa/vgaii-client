import type { SubscriptionStatus } from "@/generated/prisma/client";

const DEFAULT_CHECK_URL = "http://127.0.0.1:8000/webhook/check-key";

type Status = "active" | "trial" | "expired";

type SubscriptionCheckResult =
  | {
      ok: true;
      status: Status;
      renewalDate?: Date | null;
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

const STATUS_VALUES = new Set<string>(["active", "trial", "expired"]);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const normalizeStatus = (value: unknown): Status | null => {
  if (typeof value === "boolean") return value ? "active" : "expired";
  if (typeof value !== "string") return null;

  const s = value.trim().toLowerCase();
  if (!s) return null;
  if (
    s === "active" ||
    s === "valid" ||
    s === "paid" ||
    s === "current" ||
    s === "true" ||
    s === "1"
  ) {
    return "active";
  }
  if (s === "trial" || s === "trialing") return "trial";
  if (
    s === "expired" ||
    s === "inactive" ||
    s === "invalid" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "blocked" ||
    s === "failed" ||
    s === "false" ||
    s === "0"
  ) {
    return "expired";
  }

  return null;
};

const findStatus = (value: unknown): Status | null => {
  const direct = normalizeStatus(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const status = findStatus(item);
      if (status) return status;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  const priorityKeys = [
    "subscriptionStatus",
    "subscription_status",
    "status",
    "state",
    "key_status",
    "valid",
    "isValid",
    "is_valid",
    "is_active",
    "active",
  ];

  for (const key of priorityKeys) {
    if (key in value) {
      const status = normalizeStatus(value[key]);
      if (status) return status;
    }
  }

  for (const nested of Object.values(value)) {
    const status = findStatus(nested);
    if (status) return status;
  }

  return null;
};

const findString = (value: unknown, keys: string[]): string | null => {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  for (const nested of Object.values(value)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return null;
};

const findDate = (value: unknown): Date | null => {
  const raw = findString(value, [
    "renewalDate",
    "renewal_date",
    "expiresAt",
    "expires_at",
    "expiryDate",
    "expiry_date",
    "expiry",
    "endDate",
    "end_date",
  ]);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseJsonSafely = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const checkExternalSubscription = async (
  subscriptionKey: string | null | undefined,
): Promise<SubscriptionCheckResult> => {
  const key = subscriptionKey?.trim();
  if (!key) return { ok: false, error: "Subscription key not set" };

  const crmKey = process.env.SUBSCRIPTION_X_CRM_KEY?.trim();
  if (!crmKey) {
    return { ok: false, error: "SUBSCRIPTION_X_CRM_KEY is not configured" };
  }

  const url = process.env.SUBSCRIPTION_CHECK_URL?.trim() || DEFAULT_CHECK_URL;
  const body = new FormData();
  body.append("key", key);

  const res = await fetch(url, {
    method: "POST",
    headers: { "x-crm-key": crmKey },
    body,
    cache: "no-store",
  });

  const payload = await parseJsonSafely(res);
  if (!res.ok) {
    const message =
      findString(payload, ["error", "message", "detail"]) ||
      `Subscription check failed with HTTP ${res.status}`;
    return { ok: false, error: message };
  }

  const status = findStatus(payload);
  if (!status || !STATUS_VALUES.has(status)) {
    return { ok: false, error: "Subscription check returned no status" };
  }

  return {
    ok: true,
    status,
    renewalDate: findDate(payload),
    message: findString(payload, ["message", "status_message"]) ?? undefined,
  };
};

export const toPrismaSubscriptionStatus = (status: Status) =>
  status as SubscriptionStatus;
