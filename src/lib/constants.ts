export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "visited",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Allowed manual transitions in the panel UI and on PATCH /api/leads/[id].
// `qualified → appointment_booked` is intentionally NOT here — that hop
// happens as a side effect of booking/linking an appointment (see
// PATCH /api/appointments/[id]), not through this matrix. The public
// feedback flow also bypasses this matrix for legitimate reasons.
//
// "Lost" is preserved as an enum value for backward compatibility with
// existing data, but is intentionally absent from this transition map:
// per product rules, leads can never be marked lost manually. Leads that
// haven't qualified yet (new / contacted) can be retried — `contacted → new`
// resets the lead so the team can take another run at outreach.
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ["contacted"],
  contacted: ["qualified", "new"],
  qualified: [],
  appointment_booked: ["visited"],
  visited: [],
  lost: [],
};

export const canTransition = (from: LeadStatus, to: LeadStatus) =>
  from === to || LEAD_TRANSITIONS[from].includes(to);

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "mixed",
  "pending",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORIES = [
  "electricity",
  "rent",
  "staff_salary",
  "medicines",
  "cleaning",
  "internet",
  "marketing",
  "miscellaneous",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
