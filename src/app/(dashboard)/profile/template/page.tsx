"use client";

// Standalone template-picker page. Lives at /profile/template so it
// has its own URL (deep-linkable from the tour, bookmarkable, easy to
// share). Saves auto-fire on click: picking a template is a single
// discrete choice, so a "Save" button would just be a second tap for
// no extra value. We fetch the full profile up front because the
// PATCH endpoint upserts the whole JSON object — we send everything
// back with the template field swapped.

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useStoredUser } from "@/lib/client-auth";
import ProfileSubNav from "@/components/profile/ProfileSubNav";
import {
  TEMPLATE_OPTIONS,
  labelFor,
} from "@/components/profile/templateOptions";
import type { Profile, ProfileTemplate } from "@/lib/validators/profile";

const EMPTY: Profile = {
  enabled: false,
  template: "classic",
  doctorName: "",
  specialty: "",
  credentials: "",
  heroTitleLine1: "",
  heroTitleLine2: "",
  heroTagline: "",
  heroImageUrl: "",
  aboutImageUrl: "",
  faviconUrl: "",
  aboutBio: "",
  achievements: [],
  servicesTitle: "",
  servicesSubtitle: "",
  services: [],
  address: "",
  phone: "",
  hours: "",
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function ProfileTemplatePage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <ProfileTemplatePageInner />
    </RoleGuard>
  );
}

function ProfileTemplatePageInner() {
  const user = useStoredUser();
  const clientId = user?.clientId ?? "";

  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<ProfileTemplate | null>(null);
  // Saved-banner trigger — a monotonically increasing tick rather than
  // a timestamp so the React-19 strict-mode purity lint stays happy
  // (Date.now() is "impure" to the rule).
  const [savedTick, setSavedTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/profile", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.profile) setProfile({ ...EMPTY, ...data.profile });
      })
      .finally(() => setLoading(false));
  }, []);

  const pickTemplate = async (id: ProfileTemplate) => {
    if (id === profile.template) return;
    setSavingId(id);
    setError(null);

    // Optimistic: flip the UI now so the click feels instant. If the
    // save fails we roll back to the previous template.
    const previous = profile.template;
    setProfile(p => ({ ...p, template: id }));

    try {
      const res = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ ...profile, template: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfile(p => ({ ...p, template: previous }));
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setProfile({ ...EMPTY, ...data.profile });
      setSavedTick(t => t + 1);
    } catch {
      setProfile(p => ({ ...p, template: previous }));
      setError("Network error");
    } finally {
      setSavingId(null);
    }
  };

  const previewHref = useMemo(
    () => (clientId ? `/p/${clientId}` : null),
    [clientId],
  );

  // Hide the "Saved" banner after a few seconds so it doesn't linger
  // on the screen. The tick increments on every successful save, so a
  // quick second pick re-fires the effect and resets the timer.
  useEffect(() => {
    if (savedTick === 0) return;
    const t = setTimeout(() => setSavedTick(0), 3000);
    return () => clearTimeout(t);
  }, [savedTick]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500">
            Choose the visual style of your public landing page. Your
            content (text, images, services) carries over between styles.
          </p>
        </div>
        {previewHref && (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Preview ↗
          </a>
        )}
      </header>

      <ProfileSubNav />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {savedTick > 0 && !error && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Template switched to <strong>{labelFor(profile.template)}</strong>.
          Open the preview to see it live.
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-base font-semibold text-slate-900">Template</h2>
          <p className="text-xs text-slate-500">
            Tap a card to switch. Saves immediately — no separate Save
            button.
          </p>
        </div>
        <div className="px-4 py-3">
          <div
            data-tour="profile-templates"
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            {TEMPLATE_OPTIONS.map(opt => {
              const isActive = profile.template === opt.id;
              const isSaving = savingId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => pickTemplate(opt.id)}
                  disabled={isSaving}
                  aria-pressed={isActive}
                  className={`group flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition disabled:cursor-wait ${
                    isActive
                      ? "border-indigo-600 ring-2 ring-indigo-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      {opt.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {opt.swatches.map((s, i) => (
                        <span
                          key={i}
                          className={`h-3 w-3 rounded-full border border-white ring-1 ring-slate-200 ${s}`}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </div>
                  <div
                    className={`flex-1 rounded-lg border p-3 ${opt.frame}`}
                  >
                    {opt.preview}
                  </div>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                  <span
                    className={`mt-auto inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${
                      isActive ? "text-indigo-600" : "text-slate-400"
                    }`}
                  >
                    {isSaving
                      ? "Saving…"
                      : isActive
                        ? "✓ Selected"
                        : "Tap to choose"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
