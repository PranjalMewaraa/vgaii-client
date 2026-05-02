import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import type { AuthUser } from "@/lib/auth";

const getIp = (req: Request): string | null => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return null;
};

type LogInput = {
  action: string;
  entityType: "Lead" | "Appointment" | "Client" | "User" | "Feedback";
  entityId?: string | null;
  entityLabel?: string;
  summary?: string;
  metadata?: Record<string, unknown> | null;
};

type UserActor = {
  actorType: "user";
  user: AuthUser;
  clientId?: string | null;
};

type WebhookActor = {
  actorType: "webhook";
  source: string;
  clientId: string;
};

type PublicActor = {
  actorType: "public";
  source: string;
  clientId: string;
};

type SystemActor = {
  actorType: "system";
  source: string;
  clientId?: string | null;
};

export type AuditActor = UserActor | WebhookActor | PublicActor | SystemActor;

// Audit logging is best-effort: a failed write must never block the original
// request. Any error is logged to the server console and swallowed.
export async function logAudit(
  req: Request,
  actor: AuditActor,
  input: LogInput,
): Promise<void> {
  try {
    const ip = getIp(req);
    let actorId: string | null = null;
    let actorLabel = "";
    let clientId: string | null = null;

    if (actor.actorType === "user") {
      actorId = actor.user.id ?? null;
      clientId = actor.clientId ?? actor.user.clientId ?? null;
      if (actorId) {
        const u = await User.findById(actorId)
          .select("name email")
          .lean<{ name?: string; email?: string } | null>();
        actorLabel = u?.name || u?.email || `User:${actorId}`;
      } else {
        actorLabel = "Unknown user";
      }
    } else {
      clientId = actor.clientId ?? null;
      actorLabel = `${actor.actorType}:${actor.source}`;
    }

    await AuditLog.create({
      clientId,
      actorType: actor.actorType,
      actorId,
      actorLabel,
      ip,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? "",
      summary: input.summary ?? "",
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to log:", err);
  }
}
