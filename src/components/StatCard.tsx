import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: number | string;
  color?: "green" | "red" | "amber" | "indigo" | "sky";
  icon?: LucideIcon;
  hint?: string;
};

const ICON_BG: Record<NonNullable<StatCardProps["color"]>, string> = {
  green: "bg-emerald-100 text-emerald-600",
  red: "bg-red-100 text-red-600",
  amber: "bg-amber-100 text-amber-600",
  indigo: "bg-indigo-100 text-indigo-600",
  sky: "bg-sky-100 text-sky-600",
};

export default function StatCard({
  title,
  value,
  color,
  icon: Icon,
  hint,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      {Icon && (
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            color ? ICON_BG[color] : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <p className="mt-0.5 text-2xl font-bold leading-tight text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
