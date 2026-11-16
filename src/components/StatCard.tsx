import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: number | string;
  color?: "green" | "red" | "amber" | "indigo" | "sky";
  icon?: LucideIcon;
  hint?: string;
};

const ICON_BG: Record<NonNullable<StatCardProps["color"]>, string> = {
  green: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100",
  red: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-100",
  amber: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100",
  indigo: "bg-green-50 text-green-600 ring-1 ring-inset ring-green-100",
  sky: "bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100",
};

export default function StatCard({
  title,
  value,
  color,
  icon: Icon,
  hint,
}: StatCardProps) {
  return (
    <div className="group flex items-center gap-3.5 rounded-xl border border-slate-200/70 bg-white p-6 transition-colors hover:border-slate-300">
      {Icon && (
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            color
              ? ICON_BG[color]
              : "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-100"
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <p className="mt-1 text-2xl font-semibold leading-none tracking-tight text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
