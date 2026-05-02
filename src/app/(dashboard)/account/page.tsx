"use client";

import { FormEvent, useState } from "react";
import { useStoredUser } from "@/lib/client-auth";
import { passwordPolicyDescription } from "@/lib/password-policy";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function AccountPage() {
  const user = useStoredUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Zod errors come back as objects; surface a useful string.
        if (data?.error?.issues?.length) {
          setError(data.error.issues[0]?.message ?? "Validation error");
        } else {
          setError(
            typeof data.error === "string"
              ? data.error
              : "Password change failed",
          );
        }
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500">
          Manage your sign-in details. For role or module access, ask your
          admin.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Profile</h2>
        </div>
        <dl className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <Row label="Name" value={user?.name ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Role" value={user?.role ?? "—"} />
          <Row
            label="Modules"
            value={
              user?.assignedModules?.length
                ? user.assignedModules.join(", ")
                : "—"
            }
          />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Change password
          </h2>
          <p className="text-xs text-slate-500">{passwordPolicyDescription}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <Field
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            required
          />
          <Field
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            required
          />
          <Field
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
          />
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password changed.
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                submitting ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}
