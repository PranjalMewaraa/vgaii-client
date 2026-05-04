import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { canonicalPhone } from "../src/lib/phone";
import {
  password,
  clients as seedClients,
  users as seedUsers,
  leads as seedLeads,
  appointments as seedAppointments,
  feedback as seedFeedback,
} from "./seed-data";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env first.");
}

// Parse URL into a config object so we can bump connectTimeout above the
// mariadb driver's 1 s default — Railway's proxy occasionally takes 1–3 s
// on first connect.
const parsed = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "") || undefined,
    connectionLimit: 10,
    connectTimeout: 15_000,
  }),
});

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Clients — upsert by `id` (which we control via seed_*).
  for (const c of seedClients) {
    await prisma.client.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        subscriptionStatus: c.subscriptionStatus,
        renewalDate: c.renewalDate,
        googlePlaceId: c.googlePlaceId,
        plan: c.plan,
        webhookKey: c.webhookKey,
      },
      update: {
        name: c.name,
        subscriptionStatus: c.subscriptionStatus,
        renewalDate: c.renewalDate,
        googlePlaceId: c.googlePlaceId,
        plan: c.plan,
        webhookKey: c.webhookKey,
      },
    });
  }

  // 2. Users — upsert by `id`. Password is re-hashed each run.
  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        password: passwordHash,
        role: u.role,
        clientId: u.clientId,
        assignedModules: u.assignedModules,
      },
      update: {
        name: u.name,
        email: u.email,
        password: passwordHash,
        role: u.role,
        clientId: u.clientId,
        assignedModules: u.assignedModules,
      },
    });
  }

  // 3. Leads — phoneNormalized derived here so we don't rely on a hook.
  for (const l of seedLeads) {
    const phoneNormalized = canonicalPhone(l.phone);
    await prisma.lead.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        clientId: l.clientId,
        createdById: l.createdById,
        name: l.name,
        phone: l.phone,
        phoneNormalized,
        area: l.area,
        source: l.source,
        status: l.status,
        statusUpdatedAt: l.statusUpdatedAt,
        outcomeRating: "outcomeRating" in l ? l.outcomeRating : null,
        feedbackToken: l.feedbackToken,
        feedbackTokenUsed:
          "feedbackTokenUsed" in l ? l.feedbackTokenUsed : false,
        notes: l.notes,
      },
      update: {
        clientId: l.clientId,
        createdById: l.createdById,
        name: l.name,
        phone: l.phone,
        phoneNormalized,
        area: l.area,
        source: l.source,
        status: l.status,
        statusUpdatedAt: l.statusUpdatedAt,
        outcomeRating: "outcomeRating" in l ? l.outcomeRating : null,
        feedbackToken: l.feedbackToken,
        feedbackTokenUsed:
          "feedbackTokenUsed" in l ? l.feedbackTokenUsed : false,
        notes: l.notes,
      },
    });
  }

  // 4. Appointments.
  for (const a of seedAppointments) {
    await prisma.appointment.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        clientId: a.clientId,
        leadId: a.leadId,
        name: a.name,
        phone: a.phone,
        email: a.email,
        gender: a.gender,
        age: a.age,
        date: a.date,
        status: a.status,
        notes: a.notes,
        diagnosis: a.diagnosis,
        medicines: a.medicines,
        source: a.source,
      },
      update: {
        clientId: a.clientId,
        leadId: a.leadId,
        name: a.name,
        phone: a.phone,
        email: a.email,
        gender: a.gender,
        age: a.age,
        date: a.date,
        status: a.status,
        notes: a.notes,
        diagnosis: a.diagnosis,
        medicines: a.medicines,
        source: a.source,
      },
    });
  }

  // 5. Feedback.
  for (const f of seedFeedback) {
    await prisma.feedback.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        clientId: f.clientId,
        leadId: f.leadId,
        clientName: f.clientName,
        clientPhone: f.clientPhone,
        reviewText: f.reviewText,
        remark: "remark" in f ? f.remark : null,
        rating: f.rating,
        submittedAt: f.submittedAt,
        status: f.status,
      },
      update: {
        clientId: f.clientId,
        leadId: f.leadId,
        clientName: f.clientName,
        clientPhone: f.clientPhone,
        reviewText: f.reviewText,
        remark: "remark" in f ? f.remark : null,
        rating: f.rating,
        submittedAt: f.submittedAt,
        status: f.status,
      },
    });
  }

  console.log("Seed data ready.");
  console.table(
    seedUsers.map(u => ({
      role: u.role,
      email: u.email,
      password,
      clientId: u.clientId ?? "-",
      modules: u.assignedModules.join(", ") || "-",
    })),
  );
  console.log("Webhook keys (used for Cal.com booking + lead webhooks):");
  for (const c of seedClients) {
    console.log(`${c.name}: ${c.webhookKey}`);
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
