// Shared list of landing-page templates, used by both
// /profile (informational link) and /profile/template (the picker
// page). Keeping this in one place means a new template only has to
// be registered here and in src/lib/validators/profile.ts.

import type { ProfileTemplate } from "@/lib/validators/profile";

export type TemplateOption = {
  id: ProfileTemplate;
  label: string;
  description: string;
  // Tailwind classes for the three small colour chips on each card.
  swatches: [string, string, string];
  // Tailwind frame class — hints at the template's surface vibe.
  frame: string;
  // Mini preview of hero typography, rendered inside the frame.
  preview: React.ReactNode;
};

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "classic",
    label: "Classic",
    description:
      "High-contrast sky-blue. Bold extra-bold headlines, square-rounded buttons. Trusted, familiar.",
    swatches: ["bg-sky-700", "bg-sky-500", "bg-slate-900"],
    frame: "bg-slate-50 border-slate-200",
    preview: (
      <div className="text-left">
        <p className="text-lg font-extrabold leading-tight text-slate-900">
          Compassionate
          <br />
          <span className="text-sky-700">for your heart.</span>
        </p>
        <div className="mt-2 inline-block rounded-md bg-sky-700 px-3 py-1 text-[10px] font-semibold text-white">
          Book Appointment
        </div>
      </div>
    ),
  },
  {
    id: "premium",
    label: "Premium",
    description:
      "Slate-900 with sky-blue accents. Light hero type, pill buttons, frosted nav. Upscale and minimal.",
    swatches: ["bg-slate-900", "bg-sky-600", "bg-slate-50"],
    frame: "bg-white border-slate-100",
    preview: (
      <div className="text-left">
        <p className="text-lg font-light leading-tight text-slate-900">
          Compassionate
          <br />
          <span className="font-semibold text-sky-600">for your heart.</span>
        </p>
        <div className="mt-2 inline-block rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          Book Appointment
        </div>
      </div>
    ),
  },
  {
    id: "clinical",
    label: "Clinical",
    description:
      "Deep teal with mint accents. Italic hero accent, sharp corners, bordered chips. Calm and authoritative.",
    swatches: ["bg-teal-700", "bg-teal-400", "bg-emerald-950"],
    frame: "bg-teal-50/40 border-teal-100",
    preview: (
      <div className="text-left">
        <p className="text-lg font-extrabold leading-tight text-emerald-950">
          Compassionate{" "}
          <span className="font-normal italic text-teal-700">
            for your heart.
          </span>
        </p>
        <div className="mt-2 inline-block rounded bg-teal-700 px-3 py-1 text-[10px] font-bold text-white">
          Book Appointment
        </div>
      </div>
    ),
  },
];

export const labelFor = (id: ProfileTemplate): string =>
  TEMPLATE_OPTIONS.find(o => o.id === id)?.label ?? id;
