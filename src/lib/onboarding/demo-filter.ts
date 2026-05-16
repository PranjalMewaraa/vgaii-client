// Demo-row exclusion helpers used by every aggregation endpoint so the
// onboarding tour's seeded rows never pollute real-tenant metrics
// (Dashboard tiles, Reports funnels, payment trend charts, etc.).
//
// Plain list endpoints (/api/leads, /api/appointments, /api/payments)
// deliberately do NOT apply these — the tour relies on seeing the demo
// rows in those views.
//
// Spread these into the existing `where` rather than nesting:
//   prisma.lead.count({ where: { ...scope, ...excludeDemoLeads } })
// so they compose with `withClientFilter` and other filters already
// being passed in.

export const excludeDemoLeads = {
  source: { not: "demo" },
} as const;

export const excludeDemoAppts = {
  source: { not: "demo" },
} as const;

// Payment has no `source` column — we tag onboarding payments with
// "[demo]" at the start of their notes (see demo-seed.ts). Match on
// contains so the tag survives if the user later adds more text.
export const excludeDemoPayments = {
  NOT: { notes: { contains: "[demo]" } },
} as const;
