// Single source of truth for the onboarding tour step list. Targets are
// `[data-tour="..."]` attributes — Tailwind classes are too unstable
// to use as selectors. If a target is missing the runner skips the step
// gracefully via Joyride's error:target_not_found event.
//
// `route` is where the user must be for the step to render. `routeQuery`
// is appended on cross-route hops. Placeholders like `{leadId}` are
// resolved by TourController via src/components/tour/demo-ids.ts.

import type { Step } from "react-joyride";

export type TourStep = Step & {
  route: string;
  routeQuery?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    route: "/dashboard",
    target: '[data-tour="dashboard-overview"]',
    title: "Your daily snapshot",
    content:
      "The Overview tile pulls today's leads + upcoming appointments straight from your live data.",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    route: "/dashboard",
    target: '[data-tour="quick-actions"]',
    title: "Jump to the common tasks",
    content:
      "Quick actions cover the four things receptionists do all day — add a lead, a patient, an appointment, or open Reports.",
    placement: "bottom",
  },
  {
    route: "/leads",
    target: '[data-tour="leads-add-btn"]',
    title: "Capture a new lead",
    content:
      "Click here to log a walk-in. We auto-normalize the phone number so duplicate detection works across sources.",
    placement: "left",
  },
  {
    route: "/patients",
    target: '[data-tour="patients-list"]',
    title: "Qualified leads become patients",
    content:
      "Anyone marked qualified moves into Patients. We seeded one demo patient (“Priya Iyer”) so this list isn't empty during the tour.",
    placement: "top",
  },

  // Patient-detail deep dive — uses the seeded qualified lead's
  // deterministic ID. TourController replaces {leadId} before pushing.
  {
    route: "/patients/{leadId}",
    target: '[data-tour="patient-header"]',
    title: "Patient at a glance",
    content:
      "Header carries the patient's identity, status pills, and the two primary actions (record a payment, schedule an appointment).",
    placement: "bottom",
  },
  {
    // Land directly on Medical History so the next step (vitals-trend)
    // doesn't have to swap tabs mid-spotlight — that flicker felt jarring.
    route: "/patients/{leadId}",
    routeQuery: "?tab=medical-history",
    target: '[data-tour="patient-tabs"]',
    title: "Overview · Appointments · History · Payments",
    content:
      "Everything you need for one patient lives behind these tabs. Up next: the medical history.",
    placement: "bottom",
  },
  {
    route: "/patients/{leadId}",
    routeQuery: "?tab=medical-history",
    target: '[data-tour="vitals-trend"]',
    title: "Vitals trend",
    content:
      "Weight, sugar, and BP charted across every completed visit. Demo data shows three visits over three months so the trend is visible.",
    placement: "bottom",
  },
  {
    route: "/patients/{leadId}",
    routeQuery: "?tab=medical-history",
    target: '[data-tour="visit-timeline"]',
    title: "Visit timeline",
    content:
      "Each visit lists diagnosis, medicines, notes, and the vitals captured that day — newest first.",
    placement: "top",
  },

  // Appointments + the Add Appointment modal walk-through.
  {
    route: "/appointments",
    target: '[data-tour="appointments-add-btn"]',
    title: "Book or import appointments",
    content:
      "Manual add works for walk-ins. Cal.com bookings flow in automatically via webhook — you'll see them show up here.",
    placement: "left",
  },
  {
    route: "/appointments",
    routeQuery: "?add=1",
    target: '[data-tour="appt-modal-mode-tabs"]',
    title: "Two ways to add",
    content:
      "Default is Cal.com booking — the patient picks a slot themselves. Manual entry is for walk-ins or back-dated visits.",
    placement: "bottom",
  },
  {
    route: "/appointments",
    routeQuery: "?add=1",
    target: '[data-tour="appt-modal-form"]',
    title: "Phone-first lookup",
    content:
      "Type the phone number first — if it matches an existing patient we auto-link. Otherwise type a name to record a walk-in.",
    placement: "top",
  },

  {
    route: "/finances",
    routeQuery: "?tab=payment",
    target: '[data-tour="payments-tab"]',
    title: "Record patient payments",
    content:
      "Type the patient's phone first — we auto-link existing patients. Walk-ins still flow through if no match.",
    placement: "bottom",
  },
  {
    route: "/reports",
    target: '[data-tour="reports-charts"]',
    title: "Trends across leads, visits, revenue",
    content:
      "Funnel, source attribution, and clinical outcomes. Demo data is excluded so these charts always show your real numbers.",
    placement: "bottom",
  },
  {
    route: "/activity",
    target: '[data-tour="activity-feed"]',
    title: "Every change is audited",
    content:
      "Patient edits, status changes, settings updates — your team's actions, in one searchable feed.",
    placement: "bottom",
  },
  {
    route: "/staff",
    target: '[data-tour="team-invite"]',
    title: "Invite teammates and assign modules",
    content:
      "Give staff access to only the parts of the CRM they need. Permissions are enforced server-side.",
    placement: "left",
  },
  {
    route: "/finances",
    routeQuery: "?tab=presets",
    // Target the section wrapper so it's there even when the tenant
    // already has presets — the empty-state "Add starter charges"
    // button only renders on a fresh tenant.
    target: '[data-tour="presets-section"]',
    title: "Set your default charges",
    content:
      "Preset charges become the one-tap buttons on Payments. If you're starting fresh, the “Add starter charges” button seeds the common ones for you; otherwise use “Add preset” to define your own.",
    placement: "top",
  },
  {
    // Last setup-y stop before the wrap-up: the public landing page.
    // The template picker lives on its own page (/profile/template) so
    // we deep-link straight to it — saves a click and keeps the tour
    // spotlight tight on the three cards.
    route: "/profile/template",
    target: '[data-tour="profile-templates"]',
    title: "Pick a look for your public page",
    content:
      "Your clinic's landing page comes in three styles — Classic, Premium, and Clinical. Tap any card to switch; saves immediately. The Content tab right next to this one is where you'd edit the text/images.",
    placement: "bottom",
  },
  {
    route: "/dashboard",
    target: "body",
    title: "You're all set!",
    content:
      "We'll tidy up the demo data when you finish. You can replay this tour anytime from your Account page.",
    placement: "center",
  },
];
