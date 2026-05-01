type SubscriptionCardProps = {
  status?: string;
  renewalDate?: string | Date | null;
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
}: SubscriptionCardProps) {
  const dot = STATUS_DOT[status || ""] ?? "bg-slate-400";
  const text = STATUS_TEXT[status || ""] ?? "text-slate-700";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Subscription
          </p>
          <p className={`text-sm font-semibold capitalize ${text}`}>
            {status || "unknown"}
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
      </div>
    </div>
  );
}
