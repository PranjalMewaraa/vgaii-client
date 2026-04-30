type SubscriptionCardProps = {
  status?: string;
  renewalDate?: string | Date | null;
};

export default function SubscriptionCard({
  status,
  renewalDate,
}: SubscriptionCardProps) {
  const isExpired = status === "expired";

  return (
    <div className={`p-4 rounded-xl shadow ${
      isExpired ? "bg-red-100" : "bg-green-100"
    }`}>

      <p>Status: {status}</p>

      <p>
        Renewal:{" "}
        {renewalDate
          ? new Date(renewalDate).toDateString()
          : "N/A"}
      </p>

    </div>
  );
}
