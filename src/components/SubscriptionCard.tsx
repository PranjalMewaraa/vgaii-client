type SubscriptionCardProps = {
  status?: string;
  renewalDate?: string | Date | null;
  source?: "external" | "local";
  error?: string;
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  trial: "bg-amber-500",
  expired: "bg-red-500",
};

const STATUS_TEXT: Record<string, string> = {
  active: "text-emerald-700",
  trial: "text-amber-700",
  expired: "text-red-700",
};

export default function SubscriptionCard({
  status,
  renewalDate,
  source,
  error,
}: SubscriptionCardProps) {
  const dot = STATUS_DOT[status || ""] ?? "bg-slate-400";
  const text = STATUS_TEXT[status || ""] ?? "text-slate-700";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Subscription
          </p>
        <p className={`text-sm font-semibold capitalize ${text}`}>
          {status || "unknown"}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {error
            ? "External check unavailable"
            : source === "external"
              ? "Checked from subscription API"
              : "Local status"}
        </p>
      </div>
      </div>

      <div className="text-right">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Renewal
        </p>
        <p className="text-sm font-medium text-slate-700">
          {renewalDate ? new Date(renewalDate).toDateString() : "N/A"}
        </p>
        {error && (
          <p className="mt-0.5 max-w-xs truncate text-[11px] text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
