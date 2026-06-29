"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  MapPin,
  Plug,
  Plus,
  ShieldCheck,
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import PlaceFinderModal from "@/components/PlaceFinderModal";

type Plan = "basic" | "pro";
type SubStatus = "active" | "trial" | "expired";

type FormState = {
  name: string;
  plan: Plan;
  subscriptionStatus: SubStatus;
  renewalDate: string;
  subscriptionKey: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  googlePlaceId: string;
  bookingUrl: string;
};

type SetFn = <K extends keyof FormState>(k: K, v: FormState[K]) => void;

const INITIAL: FormState = {
  name: "",
  plan: "basic",
  subscriptionStatus: "trial",
  renewalDate: "",
  subscriptionKey: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  googlePlaceId: "",
  bookingUrl: "",
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

/* ─── Step indicator ────────────────────────────────────────────────────────── */
const STEP_LABELS = ["Clinic", "Admin", "Settings", "Review"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="relative flex items-start justify-between px-1">
      <div
        className="absolute top-4 left-0 right-0 h-px bg-slate-200"
        style={{ marginLeft: "1rem", marginRight: "1rem" }}
      />
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = current > num;
        const active = current === num;
        return (
          <div
            key={label}
            className="relative z-10 flex flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                done
                  ? "bg-indigo-600 text-white"
                  : active
                  ? "border-2 border-indigo-600 bg-white text-indigo-600"
                  : "border-2 border-slate-200 bg-white text-slate-400"
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} /> : num}
            </span>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                active
                  ? "text-indigo-600"
                  : done
                  ? "text-slate-600"
                  : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Shared micro-components ───────────────────────────────────────────────── */
function Field({
  label,
  hint,
  className,
  ...props
}: {
  label: string;
  hint?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      {hint && (
        <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
      )}
    </label>
  );
}

function RadioCard<T extends string>({
  value,
  selected,
  onChange,
  label,
  description,
}: {
  value: T;
  selected: T;
  onChange: (v: T) => void;
  label: string;
  description?: string;
}) {
  const active = value === selected;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
        active
          ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          active ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
        }`}
      >
        {active && (
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        )}
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-900">
          {label}
        </span>
        {description && (
          <span className="block text-[11px] text-slate-500">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ─── Review helpers ────────────────────────────────────────────────────────── */
function ReviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-50 text-indigo-600">
          <Icon size={13} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
      </div>
      <dl className="divide-y divide-slate-100 px-4">{children}</dl>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      {badge ?? (
        <dd className="text-right text-sm font-medium text-slate-800">
          {value || "—"}
        </dd>
      )}
    </div>
  );
}

/* ─── Step 1: Clinic Details ────────────────────────────────────────────────── */
function StepClinic({ form, set }: { form: FormState; set: SetFn }) {
  return (
    <div className="space-y-6">
      <Field
        label="Clinic name *"
        value={form.name}
        onChange={e => set("name", e.target.value)}
        placeholder="Aarogya Dental Studio"
        minLength={2}
        required
        hint="The name shown on the platform and in notifications."
      />

      <div>
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-slate-500">
          Plan
        </p>
        <div className="grid grid-cols-2 gap-3">
          <RadioCard
            value="basic"
            selected={form.plan}
            onChange={v => set("plan", v)}
            label="Basic"
            description="Core CRM — leads, appointments, payments"
          />
          <RadioCard
            value="pro"
            selected={form.plan}
            onChange={v => set("plan", v)}
            label="Pro"
            description="Includes advanced analytics & integrations"
          />
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-slate-500">
          Subscription status
        </p>
        <div className="grid grid-cols-3 gap-3">
          <RadioCard
            value="trial"
            selected={form.subscriptionStatus}
            onChange={v => set("subscriptionStatus", v)}
            label="Trial"
          />
          <RadioCard
            value="active"
            selected={form.subscriptionStatus}
            onChange={v => set("subscriptionStatus", v)}
            label="Active"
          />
          <RadioCard
            value="expired"
            selected={form.subscriptionStatus}
            onChange={v => set("subscriptionStatus", v)}
            label="Expired"
          />
        </div>
      </div>

      <Field
        label="Renewal date"
        type="date"
        value={form.renewalDate}
        onChange={e => set("renewalDate", e.target.value)}
        hint="When the clinic's current subscription period ends."
      />
    </div>
  );
}

/* ─── Step 2: Admin Account ─────────────────────────────────────────────────── */
function StepAdmin({
  form,
  set,
  showPassword,
  setShowPassword,
}: {
  form: FormState;
  set: SetFn;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Heads up:</strong> Set a temporary password and share it securely
        with the clinic admin. They can update it after first login.
      </div>

      <Field
        label="Admin full name *"
        value={form.adminName}
        onChange={e => set("adminName", e.target.value)}
        placeholder="Dr. Ananya Verma"
        minLength={2}
        required
      />

      <Field
        label="Admin email *"
        type="email"
        value={form.adminEmail}
        onChange={e => set("adminEmail", e.target.value)}
        placeholder="admin@aarogyadental.com"
        required
      />

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Temporary password *
        </span>
        <div className="relative mt-1">
          <input
            type={showPassword ? "text" : "password"}
            value={form.adminPassword}
            onChange={e => set("adminPassword", e.target.value)}
            minLength={8}
            placeholder="At least 8 characters"
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Minimum 8 characters.
        </p>
      </label>
    </div>
  );
}

/* ─── Step 3: Integrations & Settings ──────────────────────────────────────── */
function StepSettings({
  form,
  set,
  onOpenPlacePicker,
}: {
  form: FormState;
  set: SetFn;
  onOpenPlacePicker: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        All fields are optional — skip and configure later from the clients
        list.
      </p>

      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Google Place ID
        </span>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={form.googlePlaceId}
            onChange={e => set("googlePlaceId", e.target.value)}
            placeholder="ChIJ…"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={onOpenPlacePicker}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <MapPin size={14} />
            Find
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Pulls Google Business reviews and info for the clinic.
        </p>
      </div>

      <Field
        label="Cal.com booking URL"
        type="url"
        value={form.bookingUrl}
        onChange={e => set("bookingUrl", e.target.value)}
        placeholder="https://cal.com/account/event"
        hint="Embedded in the patient booking modal when self-hosted booking is off."
      />

      <Field
        label="Subscription key"
        value={form.subscriptionKey}
        onChange={e => set("subscriptionKey", e.target.value)}
        placeholder="External subscription token"
        hint="Used server-side to verify subscription status with an external service."
      />
    </div>
  );
}

/* ─── Step 4: Review & Create ───────────────────────────────────────────────── */
const STATUS_BADGE: Record<SubStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};
const PLAN_BADGE: Record<Plan, string> = {
  basic: "bg-slate-100 text-slate-700",
  pro: "bg-indigo-100 text-indigo-700",
};

function StepReview({ form, error }: { form: FormState; error: string | null }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Review everything before creating the clinic.
      </p>

      <ReviewSection title="Clinic details" icon={Building2}>
        <ReviewRow label="Name" value={form.name} />
        <ReviewRow
          label="Plan"
          badge={
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PLAN_BADGE[form.plan]}`}
            >
              {form.plan}
            </span>
          }
        />
        <ReviewRow
          label="Subscription"
          badge={
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[form.subscriptionStatus]}`}
            >
              {form.subscriptionStatus}
            </span>
          }
        />
        {form.renewalDate && (
          <ReviewRow
            label="Renewal date"
            value={new Date(form.renewalDate).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        )}
      </ReviewSection>

      <ReviewSection title="Admin account" icon={ShieldCheck}>
        <ReviewRow label="Name" value={form.adminName} />
        <ReviewRow label="Email" value={form.adminEmail} />
        <ReviewRow label="Password" value="••••••••" />
      </ReviewSection>

      <ReviewSection title="Integrations" icon={Plug}>
        <ReviewRow
          label="Google Place ID"
          value={form.googlePlaceId || "—"}
        />
        <ReviewRow
          label="Booking URL"
          value={form.bookingUrl || "—"}
        />
        <ReviewRow
          label="Subscription key"
          value={form.subscriptionKey ? "Set" : "—"}
        />
      </ReviewSection>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Success screen ────────────────────────────────────────────────────────── */
function SuccessScreen({
  clinicName,
  webhookKey,
  onReset,
}: {
  clinicName: string;
  webhookKey: string;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="rounded-xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check size={28} className="text-emerald-600" />
        </span>
        <h2 className="text-xl font-bold text-slate-900">
          {clinicName} is live!
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Clinic and admin account created successfully.
        </p>

        {webhookKey && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Webhook key
            </p>
            <p className="mb-3 break-all rounded border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800">
              {webhookKey}
            </p>
            <CopyButton value={webhookKey} />
            <p className="mt-2 text-[11px] text-slate-400">
              Share this with the clinic for lead & booking webhooks. It can
              be rotated later from the clients list.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/admin/clients"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
            Go to clients list
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={15} />
            Onboard another clinic
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Wizard ────────────────────────────────────────────────────────────────── */
function OnboardClientWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    name: string;
    webhookKey: string;
  } | null>(null);

  const set: SetFn = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const step1Valid = form.name.trim().length >= 2;
  const step2Valid =
    form.adminName.trim().length >= 2 &&
    emailRegex.test(form.adminEmail) &&
    form.adminPassword.length >= 8;
  const canAdvance =
    step === 1 ? step1Valid : step === 2 ? step2Valid : true;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          plan: form.plan,
          subscriptionStatus: form.subscriptionStatus,
          renewalDate: form.renewalDate || undefined,
          subscriptionKey: form.subscriptionKey.trim() || undefined,
          googlePlaceId: form.googlePlaceId.trim() || undefined,
          bookingUrl: form.bookingUrl.trim() || undefined,
          admin: {
            name: form.adminName.trim(),
            email: form.adminEmail.trim().toLowerCase(),
            password: form.adminPassword,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(
          typeof body.error === "string" ? body.error : "Failed to create clinic",
        );
        return;
      }
      setCreated({
        name: body.client?.name ?? form.name,
        webhookKey: body.client?.webhookKey ?? "",
      });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <SuccessScreen
        clinicName={created.name}
        webhookKey={created.webhookKey}
        onReset={() => {
          setCreated(null);
          setForm(INITIAL);
          setStep(1);
          setError(null);
          setShowPassword(false);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 size={18} />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Onboard new clinic
              </h1>
              <p className="text-xs text-slate-500">
                Step {step} of 4 — {STEP_LABELS[step - 1]}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <StepIndicator current={step} />
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {step === 1 && <StepClinic form={form} set={set} />}
          {step === 2 && (
            <StepAdmin
              form={form}
              set={set}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
          )}
          {step === 3 && (
            <StepSettings
              form={form}
              set={set}
              onOpenPlacePicker={() => setPlaceOpen(true)}
            />
          )}
          {step === 4 && <StepReview form={form} error={error} />}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <div className="flex items-center gap-3">
            {step < 4 && (
              <span className="text-xs text-slate-400">
                {step < 3
                  ? `${4 - step} step${4 - step !== 1 ? "s" : ""} remaining`
                  : "Last optional step"}
              </span>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Next
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? (
                  "Creating…"
                ) : (
                  <>
                    Create clinic
                    <Check size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Place finder modal — rendered at wizard root so it overlays correctly */}
      <PlaceFinderModal
        open={placeOpen}
        onClose={() => setPlaceOpen(false)}
        onPick={place => {
          set("googlePlaceId", place.id);
          setPlaceOpen(false);
        }}
      />
    </div>
  );
}

/* ─── Page export ───────────────────────────────────────────────────────────── */
export default function OnboardClientPage() {
  return (
    <RoleGuard allow={["SUPER_ADMIN"]}>
      <OnboardClientWizard />
    </RoleGuard>
  );
}
