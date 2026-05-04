import { prisma } from "@/lib/prisma";

// Default retention: 180 days. Old audit entries lose forensic value
// quickly and just slow down the activity feed. Override per-call when
// the cron endpoint wants something different.
const DEFAULT_RETENTION_DAYS = 180;

// Rate-limit lazy invocations so a burst of /api/audit requests doesn't
// hammer the DB with redundant DELETEs. Process-local state — each
// Railway instance keeps its own clock; Prisma `deleteMany` is idempotent
// either way.
let lastPrunedAt = 0;
const LAZY_PRUNE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export type PruneResult = { deleted: number; cutoff: string };

export async function pruneOldAuditEntries(
  retentionDays = DEFAULT_RETENTION_DAYS,
): Promise<PruneResult> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deleted: result.count, cutoff: cutoff.toISOString() };
}

// Best-effort: never block the caller. If pruning fails (e.g. DB blip),
// log and move on. The next eligible call will retry.
export async function maybeLazyPrune(): Promise<void> {
  const now = Date.now();
  if (now - lastPrunedAt < LAZY_PRUNE_INTERVAL_MS) return;
  lastPrunedAt = now;
  try {
    await pruneOldAuditEntries();
  } catch (err) {
    console.error("[audit-prune] lazy prune failed:", err);
  }
}
