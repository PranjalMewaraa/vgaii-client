"use client";

import { stopImpersonation, useImpersonating } from "@/lib/impersonation";
import { useStoredUser } from "@/lib/client-auth";

type StoredUserWithClient = {
  name?: string;
  email?: string;
  role?: string;
  clientName?: string;
};

export default function ImpersonationBanner() {
  const active = useImpersonating();
  const user = useStoredUser() as StoredUserWithClient | null;

  if (!active) return null;

  const stop = () => {
    if (stopImpersonation()) {
      window.location.href = "/admin/clients";
    }
  };

  const name =
    user?.name ||
    user?.email ||
    (user?.role ? user.role.toLowerCase() : "user");
  const detail = user?.clientName ? ` · ${user.clientName}` : "";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-900 md:px-8">
      <span>
        You are impersonating <span className="font-semibold">{name}</span>
        {detail}.
      </span>
      <button
        type="button"
        onClick={stop}
        className="rounded-md bg-amber-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
      >
        Stop impersonating
      </button>
    </div>
  );
}
