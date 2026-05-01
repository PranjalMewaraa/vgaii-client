import { Schema, model, models } from "mongoose";

const BusinessHourSchema = new Schema(
  {
    day: String,
    open: String,
    close: String,
  },
  { _id: false },
);

const ServiceSchema = new Schema(
  {
    title: String,
    description: String,
  },
  { _id: false },
);

const ProfileSchema = new Schema(
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
    aboutBio: String,
    achievements: [String],

    servicesTitle: String,
    servicesSubtitle: String,
    services: [ServiceSchema],

    address: String,
    phone: String,
    hours: String,
  },
  { _id: false },
);

const GoogleBusinessInfoSchema = new Schema(
  {
    name: String,
    address: String,
    phone: String,
    website: String,
    category: String,
    rating: Number,
    totalReviews: Number,
    hours: [BusinessHourSchema],
    mainPhoto: String,
    mapsUrl: String,
    syncedAt: Date,
  },
  { _id: false },
);

const ClientSchema = new Schema(
  {
    name: { type: String, required: true },

    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "trial"],
      default: "trial",
    },

    renewalDate: Date,
    googlePlaceId: String,
    calendlySchedulingUrl: String,
    googleBusinessInfo: GoogleBusinessInfoSchema,
    profile: ProfileSchema,
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

export default models.Client || model("Client", ClientSchema);
