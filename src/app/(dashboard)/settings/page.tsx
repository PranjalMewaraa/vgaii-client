"use client";

import { FormEvent, useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";

type Settings = {
  id?: string;
  name?: string;
  plan?: string;
  subscriptionStatus?: string;
  googlePlaceId?: string;
  calendlySchedulingUrl?: string;
  webhookKey?: string;
};

type Integrations = {
  leadWebhookUrl?: string;
  leadStatusWebhookUrl?: string;
  calendlyWebhookUrl?: string;
  feedbackUrlPattern?: string;
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
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [loading, setLoading] = useState(true);

  const [placeId, setPlaceId] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/me", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.client) {
          setSettings(data.client);
          setIntegrations(data.integrations ?? null);
          setPlaceId(data.client.googlePlaceId ?? "");
          setCalendlyUrl(data.client.calendlySchedulingUrl ?? "");
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
          googlePlaceId: placeId || null,
          calendlySchedulingUrl: calendlyUrl || null,
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
          Configure integrations for {settings.name}.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Integrations
          </h2>
          <p className="text-xs text-slate-500">
            These power the lead funnel and reputation card.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Google Place ID
            </span>
            <input
              value={placeId}
              onChange={e => setPlaceId(e.target.value)}
              placeholder="ChIJ…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used to pull your Google Business listing (rating + review count).
            </p>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Calendly scheduling URL
            </span>
            <input
              type="url"
              value={calendlyUrl}
              onChange={e => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/your-account/your-event"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Embedded on the lead detail page when you click <em>Book
              appointment</em>. Lead status auto-advances once the customer
              books.
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

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Webhook key
          </h2>
          <p className="text-xs text-slate-500">
            Single secret used for the lead-capture webhook, the lead-status
            webhook, and the Calendly webhook. Treat it like a password.
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
            {settings.webhookKey || "(not set)"}
          </div>
          {integrations && (
            <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {integrations.leadWebhookUrl && (
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-slate-500">
                    Lead capture
                  </dt>
                  <dd className="font-mono text-slate-700">
                    POST {integrations.leadWebhookUrl}
                  </dd>
                </div>
              )}
              {integrations.leadStatusWebhookUrl && (
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-slate-500">
                    Lead status update
                  </dt>
                  <dd className="font-mono text-slate-700">
                    PATCH {integrations.leadStatusWebhookUrl}
                  </dd>
                </div>
              )}
              {integrations.calendlyWebhookUrl && (
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-slate-500">
                    Calendly webhook
                  </dt>
                  <dd className="font-mono text-slate-700">
                    POST {integrations.calendlyWebhookUrl}
                  </dd>
                </div>
              )}
              {integrations.feedbackUrlPattern && (
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-slate-500">
                    Customer feedback URL
                  </dt>
                  <dd className="font-mono text-slate-700">
                    {integrations.feedbackUrlPattern}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
