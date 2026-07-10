"use client";

import { FormEvent, useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import BookingSettings from "@/components/BookingSettings";

type Settings = {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  plan?: string;
  subscriptionStatus?: string;
  profileSlug?: string;
  customDomain?: string;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function SettingsPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <SettingsPageInner />
    </RoleGuard>
  );
}

function SettingsPageInner() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/me", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.client) {
          setSettings(data.client);
          setName(data.client.name ?? "");
          setEmail(data.client.email ?? "");
          setMobile(data.client.mobile ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/client/settings", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          email: email || null,
          mobile: mobile || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setSettings(s => (s ? { ...s, ...data.client } : data.client));
      setSavedAt(Date.now());
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!settings) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Settings unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Contact details for {settings.name}. Your public URL, integrations,
          and webhooks are managed by the platform team — contact them if you
          need changes to your slug, domain, Google listing, or booking setup.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Business details
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Your clinic name and contact details.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Name
            </span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Aarogya Dental Studio"
              required
              minLength={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hello@aarogyadental.com"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Mobile
            </span>
            <input
              type="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
          <span className="text-xs text-slate-500">
            {error
              ? null
              : savedAt
                ? "Saved"
                : "Changes apply immediately after save."}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
        {error && (
          <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      <BookingSettings />

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600 shadow-sm">
        <p className="text-sm font-semibold tracking-tight text-slate-900">Managed by the platform</p>
        <p className="mt-1">
          Google Place ID and webhook credentials are configured by your
          platform admin. If you need to update your Google listing, reach
          out to support.
        </p>
      </div>
    </div>
  );
}
