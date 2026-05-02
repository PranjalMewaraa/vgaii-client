/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const seed = require("./seed-data");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const objectId = (id) => new mongoose.Types.ObjectId(id);

const toObjectIds = (doc, keys) => {
  const next = { ...doc, _id: objectId(doc._id) };

  for (const key of keys) {
    if (next[key]) {
      next[key] = objectId(next[key]);
    }
  }

  return next;
};

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "trial"],
      default: "trial",
    },
    renewalDate: Date,
    googlePlaceId: String,
    bookingUrl: String,
    profileSlug: { type: String, unique: true, sparse: true, lowercase: true },
    customDomain: { type: String, unique: true, sparse: true, lowercase: true },
    reviewsTaskId: String,
    profile: new mongoose.Schema(
      {
        enabled: { type: Boolean, default: false },
        doctorName: String,
        specialty: String,
        credentials: String,
        heroTitleLine1: String,
        heroTitleLine2: String,
        heroTagline: String,
        heroImageUrl: String,
        aboutImageUrl: String,
        faviconUrl: String,
        aboutBio: String,
        achievements: [String],
        servicesTitle: String,
        servicesSubtitle: String,
        services: [
          new mongoose.Schema(
            { title: String, description: String },
            { _id: false },
          ),
        ],
        address: String,
        phone: String,
        hours: String,
      },
      { _id: false },
    ),
    plan: {
      type: String,
      default: "basic",
    },
    webhookKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "CLIENT_ADMIN", "STAFF"],
      default: "STAFF",
    },
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    assignedModules: {
      type: [String],
      default: [],
    },
    lastLoginIP: String,
  },
  { timestamps: true },
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    phoneNormalized: { type: String, index: true },
    email: String,
    age: Number,
    gender: String,
    area: String,
    source: String,
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "qualified",
        "appointment_booked",
        "visited",
        "lost",
      ],
      default: "new",
    },
    statusUpdatedAt: Date,
    outcomeRating: Number,
    feedbackToken: { type: String, unique: true, sparse: true },
    feedbackTokenUsed: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const appointmentSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    email: String,
    gender: String,
    age: Number,
    date: Date,
    status: {
      type: String,
      enum: ["scheduled", "completed", "no_show", "cancelled"],
      default: "scheduled",
    },
    completedAt: Date,
    notes: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    medicines: { type: [String], default: [] },
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    leadId: {
      type: mongoose.Types.ObjectId,
      ref: "Lead",
    },
    source: {
      type: String,
      default: "cal.com",
    },
  },
  { timestamps: true },
);

const feedbackSchema = new mongoose.Schema(
  {
    clientName: String,
    clientPhone: String,
    reviewText: String,
    remark: String,
    rating: Number,
    leadId: {
      type: mongoose.Types.ObjectId,
      ref: "Lead",
    },
    submittedAt: Date,
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      index: true,
    },
  },
  { timestamps: true },
);

const models = {
  Client: mongoose.models.Client || mongoose.model("Client", clientSchema),
  User: mongoose.models.User || mongoose.model("User", userSchema),
  Lead: mongoose.models.Lead || mongoose.model("Lead", leadSchema),
  Appointment:
    mongoose.models.Appointment ||
    mongoose.model("Appointment", appointmentSchema),
  Feedback:
    mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema),
};

async function upsertMany(Model, docs, objectIdKeys = []) {
  for (const doc of docs) {
    const prepared = toObjectIds(doc, objectIdKeys);
    await Model.replaceOne({ _id: prepared._id }, prepared, { upsert: true });
  }
}

async function resetSeedDocs() {
  await Promise.all([
    models.Feedback.deleteMany({
      _id: { $in: Object.values(seed.ids.feedback).map(objectId) },
    }),
    models.Appointment.deleteMany({
      _id: { $in: Object.values(seed.ids.appointments).map(objectId) },
    }),
    models.Lead.deleteMany({
      _id: { $in: Object.values(seed.ids.leads).map(objectId) },
    }),
    models.User.deleteMany({
      _id: { $in: Object.values(seed.ids.users).map(objectId) },
    }),
    models.Client.deleteMany({
      _id: { $in: Object.values(seed.ids.clients).map(objectId) },
    }),
  ]);
}

async function main() {
  loadEnv();

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI. Add it to .env or export it first.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  if (process.argv.includes("--reset")) {
    await resetSeedDocs();
  }

  const passwordHash = await bcrypt.hash(seed.password, 10);
  const users = seed.users.map((user) => ({
    ...user,
    password: passwordHash,
  }));

  // Auto-compute phoneNormalized for each seeded lead so the cross-source
  // matching (Cal.com webhook, status webhook, CSV import) works without
  // needing to set it by hand in seed-data.js.
  const canonicalPhone = (input) =>
    typeof input === "string" ? input.replace(/[^\d]/g, "").slice(-10) : "";
  const leads = seed.leads.map((lead) => ({
    ...lead,
    phoneNormalized: canonicalPhone(lead.phone),
  }));

  await upsertMany(models.Client, seed.clients);
  await upsertMany(models.User, users, ["clientId"]);
  await upsertMany(models.Lead, leads, ["clientId", "createdBy"]);
  await upsertMany(models.Appointment, seed.appointments, [
    "clientId",
    "leadId",
  ]);
  await upsertMany(models.Feedback, seed.feedback, ["clientId", "leadId"]);

  console.log("Seed data ready.");
  console.table(
    seed.users.map((user) => ({
      role: user.role,
      email: user.email,
      password: seed.password,
      clientId: user.clientId || "-",
      modules: user.assignedModules.join(", ") || "-",
    })),
  );
  console.log("Webhook keys (used for Cal.com booking + lead webhooks):");
  for (const client of seed.clients) {
    console.log(`${client.name}: ${client.webhookKey}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
