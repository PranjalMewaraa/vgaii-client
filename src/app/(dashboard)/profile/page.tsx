"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useStoredUser } from "@/lib/client-auth";
import type { Profile } from "@/lib/validators/profile";

const EMPTY: Profile = {
  enabled: false,
  doctorName: "",
  specialty: "",
  credentials: "",
  heroTitleLine1: "",
  heroTitleLine2: "",
  heroTagline: "",
  heroImageUrl: "",
  aboutImageUrl: "",
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

export default function ProfilePage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <ProfilePageInner />
    </RoleGuard>
  );
}

function ProfilePageInner() {
  const user = useStoredUser();
  const clientId = user?.clientId ?? "";

  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/profile", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.profile) setProfile({ ...EMPTY, ...data.profile });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile(p => ({ ...p, [key]: value }));

  const setAchievement = (i: number, value: string) =>
    setProfile(p => {
      const next = [...p.achievements];
      next[i] = value;
      return { ...p, achievements: next };
    });
  const addAchievement = () =>
    setProfile(p =>
      p.achievements.length >= 10
        ? p
        : { ...p, achievements: [...p.achievements, ""] },
    );
  const removeAchievement = (i: number) =>
    setProfile(p => ({
      ...p,
      achievements: p.achievements.filter((_, idx) => idx !== i),
    }));

  const setService = (
    i: number,
    field: "title" | "description",
    value: string,
  ) =>
    setProfile(p => {
      const next = p.services.map((s, idx) =>
        idx === i ? { ...s, [field]: value } : s,
      );
      return { ...p, services: next };
    });
  const addService = () =>
    setProfile(p =>
      p.services.length >= 8
        ? p
        : { ...p, services: [...p.services, { title: "", description: "" }] },
    );
  const removeService = (i: number) =>
    setProfile(p => ({
      ...p,
      services: p.services.filter((_, idx) => idx !== i),
    }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setProfile({ ...EMPTY, ...data.profile });
      setSavedAt(Date.now());
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const previewHref = useMemo(
    () => (clientId ? `/p/${clientId}` : null),
    [clientId],
  );

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500">
            Edit your public landing page. Toggle <em>Enabled</em> to publish.
          </p>
        </div>
        <div className="flex gap-2">
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
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      )}

      {/* General */}
      <Section
        title="General"
        description="Identity shown across the page (nav, hero, footer)."
      >
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={profile.enabled}
            onChange={e => set("enabled", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Enabled — publish this profile at the public URL.</span>
        </label>

        <Grid>
          <Field label="Doctor name" value={profile.doctorName} onChange={v => set("doctorName", v)} placeholder="Dr. Jane Doe" />
          <Field label="Specialty" value={profile.specialty} onChange={v => set("specialty", v)} placeholder="Cardiology" />
          <Field label="Credentials" value={profile.credentials} onChange={v => set("credentials", v)} placeholder="MD, FACC" />
        </Grid>
      </Section>

      {/* Hero */}
      <Section title="Hero" description="Top-of-page banner.">
        <Grid>
          <Field label="Headline (line 1)" value={profile.heroTitleLine1} onChange={v => set("heroTitleLine1", v)} placeholder="Compassionate care" />
          <Field label="Headline (line 2)" value={profile.heroTitleLine2} onChange={v => set("heroTitleLine2", v)} placeholder="for your heart." />
        </Grid>
        <Field label="Hero image URL" value={profile.heroImageUrl} onChange={v => set("heroImageUrl", v)} placeholder="https://…/photo.jpg" />
        <Textarea
          label="Tagline"
          value={profile.heroTagline}
          onChange={v => set("heroTagline", v)}
          rows={3}
          placeholder="Short 1–2 sentence pitch."
        />
      </Section>

      {/* About */}
      <Section title="About" description="Bio + achievements.">
        <Field label="About image URL" value={profile.aboutImageUrl} onChange={v => set("aboutImageUrl", v)} placeholder="https://…/portrait.jpg" />
        <Textarea
          label="Bio"
          value={profile.aboutBio}
          onChange={v => set("aboutBio", v)}
          rows={5}
          placeholder="A few sentences about your background and approach."
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Achievements (up to 10)
          </p>
          <div className="mt-2 space-y-2">
            {profile.achievements.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={a}
                  onChange={e => setAchievement(i, e.target.value)}
                  placeholder="Board Certified in Cardiovascular Disease"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => removeAchievement(i)}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
            {profile.achievements.length < 10 && (
              <button
                type="button"
                onClick={addAchievement}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                + Add achievement
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Services */}
      <Section title="Services" description="The Specialties section.">
        <Grid>
          <Field label="Section title" value={profile.servicesTitle} onChange={v => set("servicesTitle", v)} placeholder="Comprehensive Cardiac Care" />
        </Grid>
        <Textarea label="Section subtitle" value={profile.servicesSubtitle} onChange={v => set("servicesSubtitle", v)} rows={2} placeholder="Short paragraph under the title." />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Services (up to 8)
          </p>
          <div className="mt-2 space-y-3">
            {profile.services.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      value={s.title}
                      onChange={e => setService(i, "title", e.target.value)}
                      placeholder="Service title"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <textarea
                      value={s.description}
                      onChange={e =>
                        setService(i, "description", e.target.value)
                      }
                      placeholder="Service description"
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {profile.services.length < 8 && (
              <button
                type="button"
                onClick={addService}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                + Add service
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact" description="Footer + contact section details.">
        <Textarea
          label="Address"
          value={profile.address}
          onChange={v => set("address", v)}
          rows={2}
          placeholder={"123 Medical Center Drive, Suite 400\nHealthcare City, HC 12345"}
        />
        <Grid>
          <Field label="Phone" value={profile.phone} onChange={v => set("phone", v)} placeholder="(555) 123-4567" />
          <Field label="Hours" value={profile.hours} onChange={v => set("hours", v)} placeholder="Mon - Fri: 8:00 AM - 5:00 PM" />
        </Grid>
      </Section>

      <div className="flex justify-end gap-2">
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
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="space-y-4 px-6 py-5">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}
