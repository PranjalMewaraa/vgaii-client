type StatusPillProps = {
  status?: string;
};

const STYLES: Record<string, string> = {
  // lead statuses
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-sky-100 text-sky-700",
  qualified: "bg-indigo-100 text-indigo-700",
  appointment_booked: "bg-amber-100 text-amber-700",
  visited: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  // appointment statuses
  scheduled: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  // misc
  direct: "bg-violet-100 text-violet-700",
  open: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

const LABELS: Record<string, string> = {
  appointment_booked: "Appointment booked",
  direct: "Direct appointment",
  no_show: "No show",
};

export default function StatusPill({ status }: StatusPillProps) {
  if (!status) return null;
  const cls = STYLES[status] ?? "bg-slate-100 text-slate-700";
  const label = LABELS[status] ?? status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}
