"use client";

import { FormEvent, useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";

type Settings = {
  id?: string;
  name?: string;
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

  const [profileSlug, setProfileSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/me", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.client) {
          setSettings(data.client);
          setProfileSlug(data.client.profileSlug ?? "");
          setCustomDomain(data.client.customDomain ?? "");
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
          profileSlug: profileSlug || null,
          customDomain: customDomain || null,
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
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Settings unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Branding for {settings.name}. Integrations and webhooks are
          managed by the platform team — contact them if you need changes
          to your Google listing or Cal.com link.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Branding</h2>
          <p className="text-xs text-slate-500">
            Where patients land when they search for you online.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Profile slug
            </span>
            <input
              value={profileSlug}
              onChange={e => setProfileSlug(e.target.value)}
              placeholder="aarogya-dental"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Pretty URL for your landing page —{" "}
              <code className="rounded bg-slate-100 px-1">
                /p/{profileSlug || "<slug>"}
              </code>
              . Lowercase letters, digits, and hyphens only.
            </p>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Custom domain
            </span>
            <input
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
              placeholder="aarogyadental.com"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Point your domain&apos;s DNS at our host, then enter the bare
              hostname here (no <code>https://</code>, no path). Visitors of
              that domain will see your landing page directly.
            </p>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
        {error && (
          <p className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Managed by the platform</p>
        <p className="mt-1">
          Google Place ID, Cal.com booking link, and webhook credentials are
          configured by your platform admin. If you need to update your
          Google listing or change your booking link, reach out to support.
        </p>
      </div>
    </div>
  );
}
