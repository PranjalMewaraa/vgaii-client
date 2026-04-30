type StatCardProps = {
  title: string;
  value: number | string;
  color?: "green" | "red";
};

export default function StatCard({ title, value, color }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl bg-white/70 backdrop-blur-md shadow">

      <p className="text-sm text-gray-500">{title}</p>

      <p className={`text-2xl font-bold ${
        color === "red"
          ? "text-red-500"
          : color === "green"
          ? "text-green-500"
          : ""
      }`}>
        {value}
      </p>

    </div>
  );
}
