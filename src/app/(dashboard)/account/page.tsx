"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Sparkles, Trash2 } from "lucide-react";
import { useStoredUser, updateStoredUser } from "@/lib/client-auth";
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
    <div className="space-y-3">
      <header>
        <h1 className="text-lg font-bold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500">
          Manage your sign-in details. For role or module access, ask your
          admin.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-base font-semibold text-slate-900">Profile</h2>
        </div>
        <dl className="grid grid-cols-1 gap-4 px-4 py-3 sm:grid-cols-2">
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

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-base font-semibold text-slate-900">
            Change password
          </h2>
          <p className="text-xs text-slate-500">{passwordPolicyDescription}</p>
        </div>
        <form onSubmit={submit} className="space-y-3 px-4 py-3">
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

      <ChangeEmailSection />

      {user?.role === "CLIENT_ADMIN" && <OnboardingControls />}
    </div>
  );
}

function ChangeEmailSection() {
  const user = useStoredUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error?.issues?.length) {
          setError(data.error.issues[0]?.message ?? "Validation error");
        } else {
          setError(
            typeof data.error === "string" ? data.error : "Email change failed",
          );
        }
        return;
      }
      updateStoredUser({ email: data.email });
      setSuccess(true);
      setCurrentPassword("");
      setNewEmail("");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-base font-semibold text-slate-900">Change email</h2>
        <p className="text-xs text-slate-500">
          Current: <span className="font-medium">{user?.email ?? "—"}</span>.
          You&apos;ll sign in with the new email next time.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3 px-4 py-3">
        <Field
          label="New email"
          type="email"
          value={newEmail}
          onChange={setNewEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          required
        />
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Email updated.
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !newEmail || !currentPassword}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Update email"}
          </button>
        </div>
      </form>
    </section>
  );
}

function OnboardingControls() {
  const router = useRouter();
  const { data, mutate } = useSWR<{
    state: string;
    demoSeeded: boolean;
  }>("/api/onboarding/state", { revalidateOnFocus: false });
  const [busy, setBusy] = useState<"restart" | "clear" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const restart = async () => {
    if (
      !confirm(
        "Restart the tour? We'll re-seed the demo data and walk you through the app again.",
      )
    )
      return;
    setBusy("restart");
    setMsg(null);
    try {
      const res = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setMsg(
          typeof body?.error === "string"
            ? body.error
            : "Couldn't restart the tour",
        );
        return;
      }
      router.push("/dashboard");
      mutate();
    } finally {
      setBusy(null);
    }
  };

  const clearDemo = async () => {
    if (
      !confirm(
        "Delete all demo leads, appointments, and payments? Real data stays untouched.",
      )
    )
      return;
    setBusy("clear");
    setMsg(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
      });
      if (!res.ok) {
        setMsg("Couldn't clear demo data");
        return;
      }
      setMsg("Demo data cleared.");
      mutate();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-base font-semibold text-slate-900">
          Onboarding tour
        </h2>
        <p className="text-xs text-slate-500">
          Replay the welcome tour anytime, or sweep out any demo data left
          behind from a tour you didn&apos;t finish.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={restart}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Sparkles size={12} />
          {busy === "restart" ? "Restarting…" : "Restart tour"}
        </button>
        {data?.demoSeeded && (
          <button
            type="button"
            onClick={clearDemo}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 size={12} />
            {busy === "clear" ? "Clearing…" : "Clear demo data"}
          </button>
        )}
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>
    </section>
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
