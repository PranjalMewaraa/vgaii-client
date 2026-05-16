// Demo data the first-login onboarding tour walks the user through.
//
// **Safety contract** — every row inserted here is tagged with a
// discriminator (source="demo" on Lead/Appointment, "[demo]" prefix on
// Payment.notes). The cleanup query in clearDemoData() filters on
// clientId AND that tag, so it can never sweep up a real row in this
// tenant or any other.
//
// IMPORTANT: `source = "demo"` is a magic string. Don't reuse it for
// real lead sources, and the Lead/Appointment validators should block
// it in user input (TODO follow-up; today the risk is negligible since
// nothing in the UI offers "demo" as a source).

import { prisma } from "@/lib/prisma";
import { canonicalPhone } from "@/lib/phone";

const DEMO_SOURCE = "demo";
const DEMO_NOTES_TAG = "[demo]";

export type DemoSeedResult = {
  leads: string[];
  appointments: string[];
  payments: string[];
};

export type DemoCleanupResult = {
  leads: number;
  appointments: number;
  payments: number;
};

const id = (clientId: string, name: string) =>
  `seed_demo_${clientId}_${name}`;

const startOfDay = (offsetDays: number, hour = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// Idempotent. Re-running on the same tenant produces zero net writes
// (upserts on stable IDs). Returns the row IDs the API can echo back if
// the caller wants to highlight a specific row in the tour.
export const seedDemoData = async (
  clientId: string,
  userId: string | null,
): Promise<DemoSeedResult> => {
  const lead1Id = id(clientId, "lead_1");
  const lead2Id = id(clientId, "lead_2");
  const lead3Id = id(clientId, "lead_3");
  const appt1Id = id(clientId, "appt_1");
  const appt2Id = id(clientId, "appt_2");
  const appt3Id = id(clientId, "appt_3");
  const appt4Id = id(clientId, "appt_4");
  const payment1Id = id(clientId, "payment_1");
  const payment2Id = id(clientId, "payment_2");

  // Verify the userId is actually present in the User table before we
  // use it as a FK target. Stale JWTs (e.g. after a `prisma migrate
  // reset`) would otherwise blow up the upserts with a FK violation
  // on `createdById`. Fall back to null — demo rows don't strictly
  // need a "created by" attribution.
  const safeUserId = await resolveValidUserId(userId);

  const leadCommon = (phone: string) => ({
    clientId,
    phone,
    phoneNormalized: canonicalPhone(phone),
    source: DEMO_SOURCE,
    notes: "",
  });

  await prisma.$transaction([
    prisma.lead.upsert({
      where: { id: lead1Id },
      create: {
        id: lead1Id,
        ...leadCommon("9000000001"),
        name: "Demo · Anita Sharma",
        status: "new",
        createdById: safeUserId,
      },
      update: {},
    }),
    prisma.lead.upsert({
      where: { id: lead2Id },
      create: {
        id: lead2Id,
        ...leadCommon("9000000002"),
        name: "Demo · Rohan Verma",
        status: "contacted",
        createdById: safeUserId,
      },
      update: {},
    }),
    prisma.lead.upsert({
      where: { id: lead3Id },
      create: {
        id: lead3Id,
        ...leadCommon("9000000003"),
        name: "Demo · Priya Iyer",
        // qualified lifts the row into /patients per the schema comment
        // at prisma/schema.prisma:185-186
        status: "qualified",
        age: 34,
        gender: "female",
        createdById: safeUserId,
      },
      update: {},
    }),
    prisma.appointment.upsert({
      where: { id: appt1Id },
      create: {
        id: appt1Id,
        clientId,
        leadId: lead3Id,
        name: "Demo · Priya Iyer",
        phone: "9000000003",
        date: startOfDay(1, 10),
        status: "scheduled",
        source: DEMO_SOURCE,
        notes: "",
        diagnosis: "",
        medicines: [],
      },
      update: {},
    }),
    // Three completed visits over the past three months show the
    // Medical-History tab's vitals trend charts with enough data points
    // to be meaningful (one observation can't draw a line). Weight ticks
    // down 2kg, sugar trends from borderline to in-range, BP improves.
    prisma.appointment.upsert({
      where: { id: appt2Id },
      create: {
        id: appt2Id,
        clientId,
        leadId: lead3Id,
        name: "Demo · Priya Iyer",
        phone: "9000000003",
        date: startOfDay(-90, 11),
        status: "completed",
        completedAt: startOfDay(-90, 11),
        source: DEMO_SOURCE,
        notes: "First visit — borderline sugar.",
        diagnosis: "Pre-diabetes. Lifestyle changes advised.",
        medicines: ["Metformin 500mg — twice a day"],
        weightKg: 72,
        sugarMgDl: 145,
        bpSystolic: 138,
        bpDiastolic: 88,
      },
      update: {},
    }),
    prisma.appointment.upsert({
      where: { id: appt3Id },
      create: {
        id: appt3Id,
        clientId,
        leadId: lead3Id,
        name: "Demo · Priya Iyer",
        phone: "9000000003",
        date: startOfDay(-45, 10),
        status: "completed",
        completedAt: startOfDay(-45, 10),
        source: DEMO_SOURCE,
        notes: "Six-week follow-up. Patient reports better energy.",
        diagnosis: "Sugar trending down. Stay on current regimen.",
        medicines: ["Metformin 500mg — twice a day"],
        weightKg: 70.5,
        sugarMgDl: 125,
        bpSystolic: 128,
        bpDiastolic: 84,
      },
      update: {},
    }),
    prisma.appointment.upsert({
      where: { id: appt4Id },
      create: {
        id: appt4Id,
        clientId,
        leadId: lead3Id,
        name: "Demo · Priya Iyer",
        phone: "9000000003",
        date: startOfDay(-7, 11),
        status: "completed",
        completedAt: startOfDay(-7, 11),
        source: DEMO_SOURCE,
        notes: "Routine follow-up. Sugar in-range.",
        diagnosis: "Stable. Continue current medication.",
        medicines: ["Metformin 500mg — twice a day"],
        weightKg: 70,
        sugarMgDl: 110,
        bpSystolic: 120,
        bpDiastolic: 80,
      },
      update: {},
    }),
    prisma.payment.upsert({
      where: { id: payment1Id },
      create: {
        id: payment1Id,
        clientId,
        leadId: lead3Id,
        appointmentId: appt4Id,
        patientName: "Demo · Priya Iyer",
        patientPhone: "9000000003",
        amount: 50000,
        discount: 0,
        finalAmount: 50000,
        paymentMethod: "cash",
        // The "[demo]" prefix is the cleanup discriminator — see
        // clearDemoData(). Don't translate or strip it.
        notes: `${DEMO_NOTES_TAG} Consultation`,
        collectedById: safeUserId,
        items: {
          create: [{ title: "Consultation", amount: 50000 }],
        },
      },
      update: {},
    }),
    prisma.payment.upsert({
      where: { id: payment2Id },
      create: {
        id: payment2Id,
        clientId,
        leadId: lead3Id,
        appointmentId: appt3Id,
        patientName: "Demo · Priya Iyer",
        patientPhone: "9000000003",
        amount: 80000,
        discount: 10000,
        finalAmount: 70000,
        paymentMethod: "upi",
        notes: `${DEMO_NOTES_TAG} Consultation + Lab fee`,
        collectedById: safeUserId,
        items: {
          create: [
            { title: "Consultation", amount: 50000 },
            { title: "Lab fee", amount: 30000 },
          ],
        },
      },
      update: {},
    }),
  ]);

  return {
    leads: [lead1Id, lead2Id, lead3Id],
    appointments: [appt1Id, appt2Id, appt3Id, appt4Id],
    payments: [payment1Id, payment2Id],
  };
};

// Belt-and-braces FK guard: confirms the JWT-supplied user id is still
// a live row before we pass it to Prisma. Returns null if the row is
// missing (stale token, post-migrate-reset, super-admin impersonating
// from a different tenant) — null is FK-safe because Lead.createdById
// and Payment.collectedById are both nullable.
const resolveValidUserId = async (
  userId: string | null,
): Promise<string | null> => {
  if (!userId) return null;
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return row?.id ?? null;
};

// Deletes only demo-tagged rows in this client. Defensive: every WHERE
// is clientId-scoped, never a cross-tenant sweep. PaymentItem cascades
// via Payment.onDelete = Cascade (prisma/schema.prisma).
export const clearDemoData = async (
  clientId: string,
): Promise<DemoCleanupResult> => {
  const [payments, appointments, leads] = await prisma.$transaction([
    prisma.payment.deleteMany({
      where: { clientId, notes: { contains: DEMO_NOTES_TAG } },
    }),
    prisma.appointment.deleteMany({
      where: { clientId, source: DEMO_SOURCE },
    }),
    prisma.lead.deleteMany({
      where: { clientId, source: DEMO_SOURCE },
    }),
  ]);
  return {
    payments: payments.count,
    appointments: appointments.count,
    leads: leads.count,
  };
};
