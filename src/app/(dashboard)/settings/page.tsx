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
  profileSlug?: string;
  customDomain?: string;
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
          setIntegrations(data.integrations ?? null);
          setPlaceId(data.client.googlePlaceId ?? "");
          setCalendlyUrl(data.client.calendlySchedulingUrl ?? "");
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
          googlePlaceId: placeId || null,
          calendlySchedulingUrl: calendlyUrl || null,
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

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Webhook key &amp; URLs
          </h2>
          <p className="text-xs text-slate-500">
            One secret per client. Every webhook below identifies your client
            by this key — sent either as the{" "}
            <code className="rounded bg-slate-100 px-1">x-webhook-key</code>{" "}
            header (preferred) or as a{" "}
            <code className="rounded bg-slate-100 px-1">?key=…</code> query
            parameter (for tools that don&apos;t allow custom headers, like
            Calendly). Treat it like a password.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <CopyRow
            label="Webhook key"
            value={settings.webhookKey || "(not set)"}
            copyable={!!settings.webhookKey}
          />

          {integrations?.leadWebhookUrl && settings.webhookKey && (
            <WebhookRow
              method="POST"
              label="Lead capture"
              hint="Used by your landing-page backend to create new leads."
              url={integrations.leadWebhookUrl}
              webhookKey={settings.webhookKey}
            />
          )}
          {integrations?.leadStatusWebhookUrl && settings.webhookKey && (
            <WebhookRow
              method="PATCH"
              label="Lead status update"
              hint="Used by external automations to advance a lead through the funnel."
              url={integrations.leadStatusWebhookUrl}
              webhookKey={settings.webhookKey}
            />
          )}
          {integrations?.calendlyWebhookUrl && settings.webhookKey && (
            <WebhookRow
              method="POST"
              label="Calendly webhook"
              hint={
                "In Calendly's webhook settings paste the URL with the ?key=… form — Calendly can't send custom headers."
              }
              url={integrations.calendlyWebhookUrl}
              webhookKey={settings.webhookKey}
              defaultMode="query"
            />
          )}
          {integrations?.feedbackUrlPattern && (
            <CopyRow
              label="Customer feedback URL pattern"
              value={integrations.feedbackUrlPattern}
              copyable={false}
              hint="The token portion is generated per-lead and returned by the lead-capture webhook response."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  copyable = true,
  hint,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="mt-1 flex items-stretch gap-2">
        <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
          {value}
        </code>
        {copyable && <CopyButton value={value} />}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function WebhookRow({
  method,
  label,
  hint,
  url,
  webhookKey,
  defaultMode = "header",
}: {
  method: "POST" | "PATCH";
  label: string;
  hint?: string;
  url: string;
  webhookKey: string;
  defaultMode?: "header" | "query";
}) {
  const [mode, setMode] = useState<"header" | "query">(defaultMode);
  const queryUrl = `${url}?key=${webhookKey}`;
  const display = mode === "query" ? queryUrl : url;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("header")}
            className={`rounded-md px-2 py-1 font-medium uppercase tracking-wider transition ${
              mode === "header"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Header
          </button>
          <button
            type="button"
            onClick={() => setMode("query")}
            className={`rounded-md px-2 py-1 font-medium uppercase tracking-wider transition ${
              mode === "query"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Query
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-stretch gap-2">
        <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700">
          <span className="text-indigo-600">{method}</span> {display}
        </code>
        <CopyButton value={display} />
      </div>

      {mode === "header" && (
        <p className="mt-2 text-xs text-slate-500">
          Send header{" "}
          <code className="rounded bg-slate-100 px-1">
            x-webhook-key: {webhookKey}
          </code>
        </p>
      )}
      {mode === "query" && (
        <p className="mt-2 text-xs text-slate-500">
          The key is in the URL — anyone with this URL can post leads, so
          don&apos;t share it publicly.
        </p>
      )}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
