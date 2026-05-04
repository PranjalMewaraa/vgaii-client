import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: number | string;
  color?: "green" | "red" | "amber" | "indigo";
  icon?: LucideIcon;
  hint?: string;
};

const VALUE_COLOR: Record<NonNullable<StatCardProps["color"]>, string> = {
  green: "text-emerald-600",
  red: "text-red-600",
  amber: "text-amber-600",
  indigo: "text-indigo-600",
};

const ICON_BG: Record<NonNullable<StatCardProps["color"]>, string> = {
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

export default function StatCard({
  title,
  value,
  color,
  icon: Icon,
  hint,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        {Icon && (
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
              color ? ICON_BG[color] : "bg-slate-100 text-slate-500"
            }`}
          >
            <Icon size={14} />
          </span>
        )}
      </div>
      <p
        className={`mt-1 text-3xl font-bold ${
          color ? VALUE_COLOR[color] : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
