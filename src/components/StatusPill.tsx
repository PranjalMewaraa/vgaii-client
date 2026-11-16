type StatusPillProps = {
  status?: string;
};

const STYLES: Record<string, string> = {
  // lead statuses
  new: "bg-slate-50 text-slate-600 ring-slate-200",
  contacted: "bg-sky-50 text-sky-700 ring-sky-200",
  qualified: "bg-green-50 text-green-700 ring-green-200",
  appointment_booked: "bg-amber-50 text-amber-700 ring-amber-200",
  visited: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-red-50 text-red-700 ring-red-200",
  // appointment statuses
  scheduled: "bg-sky-50 text-sky-700 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  no_show: "bg-red-50 text-red-700 ring-red-200",
  cancelled: "bg-slate-50 text-slate-500 ring-slate-200",
  // misc
  direct: "bg-violet-50 text-violet-700 ring-violet-200",
  open: "bg-amber-50 text-amber-700 ring-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const LABELS: Record<string, string> = {
  appointment_booked: "Appointment booked",
  direct: "Direct appointment",
  no_show: "No show",
};

export default function StatusPill({ status }: StatusPillProps) {
  if (!status) return null;
  const cls = STYLES[status] ?? "bg-slate-50 text-slate-600 ring-slate-200";
  const label = LABELS[status] ?? status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
}
