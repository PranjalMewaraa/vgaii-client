// Single source of truth for the onboarding tour step list. Targets are
// `[data-tour="..."]` attributes — Tailwind classes are too unstable
// to use as selectors. If a target is missing the controller will skip
// the step gracefully (see TourController.tsx).
//
// `route` is where the user must be for the step to render. `routeQuery`
// is appended on cross-route hops; pages that need a modal open read
// `?tourStep=N` and dispatch to the right state.

import type { Step } from "react-joyride";

export type TourStep = Step & {
  route: string;
  routeQuery?: string;
  // Optional CSS selector to wait for before advancing — useful when
  // the target is rendered after a network round-trip.
  waitFor?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    route: "/dashboard",
    target: '[data-tour="dashboard-overview"]',
    waitFor: '[data-tour="dashboard-overview"]',
    title: "Your daily snapshot",
    content:
      "The Overview tile pulls today's leads + upcoming appointments straight from your live data.",
    placement: "bottom",
    // v3 equivalent of v2's disableBeacon — skip the pulsing beacon UI
    // and show the tooltip immediately.
    skipBeacon: true,
  },
  {
    route: "/dashboard",
    target: '[data-tour="quick-actions"]',
    waitFor: '[data-tour="quick-actions"]',
    title: "Jump to the common tasks",
    content:
      "Quick actions cover the four things receptionists do all day — add a lead, a patient, an appointment, or open Reports.",
    placement: "bottom",
  },
  {
    route: "/leads",
    target: '[data-tour="leads-add-btn"]',
    waitFor: '[data-tour="leads-add-btn"]',
    title: "Capture a new lead",
    content:
      "Click here to log a walk-in. We auto-normalize the phone number so duplicate detection works across sources.",
    placement: "left",
  },
  {
    route: "/patients",
    target: '[data-tour="patients-list"]',
    waitFor: '[data-tour="patients-list"]',
    title: "Qualified leads become patients",
    content:
      "Anyone marked qualified moves into Patients. We seeded one demo patient (“Priya Iyer”) so this list isn't empty during the tour.",
    placement: "top",
  },
  {
    route: "/appointments",
    target: '[data-tour="appointments-add-btn"]',
    waitFor: '[data-tour="appointments-add-btn"]',
    title: "Book or import appointments",
    content:
      "Manual add works for walk-ins. Cal.com bookings flow in automatically via webhook — you'll see them show up here.",
    placement: "left",
  },
  {
    route: "/finances?tab=payment",
    target: '[data-tour="payments-tab"]',
    waitFor: '[data-tour="payments-tab"]',
    title: "Record patient payments",
    content:
      "Type the patient's phone first — we auto-link existing patients. Walk-ins still flow through if no match.",
    placement: "bottom",
  },
  {
    route: "/reports",
    target: '[data-tour="reports-charts"]',
    waitFor: '[data-tour="reports-charts"]',
    title: "Trends across leads, visits, revenue",
    content:
      "Funnel, source attribution, and clinical outcomes. Demo data is excluded so these charts always show your real numbers.",
    placement: "bottom",
  },
  {
    route: "/activity",
    target: '[data-tour="activity-feed"]',
    waitFor: '[data-tour="activity-feed"]',
    title: "Every change is audited",
    content:
      "Patient edits, status changes, settings updates — your team's actions, in one searchable feed.",
    placement: "top",
  },
  {
    route: "/staff",
    target: '[data-tour="team-invite"]',
    waitFor: '[data-tour="team-invite"]',
    title: "Invite teammates and assign modules",
    content:
      "Give staff access to only the parts of the CRM they need. Permissions are enforced server-side.",
    placement: "left",
  },
  {
    route: "/finances",
    routeQuery: "?tab=presets",
    target: '[data-tour="presets-add-starter"]',
    waitFor: '[data-tour="presets-add-starter"]',
    title: "Set your default charges",
    content:
      "Preset charges become the one-tap buttons on Payments. Tap “Add starter charges” to populate the common ones for you.",
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
