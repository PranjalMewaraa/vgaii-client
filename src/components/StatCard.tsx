type StatCardProps = {
  title: string;
  value: number | string;
  color?: "green" | "red";
};

const VALUE_COLOR: Record<NonNullable<StatCardProps["color"]>, string> = {
  green: "text-emerald-600",
  red: "text-red-600",
};

export default function StatCard({ title, value, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p
        className={`mt-1 text-3xl font-bold ${
          color ? VALUE_COLOR[color] : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
